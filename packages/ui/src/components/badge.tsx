import { cn } from '../cn';

import type { HTMLAttributes } from 'react';

/** Небольшая метка (статус, тег, валюта). */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted',
        className
      )}
      {...props}
    />
  );
}
