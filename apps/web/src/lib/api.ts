import type {
  ApiResponse,
  ArticleCardDto,
  ArticlePublicDto,
  ArticleSection,
  CategoryTreeNode,
  JobCategoryCount,
  JobListingPublicDto,
  JobListQuery,
  Paginated,
  PostDto,
  ProductDto,
  ProductListQuery,
  ReviewDto,
  ResumeListQuery,
  ResumePublicDto,
  StoreDto,
  TenderDto,
  TenderListQuery,
  DealerDto,
  VehicleBrandDto,
  VehicleType,
} from '@china-ru/shared';

/** Базовый URL API для server-side запросов (внутренний адрес сервиса). */
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions {
  /** Время кеша Next (ISR) в секундах. */
  revalidate?: number;
}

async function apiGet<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate: options.revalidate ?? 0 },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new ApiError(res.status, json.error.code, json.error.message);
  return json.data;
}

function buildProductQuery(query: Partial<ProductListQuery>): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.sellerId) params.set('sellerId', query.sellerId);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const catalogApi = {
  categories: () => apiGet<CategoryTreeNode[]>('/catalog/categories', { revalidate: 3600 }),
  products: (query: Partial<ProductListQuery> = {}) =>
    apiGet<Paginated<ProductDto>>(`/catalog/products${buildProductQuery(query)}`, {
      revalidate: 300,
    }),
  product: (slug: string) =>
    apiGet<ProductDto>(`/catalog/products/${encodeURIComponent(slug)}`, { revalidate: 300 }),
  reviews: (productId: string) =>
    apiGet<ReviewDto[]>(`/products/${encodeURIComponent(productId)}/reviews`, { revalidate: 120 }),
};

/**
 * Публичная страница магазина. Ключ — никнейм, числовой publicId или id профиля
 * продавца (`ProductDto.sellerId`); неподтверждённый магазин — 404 `store_not_found`.
 */
export const storeApi = {
  // Минута, а не пять, как у товаров: продавец оформляет страницу и сразу её открывает.
  store: (key: string) =>
    apiGet<StoreDto>(`/stores/${encodeURIComponent(key)}`, { revalidate: 60 }),
};

function buildJobQuery(query: Partial<JobListQuery>): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.category) params.set('category', query.category);
  if (query.city) params.set('city', query.city);
  if (query.search) params.set('search', query.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildResumeQuery(query: Partial<ResumeListQuery>): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.category) params.set('category', query.category);
  if (query.experience) params.set('experience', query.experience);
  if (query.hskLevel) params.set('hskLevel', String(query.hskLevel));
  if (query.search) params.set('search', query.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const jobsApi = {
  vacancies: (query: Partial<JobListQuery> = {}) =>
    apiGet<Paginated<JobListingPublicDto>>(`/jobs${buildJobQuery(query)}`, { revalidate: 120 }),
  vacancy: (id: string) =>
    apiGet<JobListingPublicDto>(`/jobs/${encodeURIComponent(id)}`, { revalidate: 120 }),
  categoryCounts: () => apiGet<JobCategoryCount[]>('/jobs/categories', { revalidate: 300 }),
  resumes: (query: Partial<ResumeListQuery> = {}) =>
    apiGet<Paginated<ResumePublicDto>>(`/jobs/resumes${buildResumeQuery(query)}`, {
      revalidate: 120,
    }),
  resume: (id: string) =>
    apiGet<ResumePublicDto>(`/jobs/resumes/${encodeURIComponent(id)}`, { revalidate: 120 }),
};

/** Соцсеть: начальная лента для SSR (далее догрузка/интерактив — в браузере). */
export const socialApi = {
  feed: (page = 1) => apiGet<Paginated<PostDto>>(`/social/feed?page=${page}`, { revalidate: 30 }),
};

function buildTenderQuery(query: Partial<TenderListQuery>): string {
  const sp = new URLSearchParams();
  if (query.page) sp.set('page', String(query.page));
  if (query.method) sp.set('method', query.method);
  if (query.law) sp.set('law', query.law);
  if (query.region) sp.set('region', query.region);
  if (query.q) sp.set('q', query.q);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Авто-раздел: бренды, дилеры, города (SSR для лендинга и карты дилеров). */
export const autoApi = {
  brands: (type?: VehicleType) =>
    apiGet<VehicleBrandDto[]>(`/auto/brands${type ? `?type=${type}` : ''}`, { revalidate: 300 }),
  dealerCities: () => apiGet<string[]>('/auto/dealers/cities', { revalidate: 300 }),
  dealers: (city?: string) =>
    apiGet<DealerDto[]>(`/auto/dealers${city ? `?city=${encodeURIComponent(city)}` : ''}`, {
      revalidate: 120,
    }),
};

/** Тендерная площадка: реестр (SSR) и извещение по id. */
export const tendersApi = {
  list: (query: Partial<TenderListQuery> = {}) =>
    apiGet<Paginated<TenderDto>>(`/tenders${buildTenderQuery(query)}`, { revalidate: 60 }),
  tender: (id: string) =>
    apiGet<TenderDto>(`/tenders/${encodeURIComponent(id)}`, { revalidate: 30 }),
};

/** Контент-завод: статьи разделов (блок новостей + список + деталь). */
export const contentApi = {
  articles: (params: { section?: ArticleSection; limit?: number; page?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.section) sp.set('section', params.section);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.page) sp.set('page', String(params.page));
    const qs = sp.toString();
    return apiGet<Paginated<ArticleCardDto>>(`/content/articles${qs ? `?${qs}` : ''}`, {
      revalidate: 120,
    });
  },
  article: (slug: string) =>
    apiGet<ArticlePublicDto>(`/content/articles/${encodeURIComponent(slug)}`, { revalidate: 120 }),
};
