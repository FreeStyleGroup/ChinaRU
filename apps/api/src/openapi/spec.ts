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
    title: 'China-RU API',
    version: '1.0.0',
    description: 'B2B-маркетплейс и портал China-RU. Все ответы — конверт ApiResponse.',
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
  },
} as const;

function okRef(): { description: string; content: Record<string, unknown> } {
  return {
    description: 'ApiResponse',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
  };
}
