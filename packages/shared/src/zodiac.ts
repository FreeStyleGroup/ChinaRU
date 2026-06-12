/**
 * Китайский знак зодиака по дате рождения. Используется разделом «Гороскоп»
 * в личном кабинете (china.ru). Год берётся григорианский — уточнение по
 * границе китайского нового года остаётся на доработку логики.
 */
export interface ChineseZodiacSign {
  key: string;
  ru: string;
  emoji: string;
  /** Стихия по последней цифре года (упрощённо). */
  element: string;
  traits: string;
}

const SIGNS: readonly Omit<ChineseZodiacSign, 'element'>[] = [
  { key: 'rat', ru: 'Крыса', emoji: '🐀', traits: 'Сообразительность, находчивость, обаяние.' },
  { key: 'ox', ru: 'Бык', emoji: '🐂', traits: 'Надёжность, упорство, основательность.' },
  { key: 'tiger', ru: 'Тигр', emoji: '🐅', traits: 'Смелость, энергия, лидерство.' },
  { key: 'rabbit', ru: 'Кролик', emoji: '🐇', traits: 'Доброта, дипломатичность, изящество.' },
  { key: 'dragon', ru: 'Дракон', emoji: '🐉', traits: 'Сила, удача, харизма.' },
  { key: 'snake', ru: 'Змея', emoji: '🐍', traits: 'Мудрость, интуиция, грация.' },
  { key: 'horse', ru: 'Лошадь', emoji: '🐎', traits: 'Свобода, активность, оптимизм.' },
  { key: 'goat', ru: 'Коза', emoji: '🐐', traits: 'Творчество, мягкость, эмпатия.' },
  { key: 'monkey', ru: 'Обезьяна', emoji: '🐒', traits: 'Изобретательность, юмор, любознательность.' },
  { key: 'rooster', ru: 'Петух', emoji: '🐓', traits: 'Честность, пунктуальность, уверенность.' },
  { key: 'dog', ru: 'Собака', emoji: '🐕', traits: 'Верность, справедливость, забота.' },
  { key: 'pig', ru: 'Свинья', emoji: '🐖', traits: 'Щедрость, добродушие, трудолюбие.' },
];

const ELEMENTS: readonly string[] = [
  'Металл',
  'Металл',
  'Вода',
  'Вода',
  'Дерево',
  'Дерево',
  'Огонь',
  'Огонь',
  'Земля',
  'Земля',
];

/** Возвращает знак по дате 'YYYY-MM-DD' либо null, если дата не задана/некорректна. */
export function chineseZodiac(birthday: string | null | undefined): ChineseZodiacSign | null {
  if (!birthday) return null;
  const year = Number.parseInt(birthday.slice(0, 4), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2200) return null;
  const sign = SIGNS[(((year - 4) % 12) + 12) % 12];
  if (!sign) return null;
  const element = ELEMENTS[((year % 10) + 10) % 10] ?? 'Дерево';
  return { ...sign, element };
}
