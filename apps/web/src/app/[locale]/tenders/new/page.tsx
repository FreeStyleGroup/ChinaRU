import { Container } from '@china-ru/ui';

import { CreateTenderForm } from '@/components/tenders/create-tender-form';
import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Разместить тендер — China.ru',
  description: 'Опубликуйте закупку для проверенных поставщиков: конкурс, аукцион или запрос котировок.',
};

export default function NewTenderPage() {
  return (
    <Container className="py-8">
      <Link href="/tenders" className="text-sm text-muted hover:text-brand">
        ← К реестру тендеров
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink">Размещение тендера</h1>
      <p className="mt-1 text-sm text-muted">
        Заполните извещение. После создания черновик можно проверить и опубликовать — заявки начнут
        поступать от верифицированных компаний.
      </p>
      <div className="mt-6 max-w-3xl">
        <CreateTenderForm />
      </div>
    </Container>
  );
}
