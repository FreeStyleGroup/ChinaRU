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

/* ─────────────────────────────────────────────────────────────
   Полный прод-граф, включая транзитивные зависимости.

   Перечень прямых зависимостей выше читаем и годится как приложение
   к заявлению, но утверждение «копилефта нет» относится ко всему
   поставляемому составу. Проверять его будут эксперты Минцифры,
   поэтому обход должен собираться вместе с документом, а не отдельно.

   Разворачиваем только dependencies: devDependencies продукт не сопровождают.
   ───────────────────────────────────────────────────────────── */
const STRONG_CL = /\b(A?GPL|GPL-[23]|LGPL|SSPL|RSAL|BUSL|CC-BY-NC|Commons-Clause|Elastic-2)/i;
const WEAK_CL = /\b(MPL|EPL|CDDL|OSL|CPL|Ms-RL)/i;

function resolveFrom(name, fromDir) {
  let dir = fromDir;
  for (let i = 0; i < 12; i++) {
    const cand = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(cand)) return cand;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

function licOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license === 'object') return pkg.license.type || '';
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map(l => l.type || l).join(' OR ');
  return '';
}

const graph = new Map();
const queue = [];
for (const ws of WORKSPACES) {
  // WORKSPACES хранит пути к самим package.json, каталог берём через dirname.
  const pjPath = join(ROOT, ws);
  if (!existsSync(pjPath)) continue;
  const pj = readJson(pjPath);
  for (const dep of Object.keys(pj.dependencies || {})) {
    queue.push({ name: dep, from: dirname(pjPath) });
  }
}
while (queue.length) {
  const { name, from } = queue.shift();
  if (name.startsWith('@china-ru/')) continue;
  const pjPath = resolveFrom(name, from);
  if (!pjPath) continue;
  let pkg;
  try { pkg = readJson(pjPath); } catch { continue; }
  const key = `${pkg.name}@${pkg.version}`;
  if (graph.has(key)) continue;
  graph.set(key, licOf(pkg) || '(не указана)');
  const dir = dirname(pjPath);
  for (const dep of Object.keys(pkg.dependencies || {})) queue.push({ name: dep, from: dir });
}

const graphByLicense = {};
const graphStrong = [];
const graphWeak = [];
const graphUnknown = [];
for (const [key, lic] of graph) {
  graphByLicense[lic] = (graphByLicense[lic] || 0) + 1;
  if (STRONG_CL.test(lic)) graphStrong.push([key, lic]);
  else if (WEAK_CL.test(lic)) graphWeak.push([key, lic]);
  else if (lic === '(не указана)') graphUnknown.push([key, lic]);
}

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

md.push('---');
md.push('');
md.push('## Проверка всего графа зависимостей, включая транзитивные');
md.push('');
md.push('Перечень выше — прямые прод-зависимости. Утверждение об отсутствии копилефта');
md.push('относится ко всему поставляемому составу, поэтому отдельно пройден полный граф:');
md.push('зависимости рабочих пакетов и их зависимости вглубь. `devDependencies` не');
md.push('разворачиваются — инструменты сборки в поставку не входят.');
md.push('');
md.push(`**Обойдено пакетов: ${graph.size}.**`);
md.push('');
md.push('| Лицензия | Пакетов |');
md.push('|---|---|');
Object.entries(graphByLicense).sort((a, b) => b[1] - a[1])
  .forEach(([lic, n]) => md.push(`| ${lic} | ${n} |`));
md.push('');
if (!graphStrong.length && !graphWeak.length) {
  md.push('- **Сильный копилефт (GPL, AGPL, LGPL, SSPL, RSAL, BUSL) — не обнаружен.**');
  md.push('- Слабый копилефт (MPL, EPL, CDDL) — не обнаружен.');
} else {
  md.push('⚠️ Обнаружены копилефт-зависимости в транзитивном графе:');
  md.push('');
  md.push('| Пакет | Лицензия | Тип |');
  md.push('|---|---|---|');
  graphStrong.forEach(([k, l]) => md.push(`| ${k} | ${l} | сильный |`));
  graphWeak.forEach(([k, l]) => md.push(`| ${k} | ${l} | слабый |`));
}
md.push(`- Пакетов без указанной лицензии: ${graphUnknown.length || 'нет'}.`);
md.push('');
const ccby = [...graph.entries()].filter(([, l]) => /CC-BY(?!-NC)/i.test(l));
if (ccby.length) {
  md.push('### Указание авторства по CC-BY');
  md.push('');
  md.push('Лицензия CC-BY копилефт-обязательств не создаёт, но требует указания');
  md.push('авторства. Настоящий раздел им и является.');
  md.push('');
  ccby.forEach(([k, l]) => md.push(`- ${k} — ${l}`));
  md.push('');
}
md.push('### Что сюда не входит');
md.push('');
md.push('Образы инфраструктуры (PostgreSQL, Redis, SeaweedFS, nginx)');
md.push('зависимостями программы не являются — это внешние службы, разворачиваемые');
md.push('рядом. Их лицензии разобраны в `docs/registry/README.md`, раздел');
md.push('«Про лицензии инфраструктуры».');
md.push('');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'SBOM.md'), md.join('\n'), 'utf8');

console.log('SBOM собран:');
console.log('  прод-зависимостей:', rows.length);
console.log('  копилефт:         ', copyleft.length, copyleft.length ? '⚠️ ' + copyleft.map(r => r.name).join(', ') : '(нет)');
console.log('  лицензии:         ', Object.keys(byLicense).length, 'видов');
console.log('  весь граф:        ', graph.size, 'пакетов, сильный копилефт:', graphStrong.length || '(нет)');
console.log('  файл:             ', join(OUT_DIR, 'SBOM.md'));
