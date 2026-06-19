import { Container } from '@china-ru/ui';

import { TenderDetailClient } from '@/components/tenders/tender-detail-client';
import { TenderNotice } from '@/components/tenders/tender-notice';
import { TenderWorkspace } from '@/components/tenders/tender-workspace';
import { Link } from '@/i18n/navigation';
import { tendersApi } from '@/lib/api';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const t = await tendersApi.tender(id);
    return {
      title: `${t.title} — тендер № ${t.registryNumber} | China.ru`,
      description: t.description.slice(0, 160),
    };
  } catch {
    return { title: 'Тендер | China.ru' };
  }
}

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tender = await tendersApi.tender(id).catch(() => null);

  return (
    <Container className="py-8">
      <Link href="/tenders" className="text-sm text-muted hover:text-brand">
        ← К реестру тендеров
      </Link>
      <div className="mt-4">
        {tender ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <TenderNotice tender={tender} />
            <TenderWorkspace tender={tender} />
          </div>
        ) : (
          <TenderDetailClient id={id} />
        )}
      </div>
    </Container>
  );
}
