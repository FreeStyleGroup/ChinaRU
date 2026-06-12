import type {
  AdminStats,
  ApiResponse,
  ArticleDto,
  ContentAgentDto,
  ContentModerationInput,
  GenerateArticleInput,
  JobListingDto,
  LoginInput,
  OrderDto,
  Paginated,
  ProductDto,
  ResumeDto,
  ReviewDto,
  ReviewModerationInput,
  SellerProfileDto,
  SellerVerifyDecisionInput,
  UpsertContentAgentInput,
  UserDto,
} from '@china-ru/shared';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...init.headers },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new AdminApiError(res.status, json.error.code, json.error.message);
  return json.data;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  role?: string;
  verifyStatus?: string;
  search?: string;
  section?: string;
}

export const api = {
  login: (input: LoginInput) =>
    call<{ user: UserDto }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => call<UserDto>('/auth/me'),
  logout: () => call<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),

  stats: () => call<AdminStats>('/admin/stats'),
  users: (p: ListParams) => call<Paginated<UserDto>>(`/admin/users${qs({ ...p })}`),
  sellers: (p: ListParams) => call<Paginated<SellerProfileDto>>(`/admin/sellers${qs({ ...p })}`),
  verifySeller: (id: string, decision: SellerVerifyDecisionInput) =>
    call<SellerProfileDto>(`/admin/sellers/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  products: (p: ListParams) => call<Paginated<ProductDto>>(`/admin/products${qs({ ...p })}`),
  orders: (p: ListParams) => call<Paginated<OrderDto>>(`/admin/orders${qs({ ...p })}`),
  reviews: (p: ListParams) => call<Paginated<ReviewDto>>(`/admin/reviews${qs({ ...p })}`),
  moderateReview: (id: string, input: ReviewModerationInput) =>
    call<{ id: string; status: string }>(`/admin/reviews/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  resumes: (p: ListParams) => call<Paginated<ResumeDto>>(`/admin/resumes${qs({ ...p })}`),
  moderateResume: (id: string, input: ContentModerationInput) =>
    call<ResumeDto>(`/admin/resumes/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  vacancies: (p: ListParams) => call<Paginated<JobListingDto>>(`/admin/vacancies${qs({ ...p })}`),
  moderateVacancy: (id: string, input: ContentModerationInput) =>
    call<JobListingDto>(`/admin/vacancies/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ── Контент завод ──
  contentAgents: () => call<ContentAgentDto[]>('/admin/content/agents'),
  upsertAgent: (section: string, input: UpsertContentAgentInput) =>
    call<ContentAgentDto>(`/admin/content/agents/${section}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  generateArticle: (section: string, input: GenerateArticleInput) =>
    call<ArticleDto>(`/admin/content/agents/${section}/generate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  articles: (p: ListParams) => call<Paginated<ArticleDto>>(`/admin/content/articles${qs({ ...p })}`),
  publishArticle: (id: string) =>
    call<ArticleDto>(`/admin/content/articles/${id}/publish`, { method: 'POST' }),
  archiveArticle: (id: string) =>
    call<ArticleDto>(`/admin/content/articles/${id}/archive`, { method: 'POST' }),
  deleteArticle: (id: string) =>
    call<{ deleted: boolean }>(`/admin/content/articles/${id}`, { method: 'DELETE' }),
};
