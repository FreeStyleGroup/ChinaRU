/**
 * Проверка ВСЕГО графа production-зависимостей на копилефт-лицензии.
 *
 * Зачем отдельно от build-sbom.mjs: тот собирает перечень ПРЯМЫХ прод-зависимостей
 * (их два десятка) — это читаемое приложение к заявлению. Но утверждение
 * «копилефт-зависимостей нет» относится ко всему поставляемому составу, включая
 * транзитивные. Проверять его будут эксперты Минцифры, поэтому проверка должна
 * быть воспроизводимой, а не разовой.
 *
 * Запуск из корня монорепо:
 *   node docs/registration/scan-copyleft.mjs
 *
 * Код возврата 1, если найден сильный копилефт — чтобы можно было повесить в CI.
 *
 * Обходим только dependencies (не devDependencies): в поставку попадает
 * прод-граф, инструменты сборки продукт не сопровождают.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();

/** Сильный копилефт — то, что для реестра критично. */
const STRONG = /\b(A?GPL|GPL-[23]|LGPL|SSPL|RSAL|BUSL|CC-BY-NC|Commons-Clause|Elastic-2)/i;
/** Слабый (пофайловый) копилефт — обычно не мешает, но должен быть назван. */
const WEAK = /\b(MPL|EPL|CDDL|OSL|CPL|Ms-RL)/i;

const WORKSPACES = [
  'apps/api', 'apps/web', 'apps/admin',
  'packages/db', 'packages/shared', 'packages/ui',
];

/** Найти установленный пакет: рядом, затем вверх по node_modules (как это делает Node). */
function resolvePkg(name, fromDir) {
  let dir = fromDir;
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license === 'object') return pkg.license.type || '';
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type || l).join(' OR ');
  return '';
}

const seen = new Map();
const queue = [];

for (const ws of WORKSPACES) {
  const pjPath = join(ROOT, ws, 'package.json');
  if (!existsSync(pjPath)) continue;
  const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
  for (const dep of Object.keys(pj.dependencies || {})) {
    queue.push({ name: dep, from: join(ROOT, ws), chain: [pj.name || ws] });
  }
}

while (queue.length) {
  const { name, from, chain } = queue.shift();
  if (name.startsWith('@china-ru/')) continue;      // собственные пакеты монорепо

  const pjPath = resolvePkg(name, from);
  if (!pjPath) continue;

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pjPath, 'utf8'));
  } catch {
    continue;
  }

  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) continue;

  seen.set(key, {
    license: licenseOf(pkg) || '(не указана)',
    chain: chain.concat(pkg.name).join(' → '),
  });

  const dir = dirname(pjPath);
  for (const dep of Object.keys(pkg.dependencies || {})) {
    queue.push({ name: dep, from: dir, chain: chain.concat(pkg.name) });
  }
}

const strong = [];
const weak = [];
const unknown = [];
const byLicense = new Map();

for (const [key, info] of seen) {
  const lic = info.license;
  byLicense.set(lic, (byLicense.get(lic) || 0) + 1);
  if (STRONG.test(lic)) strong.push([key, info]);
  else if (WEAK.test(lic)) weak.push([key, info]);
  else if (lic === '(не указана)') unknown.push([key, info]);
}

console.log(`\nПакетов в прод-графе: ${seen.size}\n`);

console.log('Распределение по лицензиям:');
[...byLicense.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([lic, n]) => console.log(`  ${String(n).padStart(4)}  ${lic}`));

console.log('\nСильный копилефт (GPL/AGPL/LGPL/SSPL/RSAL/BUSL):');
if (!strong.length) console.log('  не обнаружено');
else strong.forEach(([k, i]) => console.log(`  ${k} — ${i.license}\n    через: ${i.chain}`));

console.log('\nСлабый копилефт (MPL/EPL/CDDL):');
if (!weak.length) console.log('  не обнаружено');
else weak.forEach(([k, i]) => console.log(`  ${k} — ${i.license}\n    через: ${i.chain}`));

console.log('\nБез указанной лицензии:');
if (!unknown.length) console.log('  нет');
else unknown.forEach(([k, i]) => console.log(`  ${k}\n    через: ${i.chain}`));

console.log('');
process.exit(strong.length ? 1 : 0);
