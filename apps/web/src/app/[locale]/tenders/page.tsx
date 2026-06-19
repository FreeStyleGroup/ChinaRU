import { Container } from '@china-ru/ui';

import { TendersBoard } from '@/components/tenders/tenders-board';
import { Link } from '@/i18n/navigation';
import { tendersApi } from '@/lib/api';

import type { TenderDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тендеры и закупки B2B — China.ru',
  description:
    'Реестр коммерческих тендеров и закупок между проверенными компаниями. Конкурсы, аукционы, запросы котировок и предложений по образцу 44-ФЗ и 223-ФЗ. Подавайте заявки или размещайте свои закупки.',
};

const EMPTY = { items: [] as TenderDto[], total: 0, page: 1, pageSize: 20, totalPages: 0 };

const STEPS = [
  { icon: '📋', title: 'Извещение', text: 'Заказчик публикует тендер: предмет, НМЦК, срок и условия.' },
  { icon: '✉️', title: 'Заявки', text: 'Верифицированные компании подают заявки с ценой и предложением.' },
  { icon: '⚖️', title: 'Рассмотрение', text: 'Заказчик допускает или отклоняет заявки по требованиям.' },
  { icon: '🏆', title: 'Итоги', text: 'Определяется победитель, стороны заключают договор.' },
];

export default async function TendersPage() {
  const reestr = await tendersApi.list().catch(() => EMPTY);

  return (
    <Container className="py-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-accent p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Закупки · B2B
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Тендерная площадка China.ru</h1>
        <p className="mt-3 max-w-2xl text-white/85">
          Конкурсы, аукционы и запросы котировок между проверенными компаниями — по понятным
          процедурам 44-ФЗ и 223-ФЗ. Найдите закупку или разместите свою.
        </p>
        <Link
          href="/tenders/new"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand hover:opacity-90"
        >
          Разместить тендер →
        </Link>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(s => (
          <div key={s.title} className="rounded-2xl border border-line bg-white p-4">
            <div className="text-2xl">{s.icon}</div>
            <p className="mt-2 font-semibold text-ink">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <div className="mt-8">
        <TendersBoard initial={{ items: reestr.items, totalPages: reestr.totalPages }} />
      </div>
    </Container>
  );
}
