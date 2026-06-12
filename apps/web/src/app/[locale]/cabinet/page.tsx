'use client';

import { CABINET_SECTIONS } from '@china-ru/shared';
import { Card, CardBody } from '@china-ru/ui';

import { NavIcon } from '@/components/cabinet/nav-icon';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

export default function CabinetHome() {
  const { user } = useAuth();
  const enabled = new Set(user?.menuSections ?? []);
  const tiles = CABINET_SECTIONS.filter(
    s => s.key !== 'profile' && (s.pinned || enabled.has(s.key))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Личный кабинет</h1>
        <p className="text-muted">Добро пожаловать{user?.name ? `, ${user.name}` : ''}!</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map(s => (
          <Link key={s.key} href={`/cabinet/${s.key}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="flex flex-col items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-brand">
                  <NavIcon section={s.key} />
                </span>
                <span className="text-sm font-medium text-ink">{s.titleRu}</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
