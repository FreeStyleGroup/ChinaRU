import { cn } from '../cn';

import { Badge } from './badge';

/**
 * Тон метки — смысл статуса, а не цвет: ждёт действия, принято, отказ, в пути,
 * служебное. Совпадает с `StatusTone` из `@china-ru/shared` (там словари подписей).
 */
export type BadgeTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral';

/** Цвет по тону: ждёт — жёлтый, принято — зелёный, отказ — красный, в пути — синий. */
const TONE_CLASS: Record<BadgeTone, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  neutral: 'bg-surface text-muted ring-1 ring-inset ring-line',
};

/**
 * Метка статуса или роли: подпись и цвет из словаря (USER_ROLE_LABELS,
 * ORDER_STATUS_LABELS… в `@china-ru/shared`). Неизвестный код — серой меткой
 * как есть, чтобы новый статус в базе был виден, а не пропадал.
 */
export function StatusBadge<K extends string>({
  value,
  labels,
  className,
}: {
  value: K;
  labels: Record<K, { label: string; tone: BadgeTone }>;
  className?: string;
}) {
  const entry = labels[value] as { label: string; tone: BadgeTone } | undefined;
  return (
    <Badge className={cn('font-semibold', TONE_CLASS[entry?.tone ?? 'neutral'], className)}>
      {entry?.label ?? value}
    </Badge>
  );
}
