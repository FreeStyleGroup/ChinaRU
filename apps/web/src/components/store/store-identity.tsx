import { cn } from '@china-ru/ui';

import { initials } from '@/lib/format';

/**
 * Логотип магазина; без логотипа — инициалы названия на фирменном фоне.
 * `alt` пустой, когда рядом и так написано название (декоративная картинка).
 */
export function StoreLogo({
  name,
  logoUrl,
  alt = '',
  className,
}: {
  name: string;
  logoUrl: string | null;
  alt?: string;
  className?: string;
}) {
  if (logoUrl) {
    return <img src={logoUrl} alt={alt} className={cn('bg-white object-cover', className)} />;
  }
  // Белая подложка под полупрозрачным фирменным тоном: логотип лежит поверх баннера
  // и не должен просвечивать.
  return (
    <span aria-hidden className={cn('flex overflow-hidden bg-white select-none', className)}>
      <span className="flex flex-1 items-center justify-center bg-brand/10 font-bold tracking-tight text-brand">
        {initials(name)}
      </span>
    </span>
  );
}

/** Значок «проверенный продавец» (магазин подтверждён модератором). */
export function VerifiedMark({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 text-sky-600', className)} title={label}>
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
