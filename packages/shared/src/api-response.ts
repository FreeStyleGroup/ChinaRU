/**
 * Единый конверт ответа API. Контроллеры возвращают ApiResponse<T>,
 * клиент (web/admin/mobile) разбирает по полю `ok`.
 */
export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: {
    code: string;
    message: string;
    /** Поля с ошибками валидации: путь → сообщение. */
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function err(code: string, message: string, fields?: Record<string, string>): ApiErr {
  return { ok: false, error: fields ? { code, message, fields } : { code, message } };
}
