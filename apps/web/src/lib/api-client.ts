import type {
  ApiResponse,
  AuthTokens,
  ChangePasswordInput,
  CreateOrderInput,
  CreateSellerProfileInput,
  LoginInput,
  OrderDto,
  ReferralSummaryDto,
  RegisterInput,
  ResumeDto,
  SellerProfileDto,
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
};

export const referralClient = {
  summary: () => call<ReferralSummaryDto>('/account/referral'),
};
