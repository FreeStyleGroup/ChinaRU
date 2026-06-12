'use client';

/**
 * Вопрос / Ответ — вкладки «Мои вопросы» / «Мои ответы».
 * Демо-данные перенесены из боевого china:cabinet (actionQuestions).
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

interface QA {
  product: string;
  question: string;
  date: string;
  answer?: string;
}

const MY_QUESTIONS: QA[] = [
  {
    product: 'Умная лампа Yeelight',
    question: 'Работает ли с Алисой?',
    date: '05.03.2026',
    answer: 'Да, работает через навык Mi Home.',
  },
];

const MY_ANSWERS: QA[] = [];

const TABS = [
  { key: 'questions', label: 'Мои вопросы', count: MY_QUESTIONS.length },
  { key: 'answers', label: 'Мои ответы', count: MY_ANSWERS.length },
] as const;

function QaCard({ item }: { item: QA }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-medium text-ink">{item.product}</p>
      <p className="mt-2 text-sm text-ink">
        <span className="font-semibold text-brand">В:</span> {item.question}
        <span className="ml-2 text-xs text-muted">{item.date}</span>
      </p>
      {item.answer ? (
        <p className="mt-1 rounded-lg bg-surface p-2 text-sm text-muted">
          <span className="font-semibold text-ink">О:</span> {item.answer}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">Ожидает ответа продавца…</p>
      )}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Вопрос / Ответ</h1>

      <Tabs tabs={TABS}>
        {active => {
          const list = active === 'questions' ? MY_QUESTIONS : MY_ANSWERS;
          if (list.length === 0) {
            return (
              <EmptyState
                title={
                  active === 'questions'
                    ? 'Вы пока не задавали вопросов о товарах.'
                    : 'Вы пока не отвечали на вопросы покупателей.'
                }
              />
            );
          }
          return (
            <div className="space-y-3">
              {list.map(item => (
                <QaCard key={item.product + item.question} item={item} />
              ))}
            </div>
          );
        }}
      </Tabs>
    </div>
  );
}
