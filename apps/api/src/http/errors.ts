/**
 * Доменно-нейтральные HTTP-ошибки. Сервисы бросают их, центральный errorHandler
 * (см. error-handler.ts) превращает в единый конверт `ApiResponse.err`.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Ошибки валидации по полям (для 422). */
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Некорректный запрос', code = 'bad_request') {
    super(400, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = 'Ошибка валидации') {
    super(422, 'validation', message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Не авторизован', code = 'unauthorized') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Недостаточно прав', code = 'forbidden') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Не найдено', code = 'not_found') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Конфликт', code = 'conflict') {
    super(409, code, message);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Срок действия истёк', code = 'gone') {
    super(410, code, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Слишком много запросов, попробуйте позже') {
    super(429, 'rate_limited', message);
  }
}
