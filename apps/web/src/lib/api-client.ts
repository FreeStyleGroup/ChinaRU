import type {
  ApiResponse,
  AuthTokens,
  ChangePasswordInput,
  ApplicantDto,
  CreateJobListingInput,
  CreateOrderInput,
  CreateReportInput,
  CreateSellerProfileInput,
  FollowStateDto,
  HoroscopeForecastDto,
  JobApplicationStatus,
  JobListingDto,
  LoginInput,
  MyApplicationDto,
  NotificationDto,
  OrderDto,
  Paginated,
  PostCommentDto,
  PostDto,
  ReferralSummaryDto,
  RegisterInput,
  ReportDto,
  ResumeDto,
  SellerProfileDto,
  CreateTenderInput,
  CreateBidInput,
  ReviewBidInput,
  MyTenderBidDto,
  TenderBidDto,
  TenderDto,
  TenderListQuery,
  AddGarageVehicleInput,
  DealerDto,
  GarageVehicleDto,
  ProductDto,
  VehicleBrandDto,
  VehicleModelDto,
  VehicleType,
  UpdateProfileInput,
  UpsertResumeInput,
  UserDto,
} from '@china-ru/shared';

/** Публичный URL API для запросов из браузера (с httpOnly-cookies). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...init.headers },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) {
    throw new ClientApiError(res.status, json.error.code, json.error.message, json.error.fields);
  }
  return json.data;
}

interface SessionResponse {
  user: UserDto;
  tokens: AuthTokens;
}

export const authClient = {
  register: (input: RegisterInput) =>
    call<SessionResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: LoginInput) =>
    call<SessionResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => call<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => call<UserDto>('/auth/me'),
  /** Смена пароля рвёт сессию на сервере — после успеха требуется повторный вход. */
  changePassword: (input: ChangePasswordInput) =>
    call<{ changed: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export const orderClient = {
  create: (input: CreateOrderInput) =>
    call<OrderDto>('/orders', { method: 'POST', body: JSON.stringify(input) }),
  list: () => call<OrderDto[]>('/orders'),
};

export const accountClient = {
  updateProfile: (input: UpdateProfileInput) =>
    call<UserDto>('/account/profile', { method: 'PATCH', body: JSON.stringify(input) }),
  updateMenu: (sections: string[]) =>
    call<UserDto>('/account/menu', { method: 'PUT', body: JSON.stringify({ sections }) }),
  setNickname: (nickname: string) =>
    call<UserDto>('/account/nickname', { method: 'PUT', body: JSON.stringify({ nickname }) }),
  getSeller: () => call<SellerProfileDto | null>('/account/seller'),
  applySeller: (input: CreateSellerProfileInput) =>
    call<SellerProfileDto>('/account/seller/apply', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  setSellerNickname: (nickname: string) =>
    call<SellerProfileDto>('/account/seller/nickname', {
      method: 'PUT',
      body: JSON.stringify({ nickname }),
    }),
};

export const jobClient = {
  getResume: () => call<ResumeDto | null>('/account/resume'),
  upsertResume: (input: UpsertResumeInput) =>
    call<ResumeDto>('/account/resume', { method: 'PUT', body: JSON.stringify(input) }),
  apply: (vacancyId: string, coverLetter?: string) =>
    call<{ id: string }>(`/jobs/${vacancyId}/apply`, {
      method: 'POST',
      body: JSON.stringify(coverLetter ? { coverLetter } : {}),
    }),
  myApplications: () => call<MyApplicationDto[]>('/account/applications'),
};

export const referralClient = {
  summary: () => call<ReferralSummaryDto>('/account/referral'),
};

export const horoscopeClient = {
  forecast: () => call<HoroscopeForecastDto>('/account/horoscope'),
};

export const socialClient = {
  feed: (page = 1) => call<Paginated<PostDto>>(`/social/feed?page=${page}`),
  followingFeed: (page = 1) => call<Paginated<PostDto>>(`/social/feed/following?page=${page}`),
  createPost: (body: string, asCompany = false) =>
    call<PostDto>('/social/posts', { method: 'POST', body: JSON.stringify({ body, asCompany }) }),
  deletePost: (id: string) => call<{ id: string }>(`/social/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id: string) =>
    call<{ liked: boolean; likeCount: number }>(`/social/posts/${id}/like`, { method: 'POST' }),
  listComments: (id: string, page = 1) =>
    call<Paginated<PostCommentDto>>(`/social/posts/${id}/comments?page=${page}`),
  addComment: (id: string, body: string) =>
    call<PostCommentDto>(`/social/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  followUser: (id: string) =>
    call<FollowStateDto>(`/social/users/${id}/follow`, { method: 'POST' }),
  unfollowUser: (id: string) =>
    call<FollowStateDto>(`/social/users/${id}/follow`, { method: 'DELETE' }),
  followCompany: (id: string) =>
    call<FollowStateDto>(`/social/companies/${id}/follow`, { method: 'POST' }),
  unfollowCompany: (id: string) =>
    call<FollowStateDto>(`/social/companies/${id}/follow`, { method: 'DELETE' }),
  report: (input: CreateReportInput) =>
    call<ReportDto>('/social/reports', { method: 'POST', body: JSON.stringify(input) }),
};

export const notificationClient = {
  list: (page = 1) => call<Paginated<NotificationDto>>(`/account/notifications?page=${page}`),
  unread: () => call<{ unread: number }>('/account/notifications/unread'),
  markRead: (ids?: string[]) =>
    call<{ ok: true }>('/account/notifications/read', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }),
};

function tenderQuery(q: Partial<TenderListQuery> = {}): string {
  const sp = new URLSearchParams();
  if (q.page) sp.set('page', String(q.page));
  if (q.method) sp.set('method', q.method);
  if (q.law) sp.set('law', q.law);
  if (q.status) sp.set('status', q.status);
  if (q.region) sp.set('region', q.region);
  if (q.q) sp.set('q', q.q);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Тендерная площадка: реестр, извещение, заявки и управление жизненным циклом. */
export const tenderClient = {
  list: (q: Partial<TenderListQuery> = {}) =>
    call<Paginated<TenderDto>>(`/tenders${tenderQuery(q)}`),
  get: (id: string) => call<TenderDto>(`/tenders/${id}`),
  create: (input: CreateTenderInput) =>
    call<TenderDto>('/tenders', { method: 'POST', body: JSON.stringify(input) }),
  publish: (id: string) => call<TenderDto>(`/tenders/${id}/publish`, { method: 'POST' }),
  closeBidding: (id: string) => call<TenderDto>(`/tenders/${id}/close`, { method: 'POST' }),
  cancel: (id: string, reason?: string) =>
    call<TenderDto>(`/tenders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  award: (id: string, bidId: string, comment?: string) =>
    call<TenderDto>(`/tenders/${id}/award`, {
      method: 'POST',
      body: JSON.stringify(comment ? { bidId, comment } : { bidId }),
    }),
  complete: (id: string) => call<TenderDto>(`/tenders/${id}/complete`, { method: 'POST' }),
  remove: (id: string) => call<{ id: string }>(`/tenders/${id}`, { method: 'DELETE' }),
  // заявки участника
  submitBid: (tenderId: string, input: CreateBidInput) =>
    call<TenderBidDto>(`/tenders/${tenderId}/bids`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  myBid: (tenderId: string) => call<TenderBidDto | null>(`/tenders/${tenderId}/my-bid`),
  withdrawBid: (bidId: string) =>
    call<TenderBidDto>(`/tender-bids/${bidId}/withdraw`, { method: 'POST' }),
  // рассмотрение (заказчик)
  listBids: (tenderId: string) => call<TenderBidDto[]>(`/tenders/${tenderId}/bids`),
  reviewBid: (bidId: string, input: ReviewBidInput) =>
    call<TenderBidDto>(`/tender-bids/${bidId}/review`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  // кабинет
  myTenders: (page = 1) => call<Paginated<TenderDto>>(`/account/tenders?page=${page}`),
  myBids: (page = 1) => call<Paginated<MyTenderBidDto>>(`/account/tender-bids?page=${page}`),
};

/** Авто-раздел: бренды/модели/дилеры (публично). */
export const vehicleClient = {
  brands: (q: { type?: VehicleType; popular?: boolean } = {}) => {
    const sp = new URLSearchParams();
    if (q.type) sp.set('type', q.type);
    if (q.popular !== undefined) sp.set('popular', String(q.popular));
    const s = sp.toString();
    return call<VehicleBrandDto[]>(`/auto/brands${s ? `?${s}` : ''}`);
  },
  models: (brandId: string) => call<VehicleModelDto[]>(`/auto/brands/${brandId}/models`),
  dealers: (q: { city?: string; brands?: string[] } = {}) => {
    const sp = new URLSearchParams();
    if (q.city) sp.set('city', q.city);
    if (q.brands && q.brands.length > 0) sp.set('brands', q.brands.join(','));
    const s = sp.toString();
    return call<DealerDto[]>(`/auto/dealers${s ? `?${s}` : ''}`);
  },
  dealerCities: () => call<string[]>('/auto/dealers/cities'),
};

/** Мой гараж (авторизованный): транспорт пользователя + подбор запчастей. */
export const garageClient = {
  list: () => call<GarageVehicleDto[]>('/account/garage'),
  add: (input: AddGarageVehicleInput) =>
    call<GarageVehicleDto>('/account/garage', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => call<{ id: string }>(`/account/garage/${id}`, { method: 'DELETE' }),
  parts: (id: string) => call<ProductDto[]>(`/account/garage/${id}/parts`),
};

export const sellerJobClient = {
  myVacancies: () => call<JobListingDto[]>('/seller/vacancies'),
  createVacancy: (input: CreateJobListingInput) =>
    call<JobListingDto>('/seller/vacancies', { method: 'POST', body: JSON.stringify(input) }),
  applicants: (vacancyId: string) =>
    call<ApplicantDto[]>(`/seller/vacancies/${vacancyId}/applicants`),
  setApplicationStatus: (applicationId: string, status: JobApplicationStatus) =>
    call<{ id: string; status: string }>(`/seller/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};
