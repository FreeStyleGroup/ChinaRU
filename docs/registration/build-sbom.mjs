/**
 * Сборка SBOM (реестра зависимостей с лицензиями) для реестра отечественного ПО.
 *
 * Собирает production-зависимости всех workspace-пакетов, резолвит установленную версию
 * и лицензию из node_modules, дедуплицирует и помечает любые копилефт-лицензии
 * (GPL/AGPL/LGPL/SSPL/MPL) — их наличие критично для реестра ПО.
 *
 * Запуск:  node docs/registration/build-sbom.mjs
 * Результат:  docs/registration/out/SBOM.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT_DIR = join(HERE, 'out');
const NM = join(ROOT, 'node_modules');

// Пакеты монорепо: собираем именно PRODUCTION-зависимости (то, что попадает в поставку).
const WORKSPACES = [
  'package.json',
  'packages/shared/package.json',
  'packages/db/package.json',
  'packages/ui/package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/admin/package.json',
];

const COPYLEFT = /(^|[^A-Z])(A?GPL|LGPL|SSPL|MPL|EUPL|CDDL|OSL)/i;

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Резолвит установленную версию и лицензию пакета из node_modules (учёт scope). */
function resolveInstalled(name) {
  const pkgPath = join(NM, name, 'package.json');
  if (!existsSync(pkgPath)) return { version: '(не установлен)', license: '(неизвестно)' };
  const pkg = readJson(pkgPath);
  let license = pkg.license ?? '(не указана)';
  if (typeof license === 'object') license = license.type ?? JSON.stringify(license);
  if (!license && Array.isArray(pkg.licenses)) {
    license = pkg.licenses.map(l => l.type).join(' / ');
  }
  return { version: pkg.version ?? '?', license: String(license) };
}

// Собираем уникальные прод-зависимости и кто их объявляет.
const deps = new Map(); // name → { declaredBy:Set }
for (const ws of WORKSPACES) {
  const p = join(ROOT, ws);
  if (!existsSync(p)) continue;
  const pkg = readJson(p);
  const label = pkg.name ?? ws;
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    if (dep.startsWith('@china-ru/')) continue; // внутренние пакеты монорепо не считаем зависимостями
    if (!deps.has(dep)) deps.set(dep, { declaredBy: new Set() });
    deps.get(dep).declaredBy.add(label);
  }
}

const rows = [...deps.keys()].sort().map(name => {
  const { version, license } = resolveInstalled(name);
  return { name, version, license, copyleft: COPYLEFT.test(license), by: [...deps.get(name).declaredBy] };
});

const copyleft = rows.filter(r => r.copyleft);
const byLicense = {};
for (const r of rows) byLicense[r.license] = (byLicense[r.license] ?? 0) + 1;

const now = process.env.SBOM_DATE ?? ''; // дату проставит правообладатель при печати
const md = [];
md.push('# SBOM — реестр зависимостей программы');
md.push('## «China.ru — маркетплейс промышленного оборудования из Китая»');
md.push('');
md.push('Прямые production-зависимости (поставляемые в составе программы), с установленными');
md.push('версиями и лицензиями. Собрано из `package.json` всех пакетов монорепо + `node_modules`.');
md.push(`Ревизия: \`deposit/evm-v1.0.0\`.${now ? ` Дата сборки: ${now}.` : ''}`);
md.push('');
md.push(`**Всего прямых прод-зависимостей: ${rows.length}.**`);
md.push('');
md.push('### Распределение по лицензиям');
md.push('');
md.push('| Лицензия | Пакетов |');
md.push('|---|---|');
for (const [lic, n] of Object.entries(byLicense).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${lic} | ${n} |`);
}
md.push('');
md.push('### Копилефт-лицензии (критично для реестра ПО)');
md.push('');
if (copyleft.length === 0) {
  md.push('**Копилефт-зависимостей (GPL/AGPL/LGPL/SSPL/MPL и т. п.) НЕ обнаружено.**');
  md.push('Все прямые прод-зависимости — на разрешительных (permissive) свободных лицензиях');
  md.push('(MIT, Apache-2.0, BSD, ISC и совместимых), не налагающих copyleft-обязательств на');
  md.push('поставляемый продукт.');
} else {
  md.push('⚠️ Обнаружены копилефт-зависимости — проверить условия для поставки:');
  md.push('');
  md.push('| Пакет | Версия | Лицензия | Объявлен в |');
  md.push('|---|---|---|---|');
  for (const r of copyleft) md.push(`| ${r.name} | ${r.version} | ${r.license} | ${r.by.join(', ')} |`);
}
md.push('');
md.push('### Полный перечень прямых прод-зависимостей');
md.push('');
md.push('| № | Пакет | Версия | Лицензия | Объявлен в |');
md.push('|---|---|---|---|---|');
rows.forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.name} | ${r.version} | ${r.license} | ${r.by.join(', ')} |`);
});
md.push('');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'SBOM.md'), md.join('\n'), 'utf8');

console.log('SBOM собран:');
console.log('  прод-зависимостей:', rows.length);
console.log('  копилефт:         ', copyleft.length, copyleft.length ? '⚠️ ' + copyleft.map(r => r.name).join(', ') : '(нет)');
console.log('  лицензии:         ', Object.keys(byLicense).length, 'видов');
console.log('  файл:             ', join(OUT_DIR, 'SBOM.md'));
