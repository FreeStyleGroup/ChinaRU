/**
 * Одноразовый токен из адреса страницы (`?token=`) — для страниц, на которые
 * ведут ссылки из писем. Без токена — null.
 */
export function tokenFromLocation(): string | null {
  const token = new URLSearchParams(window.location.search).get('token');
  return token && token.length > 0 ? token : null;
}

/** Токен — одноразовый: после использования убираем его из адресной строки и истории. */
export function dropTokenFromLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  window.history.replaceState(null, '', url.toString());
}

/** Код ошибки ссылки из ответа API → ключ сообщения. */
export function tokenErrorKey(code: string): 'tokenExpired' | 'tokenInvalid' {
  return code === 'token_expired' ? 'tokenExpired' : 'tokenInvalid';
}
