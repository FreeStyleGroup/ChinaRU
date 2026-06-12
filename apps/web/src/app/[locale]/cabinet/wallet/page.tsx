/**
 * Кошелёк — мультивалютный баланс (демо-данные; платёжная логика подключается позже).
 * Структура по референсу Битрикс: общий баланс + действия + группы валют.
 */
const ACTIONS = [
  { label: 'Пополнить', color: 'bg-green-600' },
  { label: 'Перевести', color: 'bg-blue-600' },
  { label: 'Обменять', color: 'bg-amber-500' },
  { label: 'История', color: 'bg-violet-600' },
];

interface Coin {
  name: string;
  ticker: string;
  amount: string;
  rub: string;
  change?: string;
  color: string;
}

const GROUPS: { title: string; coins: Coin[] }[] = [
  {
    title: 'Цифровые валюты',
    coins: [
      {
        name: 'Цифровой рубль',
        ticker: 'DRUB',
        amount: '145 230,50 ₽',
        rub: '145 231 ₽',
        color: 'bg-green-600',
      },
      {
        name: 'Цифровой юань',
        ticker: 'DCNY',
        amount: '8 500,00 ¥',
        rub: '104 975 ₽',
        change: '+0.15%',
        color: 'bg-red-600',
      },
    ],
  },
  {
    title: 'Фиатные валюты',
    coins: [
      {
        name: 'Российский рубль',
        ticker: 'RUB',
        amount: '324 100,00 ₽',
        rub: '324 100 ₽',
        color: 'bg-blue-600',
      },
      {
        name: 'Китайский юань',
        ticker: 'CNY',
        amount: '15 200,00 ¥',
        rub: '187 720 ₽',
        change: '+0.15%',
        color: 'bg-amber-500',
      },
    ],
  },
  {
    title: 'Криптовалюты',
    coins: [
      {
        name: 'Tether',
        ticker: 'USDT',
        amount: '2 150.00 USDT',
        rub: '196 875 ₽',
        change: '+0.02%',
        color: 'bg-emerald-500',
      },
      {
        name: 'Bitcoin',
        ticker: 'BTC',
        amount: '0.0345 BTC',
        rub: '284 790 ₽',
        change: '+2.34%',
        color: 'bg-orange-500',
      },
      {
        name: 'Ethereum',
        ticker: 'ETH',
        amount: '1.2450 ETH',
        rub: '392 175 ₽',
        change: '-1.12%',
        color: 'bg-indigo-500',
      },
      {
        name: 'Toncoin',
        ticker: 'TON',
        amount: '520.00 TON',
        rub: '234 000 ₽',
        change: '+3.67%',
        color: 'bg-sky-500',
      },
    ],
  },
];

function changeClass(change: string): string {
  return change.startsWith('-') ? 'text-red-500' : 'text-green-600';
}

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Кошелёк</h1>

      <div className="rounded-2xl bg-ink p-6 text-white">
        <p className="text-sm text-white/60">Общий баланс</p>
        <p className="mt-1 text-3xl font-bold">1 871 865,50 ₽</p>
        <span className="mt-2 inline-block rounded-md bg-green-600/20 px-2 py-0.5 text-xs text-green-400">
          ▲ +1.8% за 24 часа
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map(a => (
          <button
            key={a.label}
            type="button"
            className={`rounded-xl ${a.color} px-4 py-4 text-sm font-medium text-white transition-opacity hover:opacity-90`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {GROUPS.map(group => (
        <div key={group.title} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">{group.title}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {group.coins.map(c => (
              <div key={c.ticker} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${c.color} text-xs font-bold text-white`}
                >
                  {c.ticker.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.ticker}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{c.amount}</p>
                  <p className="text-xs text-muted">
                    ≈ {c.rub}
                    {c.change ? (
                      <span className={`ml-1 ${changeClass(c.change)}`}>{c.change}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — платёжная логика подключается позже.
      </p>
    </div>
  );
}
