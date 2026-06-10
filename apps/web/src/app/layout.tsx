import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'China-RU | International Marketplace',
  description: 'Professional marketplace for buyers and sellers',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://china-ru.ru',
    siteName: 'China-RU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
