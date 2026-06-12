import { Link } from '@/i18n/navigation';

/** Переключатель публичного раздела «Работа»: вакансии (для соискателей) ↔ резюме (для работодателей). */
export function JobsTabs({ active }: { active: 'vacancies' | 'resumes' }) {
  const tabs = [
    { key: 'vacancies' as const, href: '/jobs', label: 'Вакансии' },
    { key: 'resumes' as const, href: '/jobs/resumes', label: 'Резюме' },
  ];
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-1">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            t.key === active ? 'bg-brand text-white' : 'text-ink hover:bg-surface'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
