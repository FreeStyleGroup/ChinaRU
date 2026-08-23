/**
 * Сборка публичных страниц документации для реестра ПО.
 *
 * Читает Markdown из docs/registry/ и раскладывает готовые страницы Битрикса
 * в out/site/reestr-po/ — их остаётся залить на china-ru.ru как есть.
 *
 * Зачем генератор, а не свёрстанные руками страницы: документы обязаны быть
 * в открытом доступе И совпадать с тем, что подано в реестр. Две копии одного
 * текста разъезжаются на первой же правке, и разъехавшуюся заметим не мы,
 * а проверяющий. Поэтому источник правды один — .md рядом с этим файлом,
 * а страницы пересобираются.
 *
 * Запуск: node docs/registry/build-site-pages.mjs
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'site', 'reestr-po');

const DOCS = [
  {
    file: '01-funkcionalnye-harakteristiki.md',
    slug: 'funkcionalnye-harakteristiki',
    nav: 'Функциональные характеристики',
    title: 'Описание функциональных характеристик — China.ru',
    desc: 'Назначение, архитектура, функциональные возможности и требования к оборудованию программного обеспечения «China.ru — маркетплейс промышленного оборудования из Китая».',
  },
  {
    file: '02-ustanovka-i-ekspluataciya.md',
    slug: 'ustanovka-i-ekspluataciya',
    nav: 'Установка и эксплуатация',
    title: 'Установка и эксплуатация — China.ru',
    desc: 'Порядок установки, настройки, проверки работоспособности и эксплуатации программного обеспечения «China.ru», включая регламентные работы и устранение типовых неисправностей.',
  },
  {
    file: '03-zhiznennyy-cikl-i-podderzhka.md',
    slug: 'zhiznennyy-cikl-i-podderzhka',
    nav: 'Жизненный цикл и поддержка',
    title: 'Жизненный цикл и техническая поддержка — China.ru',
    desc: 'Процессы разработки и выпуска версий, порядок обращения в техническую поддержку, сроки устранения неисправностей и требования к персоналу.',
  },
  {
    file: '04-stoimost.md',
    slug: 'stoimost',
    nav: 'Стоимость',
    title: 'Стоимость программного обеспечения — China.ru',
    desc: 'Программное обеспечение «China.ru» предоставляется безвозмездно. Порядок предоставления, источник финансирования и перечень возмездных услуг.',
  },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Разметка внутри строки.
 *
 * Код вынимается ПЕРВЫМ и подменяется меткой: иначе звёздочки и скобки
 * внутри команды оболочки были бы разобраны как жирный шрифт и ссылка.
 */
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `@@C${codes.length - 1}@@`;
  });

  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  /* Ссылки на соседние .md на сайте никуда не ведут — оставляем текстом. */
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) =>
    href.startsWith('http') || href.startsWith('/') ? `<a href="${esc(href)}">${t}</a>` : t,
  );
  s = s.replace(/@@C(\d+)@@/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
  return s;
}

const cells = (row) =>
  row
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

/** Markdown → HTML. Поддержан ровно тот набор, что использован в документах. */
function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
    buf.length = 0;
  };

  const para = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flushParagraph(para);
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      flushParagraph(para);
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushParagraph(para);
      /* H1 документа становится H2: единственный H1 на странице ставит
         сам Битрикс из SetTitle, и второй сломал бы структуру заголовков. */
      const level = Math.min(h[1].length + 1, 4);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph(para);
      out.push('<hr>');
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? '')) {
      flushParagraph(para);
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) body.push(cells(lines[i++]));

      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const tr = body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(
        `<div class="regdoc__scroll"><table class="regdoc__table">` +
          `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph(para);
      const tag = bullet ? 'ul' : 'ol';
      const re = bullet ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
      const items = [];
      while (i < lines.length) {
        const m = re.exec(lines[i]);
        if (m) {
          items.push(m[1]);
          i++;
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          /* Продолжение пункта с отступом — приклеиваем к последнему. */
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
        } else break;
      }
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flushParagraph(para);
  return out.join('\n');
}

const phpEsc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function page({ title, desc, body, nav, slug }) {
  const menu = DOCS.map(
    (d) =>
      `      <li>${
        d.slug === slug
          ? `<span class="regdoc__nav-cur">${d.nav}</span>`
          : `<a href="/reestr-po/${d.slug}/">${d.nav}</a>`
      }</li>`,
  ).join('\n');

  return `<?php
/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: ChinaRU/docs/registry/${nav ? '' : ''}*.md
 * Пересборка: node docs/registry/build-site-pages.mjs
 *
 * Страница документации, на которую ссылается карточка в едином реестре
 * российского ПО. Адрес менять нельзя: он подан в заявлении.
 */
require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/header.php');

$APPLICATION->SetTitle('${phpEsc(title)}');
$APPLICATION->SetPageProperty('description', '${phpEsc(desc)}');
$APPLICATION->SetAdditionalCSS('/reestr-po/regdoc.css');
?>
<div class="regdoc">
  <div class="container">
    <nav class="regdoc__nav" aria-label="Документация для реестра ПО">
      <ul>
        <li><a href="/reestr-po/">Все документы</a></li>
${menu}
      </ul>
    </nav>

    <article class="regdoc__body">
${body}
    </article>
  </div>
</div>
<?php require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/footer.php'); ?>
`;
}

/* ── Сборка ── */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const doc of DOCS) {
  const md = readFileSync(join(HERE, doc.file), 'utf8');
  const dir = join(OUT, doc.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.php'), page({ ...doc, body: render(md) }), 'utf8');
  console.log(`  /reestr-po/${doc.slug}/`);
}

const indexBody = [
  '<h2>Документация к программному обеспечению</h2>',
  '<p>«China.ru — маркетплейс промышленного оборудования из Китая». Правообладатель — ООО «Чайна.Ру», ОГРН 1257800030025, ИНН 7801741236.</p>',
  '<p>Документы опубликованы в соответствии с требованиями Постановления Правительства Российской Федерации от 16.11.2015 № 1236 и доступны для свободного ознакомления и скачивания без регистрации.</p>',
  '<ul>',
  ...DOCS.map((d) => `<li><a href="/reestr-po/${d.slug}/">${d.nav}</a></li>`),
  '</ul>',
  '<p>Техническая поддержка: <a href="mailto:admin@china-ru.ru">admin@china-ru.ru</a></p>',
].join('\n');

writeFileSync(
  join(OUT, 'index.php'),
  page({
    slug: '',
    nav: '',
    title: 'Документация для реестра российского ПО — China.ru',
    desc: 'Документация к программному обеспечению «China.ru»: функциональные характеристики, установка и эксплуатация, жизненный цикл и поддержка, стоимость.',
    body: indexBody,
  }),
  'utf8',
);

writeFileSync(join(OUT, '.htaccess'), 'Options -Indexes\n', 'utf8');

/* Стили кладём рядом со страницами: раздел самодостаточен и переносится
   одной папкой, без правок в общем шаблоне сайта. */
writeFileSync(join(OUT, 'regdoc.css'), readFileSync(join(HERE, 'regdoc.css'), 'utf8'), 'utf8');

console.log('  /reestr-po/');
console.log(`\nГотово: ${OUT}`);
