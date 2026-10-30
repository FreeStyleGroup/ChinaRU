import { tokenPageMetadata } from '@/lib/token-pages';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return tokenPageMetadata(params, 'forgotTitle');
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
