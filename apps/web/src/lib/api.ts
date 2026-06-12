import type {
  ApiResponse,
  CategoryTreeNode,
  JobCategoryCount,
  JobListingPublicDto,
  JobListQuery,
  Paginated,
  ProductDto,
  ProductListQuery,
  ResumeListQuery,
  ResumePublicDto,
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
