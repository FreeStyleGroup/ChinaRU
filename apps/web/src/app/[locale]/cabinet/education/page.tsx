/**
 * Обучение — школа китайского. Пользователь добавлен в группу (общую/индивидуальную),
 * где видны его онлайн-уроки и домашние задания. Демо-данные; реальные группы, уроки
 * и проверка ДЗ подключаются вместе с разделом «Школа» (/school/).
 */
interface Lesson {
  date: string;
  time: string;
  topic: string;
  live?: boolean;
}
interface Homework {
  title: string;
  due: string;
  done: boolean;
}

const GROUP = {
  name: 'HSK 3 «Дракон»',
  type: 'Общая группа',
  teacher: 'Ли Вэй',
  level: 'HSK 3',
};

const LESSONS: Lesson[] = [
  { date: 'Сегодня', time: '19:00', topic: 'Глаголы движения 来 / 去', live: true },
  { date: '14.06', time: '19:00', topic: 'Счётные слова' },
  { date: '17.06', time: '19:00', topic: 'Прошедшее время с 了' },
];

const HOMEWORK: Homework[] = [
  { title: 'Иероглифы урок 12 (пропись)', due: 'до 13.06', done: false },
  { title: 'Аудирование, упр. 5–7', due: 'до 16.06', done: false },
  { title: 'Диалог «В магазине»', due: 'до 10.06', done: true },
];

export default function EducationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Обучение</h1>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-brand to-accent p-6 text-white">
        <span className="text-4xl">🎓</span>
        <div className="flex-1">
          <p className="text-sm text-white/70">Моя группа · {GROUP.type}</p>
          <p className="text-xl font-bold">{GROUP.name}</p>
          <p className="text-sm text-white/85">
            Уровень {GROUP.level} · преподаватель {GROUP.teacher}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Онлайн-уроки</h2>
        <div className="space-y-2">
          {LESSONS.map(l => (
            <div
              key={l.date + l.time}
              className="flex items-center gap-4 rounded-xl border border-line bg-white p-4"
            >
              <div className="w-20 text-center">
                <p className="text-sm font-semibold text-ink">{l.date}</p>
                <p className="text-xs text-muted">{l.time}</p>
              </div>
              <p className="flex-1 text-sm text-ink">{l.topic}</p>
              {l.live ? (
                <button
                  type="button"
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white"
                >
                  Подключиться
                </button>
              ) : (
                <span className="text-xs text-muted">Запланирован</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Домашние задания</h2>
        <div className="space-y-2">
          {HOMEWORK.map(h => (
            <div
              key={h.title}
              className="flex items-center gap-3 rounded-xl border border-line bg-white p-4"
            >
              <span className={h.done ? 'text-green-600' : 'text-muted'}>
                {h.done ? '✓' : '○'}
              </span>
              <p className={`flex-1 text-sm ${h.done ? 'text-muted line-through' : 'text-ink'}`}>
                {h.title}
              </p>
              <span className="text-xs text-muted">{h.due}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  h.done ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
                }`}
              >
                {h.done ? 'Сдано' : 'Не сдано'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — группы, онлайн-уроки и проверка ДЗ подключаются вместе со
        «Школой» (/school/).
      </p>
    </div>
  );
}
