export const LOCALES = ['ru', 'en', 'zh'] as const;
export const DEFAULT_LOCALE = 'ru';

export const CURRENCIES = {
  rub: { symbol: '₽', name: 'Russian Ruble' },
  cny: { symbol: '¥', name: 'Chinese Yuan' },
  usd: { symbol: '$', name: 'US Dollar' },
  eur: { symbol: '€', name: 'Euro' },
} as const;

export const DEFAULT_CURRENCY = 'rub';

export const USER_ROLES = ['buyer', 'seller', 'admin'] as const;
export const USER_STATUSES = ['active', 'banned', 'pending_verify'] as const;

export const OAUTH_PROVIDERS = ['google', 'yandex', 'vk', 'wechat'] as const;

export const PRODUCT_STATUSES = ['draft', 'active', 'paused', 'banned'] as const;
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export const JOB_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'internship'] as const;
export const HSK_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const SELLER_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const API_ROUTES = {
  HEALTH: '/api/health',
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
  },
  CATALOG: {
    CATEGORIES: '/api/v1/catalog/categories',
    PRODUCTS: '/api/v1/catalog/products',
    PRODUCT_DETAIL: (slug: string) => `/api/v1/catalog/products/${slug}`,
  },
  SEARCH: '/api/v1/search',
  ORDERS: '/api/v1/orders',
  SELLER: {
    PRODUCTS: '/api/v1/seller/products',
    ORDERS: '/api/v1/seller/orders',
    PROFILE: '/api/v1/seller/profile',
  },
  TRAVEL: {
    DESTINATIONS: '/api/v1/travel/destinations',
    PACKAGES: '/api/v1/travel/packages',
    BOOKINGS: '/api/v1/travel/bookings',
  },
  JOBS: {
    LISTINGS: '/api/v1/jobs',
    APPLICATIONS: '/api/v1/jobs/applications',
  },
  METRO: {
    CITIES: '/api/v1/metro/cities',
    LINES: (citySlug: string) => `/api/v1/metro/cities/${citySlug}/lines`,
  },
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE_REGEX: /^[+]?[\d\s\-()]{10,}$/,
  URL_REGEX: /^https?:\/\/.+/,
} as const;
