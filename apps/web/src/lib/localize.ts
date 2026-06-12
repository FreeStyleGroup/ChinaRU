/** Сущность с переводимыми полями (товар, категория, направление). */
interface Localizable {
  nameRu: string;
  nameEn: string | null;
  nameZh: string | null;
}

/** Выбирает имя под локаль с откатом на русский. */
export function localizedName(item: Localizable, locale: string): string {
  if (locale === 'zh' && item.nameZh) return item.nameZh;
  if (locale === 'en' && item.nameEn) return item.nameEn;
  return item.nameRu;
}

/** Выбирает текст под локаль (ru — основной, en/zh — опциональны). */
export function pickText(
  locale: string,
  ru: string | null,
  en: string | null,
  zh: string | null
): string | null {
  if (locale === 'zh' && zh) return zh;
  if (locale === 'en' && en) return en;
  return ru;
}
