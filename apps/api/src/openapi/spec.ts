/**
 * OpenAPI 3.1 описание публичного API (v1). Отдаётся как `/api/v1/openapi.json`
 * и служит контрактом для Swagger UI и генерации мобильных SDK (Kotlin/Swift).
 * По мере роста доменов документ дополняется; единый конверт ответа — ApiResponse.
 */
export const OPENAPI_VERSION = '3.1.0';

const apiResponseEnvelope = {
  oneOf: [
    {
      type: 'object',
      required: ['ok', 'data'],
      properties: { ok: { const: true }, data: {} },
    },
    {
      type: 'object',
      required: ['ok', 'error'],
      properties: {
        ok: { const: false },
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            fields: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
      },
    },
  ],
} as const;

export const openApiDocument = {
  openapi: OPENAPI_VERSION,
  info: {
    title: 'China.ru API',
    version: '1.0.0',
    description: 'B2B-маркетплейс и портал China.ru. Все ответы — конверт ApiResponse.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'cn_access' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: { ApiResponse: apiResponseEnvelope },
  },
  paths: {
    '/auth/register': {
      post: { tags: ['auth'], summary: 'Регистрация', responses: { '201': okRef() } },
    },
    '/auth/login': {
      post: { tags: ['auth'], summary: 'Вход', responses: { '200': okRef() } },
    },
    '/auth/refresh': {
      post: { tags: ['auth'], summary: 'Ротация токенов', responses: { '200': okRef() } },
    },
    '/auth/logout': {
      post: { tags: ['auth'], summary: 'Выход', responses: { '200': okRef() } },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Текущий пользователь',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef(), '401': okRef() },
      },
    },
    '/auth/verify-email': {
      post: { tags: ['auth'], summary: 'Подтверждение email', responses: { '200': okRef() } },
    },
    '/auth/password-reset/request': {
      post: { tags: ['auth'], summary: 'Запрос сброса пароля', responses: { '200': okRef() } },
    },
    '/auth/password-reset/confirm': {
      post: { tags: ['auth'], summary: 'Установка нового пароля', responses: { '200': okRef() } },
    },
    '/auth/change-password': {
      post: {
        tags: ['auth'],
        summary: 'Смена пароля',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/catalog/categories': {
      get: { tags: ['catalog'], summary: 'Дерево категорий', responses: { '200': okRef() } },
    },
    '/catalog/products': {
      get: {
        tags: ['catalog'],
        summary: 'Листинг товаров',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'rating'] },
          },
        ],
        responses: { '200': okRef() },
      },
    },
    '/catalog/products/{slug}': {
      get: {
        tags: ['catalog'],
        summary: 'Карточка товара',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/orders': {
      get: {
        tags: ['orders'],
        summary: 'Заказы покупателя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['orders'],
        summary: 'Создать заказ',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '409': okRef() },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['orders'],
        summary: 'Заказ по id',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/account/avatar': {
      post: {
        tags: ['files'],
        summary: 'Загрузить аватар (image ≤2 МБ)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: fileForm() } } },
        responses: { '200': okRef(), '400': okRef() },
      },
    },
    '/files/avatars/{userId}': {
      get: {
        tags: ['files'],
        summary: 'Аватар пользователя (публичная раздача)',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Файл изображения', content: { 'image/*': {} } },
          '404': okRef(),
        },
      },
    },
    '/account/resume/documents': {
      get: {
        tags: ['files'],
        summary: 'Документы резюме (свои)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['files'],
        summary: 'Загрузить документ резюме (PDF/изображение ≤10 МБ)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  type: {
                    type: 'string',
                    enum: ['diploma', 'certificate', 'hsk_certificate', 'reference', 'other'],
                  },
                },
              },
            },
          },
        },
        responses: { '201': okRef(), '400': okRef(), '404': okRef() },
      },
    },
    '/account/resume/documents/{id}/download': {
      get: {
        tags: ['files'],
        summary: 'Скачать свой документ резюме',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Файл' }, '404': okRef() },
      },
    },
    '/account/resume/documents/{id}': {
      delete: {
        tags: ['files'],
        summary: 'Удалить свой документ резюме',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/admin/resume-documents/{id}/verify': {
      post: {
        tags: ['admin'],
        summary: 'Подтвердить документ резюме (рейтинг соискателя)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/social/feed': {
      get: {
        tags: ['social'],
        summary: 'Лента (посты пользователей и компаний + нативная реклама)',
        responses: { '200': okRef() },
      },
    },
    '/social/posts': {
      post: {
        tags: ['social'],
        summary: 'Создать пост (опц. от лица компании)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '403': okRef() },
      },
    },
    '/social/posts/{id}': {
      get: {
        tags: ['social'],
        summary: 'Пост по id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
      delete: {
        tags: ['social'],
        summary: 'Удалить свой пост',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '403': okRef() },
      },
    },
    '/social/posts/{id}/like': {
      post: {
        tags: ['social'],
        summary: 'Лайк/анлайк поста (тоггл)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/social/posts/{id}/comments': {
      get: {
        tags: ['social'],
        summary: 'Комментарии поста',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['social'],
        summary: 'Добавить комментарий',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '201': okRef(), '404': okRef() },
      },
    },
    '/admin/social/ads': {
      post: {
        tags: ['admin'],
        summary: 'Создать рекламный пост (вставляется в ленту)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef() },
      },
    },
    '/social/feed/following': {
      get: {
        tags: ['social'],
        summary: 'Лента по подпискам',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/social/users/{userId}/follow': {
      post: {
        tags: ['social'],
        summary: 'Подписаться на пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '403': okRef() },
      },
      delete: {
        tags: ['social'],
        summary: 'Отписаться от пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/social/companies/{sellerId}/follow': {
      post: {
        tags: ['social'],
        summary: 'Подписаться на компанию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'sellerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/social/users/by-public-id/{publicId}': {
      get: {
        tags: ['social'],
        summary: 'Резолв пользователя по публичному ID (для упоминаний @ID)',
        parameters: [
          { name: 'publicId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/social/reports': {
      post: {
        tags: ['social'],
        summary: 'Пожаловаться на пост или пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '404': okRef() },
      },
    },
    '/account/notifications': {
      get: {
        tags: ['account'],
        summary: 'Уведомления пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/social/reports': {
      get: {
        tags: ['admin'],
        summary: 'Очередь жалоб на модерацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/tenders': {
      get: {
        tags: ['tenders'],
        summary: 'Реестр тендеров (фильтры: способ, закон, регион, поиск)',
        responses: { '200': okRef() },
      },
      post: {
        tags: ['tenders'],
        summary: 'Создать тендер (черновик) — верифицированная компания-заказчик',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '403': okRef() },
      },
    },
    '/tenders/{id}': {
      get: {
        tags: ['tenders'],
        summary: 'Извещение тендера',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/tenders/{id}/publish': {
      post: {
        tags: ['tenders'],
        summary: 'Опубликовать тендер (открыть приём заявок)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '400': okRef(), '422': okRef() },
      },
    },
    '/tenders/{id}/bids': {
      get: {
        tags: ['tenders'],
        summary: 'Заявки тендера (только для заказчика)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '403': okRef() },
      },
      post: {
        tags: ['tenders'],
        summary: 'Подать заявку на тендер (верифицированная компания)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '201': okRef(), '400': okRef(), '403': okRef(), '409': okRef() },
      },
    },
    '/tenders/{id}/award': {
      post: {
        tags: ['tenders'],
        summary: 'Определить победителя (подведение итогов)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '400': okRef(), '404': okRef() },
      },
    },
    '/tender-bids/{id}/review': {
      post: {
        tags: ['tenders'],
        summary: 'Рассмотреть заявку: допуск или отклонение',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '400': okRef() },
      },
    },
  },
} as const;

/** Тело multipart с одним обязательным файлом `file`. */
function fileForm(): Record<string, unknown> {
  return {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  };
}

function okRef(): { description: string; content: Record<string, unknown> } {
  return {
    description: 'ApiResponse',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
  };
}
