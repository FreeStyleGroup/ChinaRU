import type {
  ModerationStatus,
  OrderStatus,
  ProductStatus,
  ReviewStatus,
  SellerVerifyStatus,
  UserRole,
  UserStatus,
} from './enums';

/**
 * Русские подписи статусов и ролей — для админки и кабинетов. Коды в базе и API
 * остаются английскими (это контракт), человеку показывается подпись отсюда.
 *
 * Тон — смысл статуса для цвета метки, а не сам цвет: цвет выбирает интерфейс.
 *   pending — ждёт действия (жёлтый), success — принято/работает (зелёный),
 *   danger — отклонено/заблокировано (красный), info — в пути (синий),
 *   neutral — служебное (серый).
 */
export type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral';

export interface StatusLabel {
  label: string;
  tone: StatusTone;
}

export const USER_ROLE_LABELS: Record<UserRole, StatusLabel> = {
  buyer: { label: 'Покупатель', tone: 'neutral' },
  seller: { label: 'Продавец', tone: 'info' },
  admin: { label: 'Администратор', tone: 'danger' },
};

export const USER_STATUS_LABELS: Record<UserStatus, StatusLabel> = {
  pending_verify: { label: 'Почта не подтверждена', tone: 'pending' },
  active: { label: 'Активен', tone: 'success' },
  banned: { label: 'Заблокирован', tone: 'danger' },
};

export const SELLER_VERIFY_STATUS_LABELS: Record<SellerVerifyStatus, StatusLabel> = {
  unverified: { label: 'Не проверен', tone: 'neutral' },
  pending: { label: 'На проверке', tone: 'pending' },
  verified: { label: 'Подтверждён', tone: 'success' },
  rejected: { label: 'Отклонён', tone: 'danger' },
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, StatusLabel> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  active: { label: 'В продаже', tone: 'success' },
  paused: { label: 'Снят с продажи', tone: 'pending' },
  banned: { label: 'Заблокирован', tone: 'danger' },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, StatusLabel> = {
  pending: { label: 'Ожидает оплаты', tone: 'pending' },
  paid: { label: 'Оплачен', tone: 'success' },
  shipped: { label: 'Отправлен', tone: 'info' },
  delivered: { label: 'Доставлен', tone: 'success' },
  cancelled: { label: 'Отменён', tone: 'danger' },
  refunded: { label: 'Возврат', tone: 'danger' },
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, StatusLabel> = {
  pending: { label: 'На проверке', tone: 'pending' },
  approved: { label: 'Опубликован', tone: 'success' },
  rejected: { label: 'Отклонён', tone: 'danger' },
};

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, StatusLabel> = {
  pending: { label: 'На проверке', tone: 'pending' },
  published: { label: 'Опубликовано', tone: 'success' },
  rejected: { label: 'Отклонено', tone: 'danger' },
};
