/** Адрес доставки — подраздел профиля. Демо-состояние; адресная книга — после контура доставки. */
export default function AddressesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Адрес доставки</h1>
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <p className="text-muted">Вы пока не добавили ни одного адреса доставки.</p>
        <button
          type="button"
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Добавить адрес
        </button>
      </div>
      <p className="text-center text-xs text-muted">
        Демонстрационный раздел — адресная книга подключается вместе с контуром доставки.
      </p>
    </div>
  );
}
