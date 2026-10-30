import { tokenPageMetadata } from '@/lib/token-pages';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return tokenPageMetadata(params, 'resetTitle');
}

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
