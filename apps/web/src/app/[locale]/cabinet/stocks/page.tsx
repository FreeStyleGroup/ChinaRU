/**
 * Акции — список отслеживаемых пользователем китайских акций. Когда в публичном
 * разделе «Акции Китая» (/stocks/) отмечаешь акцию «отслеживать» — она появляется здесь.
 * Демо-данные; котировки тянутся по API в разделе /stocks/ (отдельный вертикал).
 */
interface TrackedStock {
  code: string;
  name: string;
  price: string;
  currency: string;
  change: number;
}

const TRACKED: TrackedStock[] = [
  { code: 'BABA', name: 'Alibaba', price: '135.82', currency: 'USD', change: 3.13 },
  { code: 'XPEV', name: 'XPeng', price: '16.66', currency: 'USD', change: 4.78 },
  { code: 'BIDU', name: 'Baidu', price: '128.71', currency: 'USD', change: 5.91 },
  { code: 'LI', name: 'Li Auto', price: '18.13', currency: 'USD', change: -2.79 },
];

function Spark({ up }: { up: boolean }) {
  const color = up ? '#16a34a' : '#dc2626';
  return (
    <svg viewBox="0 0 100 40" width="100" height="40" preserveAspectRatio="none" aria-hidden="true">
      <path
        d={`M0,20 Q25,${up ? '5' : '35'} 50,20 T100,${up ? '10' : '30'}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

export default function StocksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Акции</h1>
        <a
          href="/stocks"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Акции Китая
        </a>
      </div>

      {TRACKED.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">Вы пока не отслеживаете ни одной акции.</p>
          <a
            href="/stocks"
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Перейти в «Акции Китая»
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {TRACKED.map(s => {
            const up = s.change >= 0;
            return (
              <a
                key={s.code}
                href={`/stocks/${s.code}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand"
              >
                <div className="w-40">
                  <p className="text-xs font-semibold text-muted">{s.code}</p>
                  <p className="text-lg font-bold text-ink">{s.name}</p>
                </div>
                <div className="hidden flex-1 opacity-70 sm:block">
                  <Spark up={up} />
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-ink">
                    {s.price} <span className="text-xs font-normal text-muted">{s.currency}</span>
                  </p>
                  <p className={`text-sm font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
                    {up ? '+' : ''}
                    {s.change.toFixed(2)}%
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — котировки тянутся по API в разделе «Акции Китая».
      </p>
    </div>
  );
}
