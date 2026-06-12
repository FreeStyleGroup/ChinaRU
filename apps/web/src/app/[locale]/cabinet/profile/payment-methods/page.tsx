/** Карты оплаты — подраздел профиля. Демо-состояние; привязка карт — после платёжного контура. */
export default function PaymentMethodsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Карты оплаты</h1>
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <p className="text-muted">У вас пока нет привязанных карт.</p>
        <button
          type="button"
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Добавить карту
        </button>
      </div>
      <p className="text-center text-xs text-muted">
        Демонстрационный раздел — привязка карт подключается вместе с платёжным контуром.
      </p>
    </div>
  );
}
