/**
 * OpenAPI 3.1 описание публичного API (v1). Отдаётся как `/api/v1/openapi.json`
 * и служит контрактом для Swagger UI и генерации мобильных SDK (Kotlin/Swift).
 * Документ покрывает все маршруты `createV1Router` (routes.ts) — синхронность
 * проверяет spec.test.ts; единый конверт ответа — ApiResponse.
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
    // ───────── meta ─────────
    '/openapi.json': {
      get: {
        tags: ['meta'],
        summary: 'Этот OpenAPI-документ',
        responses: {
          '200': { description: 'OpenAPI 3.1 документ', content: { 'application/json': {} } },
        },
      },
    },

    // ───────── auth ─────────
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
    '/auth/verify-email/resend': {
      post: {
        tags: ['auth'],
        summary: 'Повторное письмо подтверждения email',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
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

    // ───────── catalog ─────────
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
    '/catalog/products/{id}/price-requests': {
      post: {
        tags: ['price-requests'],
        summary: 'Запросить цену у продавца (товар «цена по запросу»)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '201': okRef(), '404': okRef() },
      },
    },

    // ───────── магазины ─────────
    '/stores/{key}': {
      get: {
        tags: ['stores'],
        summary: 'Публичная страница магазина (по никнейму, publicId или id)',
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': okRef(), '404': okRef() },
      },
    },

    // ───────── отзывы ─────────
    '/products/{id}/reviews': {
      get: {
        tags: ['reviews'],
        summary: 'Отзывы о товаре',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['reviews'],
        summary: 'Оставить отзыв о товаре',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '201': okRef() },
      },
    },

    // ───────── файлы (публичная раздача) ─────────
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
    '/files/product-images/{productId}/{imageId}': {
      get: {
        tags: ['files'],
        summary: 'Фото товара (публичная раздача)',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'imageId',
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
    '/files/stores/{sellerId}/{fileId}': {
      get: {
        tags: ['files'],
        summary: 'Баннер или логотип магазина (публичная раздача)',
        parameters: [
          {
            name: 'sellerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'fileId',
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
    '/files/categories/{categoryId}/{fileId}': {
      get: {
        tags: ['files'],
        summary: 'Обложка раздела каталога (публичная раздача)',
        parameters: [
          {
            name: 'categoryId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'fileId',
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

    // ───────── контент (публичное чтение) ─────────
    '/content/articles': {
      get: {
        tags: ['content'],
        summary: 'Опубликованные статьи (фильтры: раздел, лимит, пагинация)',
        responses: { '200': okRef() },
      },
    },
    '/content/articles/{slug}': {
      get: {
        tags: ['content'],
        summary: 'Опубликованная статья по slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': okRef(), '404': okRef() },
      },
    },

    // ───────── account (кабинет) ─────────
    '/account/profile': {
      patch: {
        tags: ['account'],
        summary: 'Обновить свой профиль',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/menu': {
      put: {
        tags: ['account'],
        summary: 'Включённые опциональные разделы меню кабинета',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/nickname': {
      put: {
        tags: ['account'],
        summary: 'Выбрать или сменить никнейм (верифицированный пользователь)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
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
    '/account/notifications': {
      get: {
        tags: ['account'],
        summary: 'Уведомления пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/notifications/unread': {
      get: {
        tags: ['account'],
        summary: 'Число непрочитанных уведомлений',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/notifications/read': {
      post: {
        tags: ['account'],
        summary: 'Отметить уведомления прочитанными (по id или все)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller': {
      get: {
        tags: ['seller'],
        summary: 'Профиль продавца текущего пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller/apply': {
      post: {
        tags: ['seller'],
        summary: 'Заявка на открытие магазина (ИНН, контакты — на модерацию)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller/nickname': {
      put: {
        tags: ['seller'],
        summary: 'Выбрать или сменить никнейм магазина',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller/store': {
      patch: {
        tags: ['stores'],
        summary: 'Описание магазина',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller/store/banner': {
      post: {
        tags: ['stores'],
        summary: 'Загрузить баннер магазина (image ≤5 МБ)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: fileForm() } } },
        responses: { '200': okRef(), '400': okRef() },
      },
      delete: {
        tags: ['stores'],
        summary: 'Удалить баннер магазина',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/seller/store/logo': {
      post: {
        tags: ['stores'],
        summary: 'Загрузить логотип магазина (image ≤2 МБ)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: fileForm() } } },
        responses: { '200': okRef(), '400': okRef() },
      },
      delete: {
        tags: ['stores'],
        summary: 'Удалить логотип магазина',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/referral': {
      get: {
        tags: ['referral'],
        summary: 'Сводка реферальной программы',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/horoscope': {
      get: {
        tags: ['account'],
        summary: 'Персональный гороскоп на день',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },

    // ───────── работа (резюме / вакансии / отклики) ─────────
    '/account/resume': {
      get: {
        tags: ['jobs'],
        summary: 'Своё резюме',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      put: {
        tags: ['jobs'],
        summary: 'Создать или обновить своё резюме',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
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
    '/account/applications': {
      get: {
        tags: ['jobs'],
        summary: 'Мои отклики на вакансии',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/jobs': {
      get: {
        tags: ['jobs'],
        summary: 'Опубликованные вакансии (фильтры, пагинация)',
        responses: { '200': okRef() },
      },
    },
    '/jobs/categories': {
      get: {
        tags: ['jobs'],
        summary: 'Число вакансий по категориям',
        responses: { '200': okRef() },
      },
    },
    '/jobs/resumes': {
      get: {
        tags: ['jobs'],
        summary: 'Опубликованные резюме (фильтры, пагинация)',
        responses: { '200': okRef() },
      },
    },
    '/jobs/resumes/{id}': {
      get: {
        tags: ['jobs'],
        summary: 'Опубликованное резюме по id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['jobs'],
        summary: 'Вакансия по id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/jobs/{id}/apply': {
      post: {
        tags: ['jobs'],
        summary: 'Откликнуться на вакансию (опц. сопроводительное письмо)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '201': okRef() },
      },
    },
    '/seller/vacancies': {
      get: {
        tags: ['jobs'],
        summary: 'Вакансии моей компании',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['jobs'],
        summary: 'Создать вакансию от лица компании',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/seller/vacancies/{id}/applicants': {
      get: {
        tags: ['jobs'],
        summary: 'Отклики на вакансию (только владелец вакансии)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/seller/applications/{id}': {
      put: {
        tags: ['jobs'],
        summary: 'Сменить статус отклика (работодатель)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },

    // ───────── товары продавца («Мой магазин») ─────────
    '/seller/products': {
      get: {
        tags: ['seller'],
        summary: 'Мои товары',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['seller'],
        summary: 'Создать товар',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef() },
      },
    },
    '/seller/products/translate': {
      post: {
        tags: ['seller'],
        summary: 'Подсказка перевода названия товара (EN и 中文 из русского)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/seller/products/{id}': {
      get: {
        tags: ['seller'],
        summary: 'Мой товар по id',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
      patch: {
        tags: ['seller'],
        summary: 'Обновить свой товар',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      delete: {
        tags: ['seller'],
        summary: 'Удалить свой товар',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/seller/products/{id}/images': {
      post: {
        tags: ['seller'],
        summary: 'Загрузить фото товара (image ≤5 МБ)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { content: { 'multipart/form-data': { schema: fileForm() } } },
        responses: { '201': okRef(), '400': okRef() },
      },
    },
    '/seller/products/{id}/images/{imageId}': {
      delete: {
        tags: ['seller'],
        summary: 'Удалить фото товара',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'imageId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef() },
      },
    },

    // ───────── заказы продавца ─────────
    '/seller/orders': {
      get: {
        tags: ['seller'],
        summary: 'Заказы с моими товарами',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/seller/orders/{orderId}/fulfillment': {
      patch: {
        tags: ['seller'],
        summary: 'Сменить статус исполнения заказа',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef() },
      },
    },

    // ───────── запросы цены продавцу ─────────
    '/seller/price-requests': {
      get: {
        tags: ['price-requests'],
        summary: 'Входящие запросы цены (фильтр по статусу, пагинация)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/seller/price-requests/{id}': {
      patch: {
        tags: ['price-requests'],
        summary: 'Сменить статус запроса цены (ответил / закрыт)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },

    // ───────── соцсеть ─────────
    '/social/feed': {
      get: {
        tags: ['social'],
        summary: 'Лента (посты пользователей и компаний + нативная реклама)',
        responses: { '200': okRef() },
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
    '/social/users/by-public-id/{publicId}': {
      get: {
        tags: ['social'],
        summary: 'Резолв пользователя по публичному ID (для упоминаний @ID)',
        parameters: [{ name: 'publicId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': okRef(), '404': okRef() },
      },
    },
    '/social/users/{userId}/posts': {
      get: {
        tags: ['social'],
        summary: 'Посты пользователя',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef() },
      },
    },
    '/social/companies/{sellerId}/posts': {
      get: {
        tags: ['social'],
        summary: 'Посты компании',
        parameters: [
          {
            name: 'sellerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
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
    '/social/comments/{id}': {
      delete: {
        tags: ['social'],
        summary: 'Удалить свой комментарий',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/social/users/{userId}/follow': {
      post: {
        tags: ['social'],
        summary: 'Подписаться на пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef(), '403': okRef() },
      },
      delete: {
        tags: ['social'],
        summary: 'Отписаться от пользователя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
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
      delete: {
        tags: ['social'],
        summary: 'Отписаться от компании',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'sellerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef() },
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

    // ───────── тендеры ─────────
    '/account/tenders': {
      get: {
        tags: ['tenders'],
        summary: 'Мои тендеры (заказчик)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/account/tender-bids': {
      get: {
        tags: ['tenders'],
        summary: 'Мои заявки на тендеры (участник)',
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
      patch: {
        tags: ['tenders'],
        summary: 'Изменить тендер (заказчик)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      delete: {
        tags: ['tenders'],
        summary: 'Удалить тендер (заказчик)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/tenders/{id}/my-bid': {
      get: {
        tags: ['tenders'],
        summary: 'Моя заявка на этот тендер',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
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
    '/tenders/{id}/close': {
      post: {
        tags: ['tenders'],
        summary: 'Закрыть приём заявок',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/tenders/{id}/cancel': {
      post: {
        tags: ['tenders'],
        summary: 'Отменить тендер (опц. с причиной)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
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
    '/tenders/{id}/complete': {
      post: {
        tags: ['tenders'],
        summary: 'Завершить тендер',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/tender-bids/{id}': {
      patch: {
        tags: ['tenders'],
        summary: 'Изменить свою заявку',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/tender-bids/{id}/withdraw': {
      post: {
        tags: ['tenders'],
        summary: 'Отозвать свою заявку',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
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

    // ───────── авто-раздел + Мой гараж ─────────
    '/auto/brands': {
      get: {
        tags: ['auto'],
        summary: 'Бренды китайского автопарка (фильтры type=auto|moto|special, popular)',
        responses: { '200': okRef() },
      },
    },
    '/auto/brands/{brandId}/models': {
      get: {
        tags: ['auto'],
        summary: 'Модели бренда',
        parameters: [
          {
            name: 'brandId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': okRef() },
      },
    },
    '/auto/dealers/cities': {
      get: {
        tags: ['auto'],
        summary: 'Города, в которых есть дилеры',
        responses: { '200': okRef() },
      },
    },
    '/auto/dealers': {
      get: {
        tags: ['auto'],
        summary: 'Официальные дилеры (фильтр city + brands=csv id) с координатами для карты',
        responses: { '200': okRef() },
      },
    },
    '/account/garage': {
      get: {
        tags: ['auto'],
        summary: 'Мой гараж: список транспорта',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['auto'],
        summary: 'Добавить транспорт в гараж',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '404': okRef() },
      },
    },
    '/account/garage/{id}': {
      delete: {
        tags: ['auto'],
        summary: 'Убрать транспорт из гаража',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/account/garage/{id}/parts': {
      get: {
        tags: ['auto'],
        summary: 'Запчасти каталога, подходящие транспорту из гаража',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '403': okRef() },
      },
    },

    // ───────── корзина ─────────
    '/cart': {
      get: {
        tags: ['cart'],
        summary: 'Корзина покупателя',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      delete: {
        tags: ['cart'],
        summary: 'Очистить корзину',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/cart/items': {
      post: {
        tags: ['cart'],
        summary: 'Добавить товар в корзину',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef() },
      },
    },
    '/cart/items/{id}': {
      patch: {
        tags: ['cart'],
        summary: 'Изменить количество позиции',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      delete: {
        tags: ['cart'],
        summary: 'Удалить позицию из корзины',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/cart/checkout': {
      post: {
        tags: ['cart'],
        summary: 'Оформить заказ из корзины',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef(), '400': okRef(), '409': okRef() },
      },
    },

    // ───────── заказы покупателя ─────────
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

    // ───────── admin (только роль admin) ─────────
    '/admin/stats': {
      get: {
        tags: ['admin'],
        summary: 'Сводная статистика платформы',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/users': {
      get: {
        tags: ['admin'],
        summary: 'Пользователи (фильтры, пагинация)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/users/{id}/verify': {
      post: {
        tags: ['admin'],
        summary: 'Верифицировать пользователя или снять верификацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/sellers': {
      get: {
        tags: ['admin'],
        summary: 'Продавцы (фильтры, пагинация)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/sellers/{id}/verify': {
      post: {
        tags: ['admin'],
        summary: 'Решение по заявке продавца: верифицировать или отклонить',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/products': {
      get: {
        tags: ['admin'],
        summary: 'Все товары, включая черновики и снятые',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['admin'],
        summary: 'Все заказы (фильтры, пагинация)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/reviews': {
      get: {
        tags: ['admin'],
        summary: 'Отзывы на модерацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/reviews/{id}/moderate': {
      post: {
        tags: ['admin'],
        summary: 'Одобрить или отклонить отзыв',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/resumes': {
      get: {
        tags: ['admin'],
        summary: 'Резюме на модерацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/resumes/{id}/moderate': {
      post: {
        tags: ['admin'],
        summary: 'Опубликовать или отклонить резюме (с причиной)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/resumes/{id}/documents': {
      get: {
        tags: ['admin'],
        summary: 'Документы резюме для проверки',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
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
    '/admin/vacancies': {
      get: {
        tags: ['admin'],
        summary: 'Вакансии на модерацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/vacancies/{id}/moderate': {
      post: {
        tags: ['admin'],
        summary: 'Опубликовать или отклонить вакансию (с причиной)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/social/posts': {
      get: {
        tags: ['admin'],
        summary: 'Посты соцсети для модерации',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
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
    '/admin/social/posts/{id}/hide': {
      post: {
        tags: ['admin'],
        summary: 'Скрыть пост',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/social/posts/{id}/unhide': {
      post: {
        tags: ['admin'],
        summary: 'Вернуть скрытый пост в публикацию',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
    '/admin/social/reports/{id}/resolve': {
      post: {
        tags: ['admin'],
        summary: 'Закрыть жалобу: принята или отклонена',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/content/agents': {
      get: {
        tags: ['admin'],
        summary: 'ИИ-агенты разделов «Контент завода»',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
    },
    '/admin/content/agents/{section}': {
      put: {
        tags: ['admin'],
        summary: 'Создать или обновить ИИ-агента раздела',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'section', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': okRef() },
      },
    },
    '/admin/content/agents/{section}/generate': {
      post: {
        tags: ['admin'],
        summary: 'Сгенерировать статью агентом раздела (опц. тема)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'section', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': okRef() },
      },
    },
    '/admin/content/articles': {
      get: {
        tags: ['admin'],
        summary: 'Все статьи (фильтры, пагинация)',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '200': okRef() },
      },
      post: {
        tags: ['admin'],
        summary: 'Создать статью',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { '201': okRef() },
      },
    },
    '/admin/content/articles/{id}': {
      get: {
        tags: ['admin'],
        summary: 'Статья по id',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef(), '404': okRef() },
      },
      patch: {
        tags: ['admin'],
        summary: 'Изменить статью',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
      delete: {
        tags: ['admin'],
        summary: 'Удалить статью',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/content/articles/{id}/publish': {
      post: {
        tags: ['admin'],
        summary: 'Опубликовать статью',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
      },
    },
    '/admin/content/articles/{id}/archive': {
      post: {
        tags: ['admin'],
        summary: 'Отправить статью в архив',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': okRef() },
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
