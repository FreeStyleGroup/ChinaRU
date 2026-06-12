/** Монолинейные иконки разделов кабинета (18px, stroke). */
const PATHS: Record<string, string> = {
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
  orders: 'M6 4h12l1 4H5l1-4zM5 8h14v11a1 1 0 01-1 1H6a1 1 0 01-1-1V8zM9 12h6',
  social: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 100-6M16 20a6 6 0 016-4',
  wallet: 'M3 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h12M17 13h.01',
  partners: 'M12 11a3 3 0 100-6 3 3 0 000 6zM6 20a6 6 0 0112 0M4 9v6M20 9v6',
  store:
    'M4 9l1-5h14l1 5M4 9h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9zM4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0',
  travel: 'M3 16l8-2 4-9 2 1-2 8 5-1 1 2-18 4z',
  garage: 'M3 11l2-5h14l2 5v8H3v-8zM6 19v-3M18 19v-3M3 14h18',
  concierge: 'M12 4a6 6 0 016 6v4l1 2H5l1-2v-4a6 6 0 016-6zM10 19a2 2 0 004 0',
  events:
    'M9 18V6l10-2v12M9 14l10-2M9 18a2 2 0 11-4 0 2 2 0 014 0zM19 16a2 2 0 11-4 0 2 2 0 014 0z',
  tenders: 'M7 4h7l4 4v12H7V4zM14 4v4h4M9 13h6M9 16h6',
  freight:
    'M3 6h11v9H3V6zM14 9h4l3 3v3h-7V9zM7 18a2 2 0 11-4 0 2 2 0 014 0zM20 18a2 2 0 11-4 0 2 2 0 014 0z',
  jobs: 'M4 8h16v11H4V8zM9 8V6a1 1 0 011-1h4a1 1 0 011 1v2M4 13h16',
  education: 'M12 5L2 9l10 4 10-4-10-4zM6 11v5c0 1 3 2 6 2s6-1 6-2v-5',
  horoscope: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3',
  stocks: 'M3 17l5-5 4 4 8-8M21 8h-4M21 8v4',
};

export function NavIcon({ section }: { section: string }) {
  const d = PATHS[section] ?? 'M5 12h14';
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
