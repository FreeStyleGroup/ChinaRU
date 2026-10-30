import type { StoreDto } from '@china-ru/shared';

/**
 * Адрес публичной страницы магазина (без языка — его добавит Link): никнейм,
 * а пока его нет — числовой ID. Подходит и StoreDto, и SellerProfileDto.
 */
export function storePath(store: Pick<StoreDto, 'nickname' | 'publicId'>): string {
  return `/store/${encodeURIComponent(store.nickname ?? String(store.publicId))}`;
}

/** Название магазина под язык: на китайском — китайское, если продавец его указал. */
export function storeName(
  store: Pick<StoreDto, 'companyName' | 'companyNameZh'>,
  locale: string
): string {
  return locale === 'zh' && store.companyNameZh ? store.companyNameZh : store.companyName;
}
