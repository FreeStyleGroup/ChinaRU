export type UserRole = 'buyer' | 'seller' | 'admin';
export type UserStatus = 'active' | 'banned' | 'pending_verify';
export type OAuthProvider = 'google' | 'yandex' | 'vk' | 'wechat';

export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'buyer' | 'seller';
  locale?: string;
}

export interface RegisterResponse {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface OAuthCallbackRequest {
  provider: OAuthProvider;
  code: string;
  redirectUri: string;
}

export interface SocialAccountDto {
  provider: OAuthProvider;
  providerUserId: string;
  linkedAt: string;
}
