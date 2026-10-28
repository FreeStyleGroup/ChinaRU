import { Badge, cn } from '@china-ru/ui';

import type { StatusLabel, StatusTone } from '@china-ru/shared';

/** Цвет метки по смыслу статуса: ждёт — жёлтый, принято — зелёный, отказ — красный. */
const TONE_CLASS: Record<StatusTone, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  neutral: 'bg-surface text-muted ring-1 ring-inset ring-line',
};

/**
 * Метка статуса или роли: русская подпись и цвет из словаря `@china-ru/shared`
 * (USER_ROLE_LABELS, SELLER_VERIFY_STATUS_LABELS…). Неизвестный код — серой
 * меткой как есть, чтобы новый статус в базе был виден, а не пропадал.
 */
export function StatusBadge<K extends string>({
  value,
  labels,
}: {
  value: K;
  labels: Record<K, StatusLabel>;
}) {
  const entry = labels[value] as StatusLabel | undefined;
  return (
    <Badge className={cn('font-semibold', TONE_CLASS[entry?.tone ?? 'neutral'])}>
      {entry?.label ?? value}
    </Badge>
  );
}
