/**
 * Рейтинг соискателя как функция числа ПОДТВЕРЖДЁННЫХ модератором документов:
 * каждый даёт +0.5, потолок 5.00. Детерминированно (numeric строкой), вызывается
 * при загрузке/удалении документа и при подтверждении админом.
 */
export function computeResumeRating(verifiedDocuments: number): string {
  const rating = Math.min(5, Math.max(0, verifiedDocuments) * 0.5);
  return rating.toFixed(2);
}
