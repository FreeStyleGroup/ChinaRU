import { CABINET_SECTIONS } from '@china-ru/shared';
import { notFound } from 'next/navigation';

import { NavIcon } from '@/components/cabinet/nav-icon';

/** Заглушка раздела кабинета: наполняется по мере проработки (первый — «Мой гараж»). */
export default async function CabinetSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const found = CABINET_SECTIONS.find(s => s.key === section);
  if (!found) notFound();

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-brand">
          <NavIcon section={found.key} />
        </span>
        {found.titleRu}
      </h1>
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
        Раздел «{found.titleRu}» в разработке — наполним его следующими заходами.
      </div>
    </div>
  );
}
