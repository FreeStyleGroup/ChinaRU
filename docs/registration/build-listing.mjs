/**
 * Сборка листинга исходного кода для депонирования программы для ЭВМ (Роспатент/ФИПС).
 *
 * Формирует единый печатный HTML (титульный лист + распечатка исходников с нумерацией
 * строк), пригодный для «Сохранить как PDF» из браузера. Состав определяется git-индексом
 * (только версионируемые файлы), из него исключены зависимости, сборки, секреты и бинарники.
 *
 * Запуск:  node docs/registration/build-listing.mjs
 * Результат:  docs/registration/out/listing.html  (+ печать в PDF из браузера)
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT_DIR = join(HERE, 'out');

// ── Метаданные правообладателя (совпадают с заявлением и договором отчуждения) ──
const META = {
  program: 'China.ru — маркетплейс промышленного оборудования из Китая',
  holder:
    'ООО «Чайна.Ру», ОГРН 1257800030025, ИНН 7801741236, КПП 780101001, ' +
    '199178, г. Санкт-Петербург, 17-я линия В.О., д. 52 к. 2 литера А, помещ. 23-н офис 8',
  author: 'Бабаев Игорь Владимирович (единственный автор)',
  year: '2026',
  revision: 'deposit/evm-v1.0.0',
  abstract:
    '«China.ru — маркетплейс промышленного оборудования из Китая» — веб-платформа B2B-торговли ' +
    'промышленным оборудованием и комплектующими из КНР. Реализованы: каталог с категориями, ' +
    'фильтрами, поиском и серверным SEO-рендерингом; карточки товаров с отзывами; корзина и ' +
    'оформление заказов со списанием остатков в транзакции; личные кабинеты покупателя (заказы, ' +
    'избранное, гараж, партнёрская программа), продавца (управление товарами с фотографиями, ' +
    'статусы отгрузки заказов, вакансии) и администратора (модерация контента, верификация ' +
    'продавцов, аналитика) с разграничением прав по ролям; регистрация и авторизация пользователей, ' +
    'REST API. Тип ЭВМ: сервер/ПК. ОС: Linux (кроссплатформенно). Языки: TypeScript (Node.js, React), ' +
    'SQL. СУБД: PostgreSQL. Объём исходного кода: 1 123 833 байта (~1097 КБ).',
};

// ── Порядок разделов листинга (по приоритету префикса пути) ──
const ORDER = [
  'package.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'turbo.json',
  'eslint.config.mjs',
  'docker-compose.prod.yml',
  'docker-compose.yml',
  '.dockerignore',
  '.env.prod.example',
  'packages/shared/',
  'packages/db/',
  'packages/ui/',
  'apps/api/',
  'apps/web/',
  'apps/admin/',
  'infra/',
];

const INCLUDE_EXT = /\.(ts|tsx|js|mjs|cjs|json|sql|css|conf|sh|yml|yaml)$/;
const INCLUDE_NAMED = /(^|\/)(Dockerfile|\.dockerignore|\.env\.prod\.example)$/;
const EXCLUDE = [
  /node_modules\//,
  /\/dist\//,
  /\.next\//,
  /(^|\/)package-lock\.json$/,
  /drizzle\/meta\/.*\.json$/, // авто-снапшоты Drizzle (машинные, не исходный код)
  /\.(png|jpe?g|svg|ico|webp|gif|woff2?|ttf|map)$/,
  /\.test\.(ts|tsx)$/, // тесты — вспомогательные, в депонируемый листинг не включаем
  /^docs\//, // документация и оснастка подачи (генераторы) — не код программы
];

function tracked() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function included(path) {
  if (EXCLUDE.some(re => re.test(path))) return false;
  return INCLUDE_EXT.test(path) || INCLUDE_NAMED.test(path);
}

function rank(path) {
  const i = ORDER.findIndex(p => (p.endsWith('/') ? path.startsWith(p) : path === p));
  return i === -1 ? ORDER.length : i;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const files = tracked()
  .filter(included)
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

let totalLines = 0;
let totalBytes = 0;
const sections = [];

for (const rel of files) {
  const abs = join(ROOT, rel);
  const body = readFileSync(abs, 'utf8');
  const bytes = statSync(abs).size;
  const lines = body.split('\n');
  if (lines.at(-1) === '') lines.pop();
  totalLines += lines.length;
  totalBytes += bytes;

  const numbered = lines
    .map((ln, i) => `<span class="ln">${String(i + 1).padStart(4, ' ')}</span>${esc(ln)}`)
    .join('\n');
  sections.push(
    `<section class="file"><h2>${esc(rel)}</h2><pre>${numbered || '(пустой файл)'}</pre></section>`
  );
}

const kb = (totalBytes / 1024).toFixed(0);
const estPages = Math.ceil((totalLines + files.length * 3) / 55) + 1;

const title = `
<section class="cover">
  <div class="cover-top">Приложение к заявлению о государственной регистрации<br>программы для ЭВМ</div>
  <h1>ЛИСТИНГ ИСХОДНОГО КОДА ПРОГРАММЫ</h1>
  <div class="cover-name">«${esc(META.program)}»</div>
  <table class="cover-meta">
    <tr><td>Правообладатель</td><td>${esc(META.holder)}</td></tr>
    <tr><td>Автор</td><td>${esc(META.author)}</td></tr>
    <tr><td>Год создания</td><td>${esc(META.year)}</td></tr>
    <tr><td>Идентификатор ревизии</td><td>${esc(META.revision)}</td></tr>
    <tr><td>Языки программирования</td><td>TypeScript (Node.js, React), SQL, CSS</td></tr>
    <tr><td>СУБД</td><td>PostgreSQL</td></tr>
    <tr><td>Файлов в листинге</td><td>${files.length}</td></tr>
    <tr><td>Строк кода</td><td>${totalLines.toLocaleString('ru-RU')}</td></tr>
    <tr><td>Объём исходного кода</td><td>${totalBytes.toLocaleString('ru-RU')} байт (${kb} КБ)</td></tr>
  </table>
  <div class="cover-abstract">
    <div class="cover-abstract-h">РЕФЕРАТ</div>
    <p>${esc(META.abstract)}</p>
  </div>
  <div class="cover-foot">Санкт-Петербург, ${esc(META.year)}</div>
</section>`;

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<title>Листинг — ${esc(META.program)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Consolas','DejaVu Sans Mono','Courier New',monospace; color:#000; margin:0; }
  .cover { min-height: 262mm; display:flex; flex-direction:column; text-align:center;
    padding-top: 18mm; page-break-after: always; font-family: 'Times New Roman', serif; }
  .cover-top { font-size: 12pt; margin-bottom: 22mm; }
  .cover h1 { font-size: 20pt; letter-spacing:.5px; margin:0 0 8mm; }
  .cover-name { font-size: 16pt; font-weight:bold; margin-bottom: 14mm; }
  .cover-meta { margin: 0 auto; border-collapse: collapse; font-size: 11pt; max-width: 165mm; }
  .cover-meta td { border:1px solid #000; padding:2mm 3mm; text-align:left; vertical-align:top; }
  .cover-meta td:first-child { font-weight:bold; white-space:nowrap; width: 48mm; }
  .cover-abstract { max-width: 165mm; margin: 12mm auto 0; text-align: justify; }
  .cover-abstract-h { font-weight:bold; font-size: 12pt; text-align:center; margin-bottom: 3mm; }
  .cover-abstract p { font-size: 11pt; line-height: 1.4; margin: 0; }
  .cover-foot { margin-top: auto; padding-top: 16mm; font-size: 12pt; }
  .file { page-break-inside: auto; }
  .file h2 { font-size: 9.5pt; background:#000; color:#fff; padding:1.5mm 2mm; margin:6mm 0 0;
    page-break-after: avoid; font-family: 'Consolas', monospace; }
  pre { font-size: 8pt; line-height: 1.28; margin: 1mm 0 0; white-space: pre-wrap; word-break: break-word; }
  .ln { display:inline-block; width: 7mm; color:#888; text-align:right; margin-right:3mm;
    -webkit-user-select:none; user-select:none; }
  @media screen { body { background:#f4f4f4; } .cover, .file { background:#fff; max-width:210mm;
    margin:8px auto; padding:10mm; box-shadow:0 1px 6px rgba(0,0,0,.15); } .cover{padding:20mm;} }
</style></head>
<body>
${title}
${sections.join('\n')}
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'listing.html'), html, 'utf8');

console.log('Листинг собран:');
console.log('  файлов:      ', files.length);
console.log('  строк кода:  ', totalLines.toLocaleString('ru-RU'));
console.log('  объём:       ', totalBytes.toLocaleString('ru-RU'), 'байт (' + kb + ' КБ)');
console.log('  ~страниц A4: ', estPages, '(лимит ФИПС — 700)');
console.log('  файл:        ', join(OUT_DIR, 'listing.html'));
