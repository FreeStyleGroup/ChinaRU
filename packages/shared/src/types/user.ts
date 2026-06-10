import type { Address, Currency, Locale } from './common';

export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  locale: Locale;
  timezone?: string;
  bio?: string;
  preferredCurrency: Currency;
  address?: Address;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  preferredCurrency?: Currency;
  timezone?: string;
  address?: Address;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserPreferencesDto {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  locale: Locale;
  currency: Currency;
}

export interface UpdatePreferencesRequest {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
  locale?: Locale;
  currency?: Currency;
}

export interface UserDocumentDto {
  id: string;
  type: 'passport' | 'visa' | 'driving_license' | 'id_card';
  number: string;
  issuedAt: string;
  expiresAt?: string;
  fileUrl: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface FavoriteDto {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

export interface DeviceRegistrationRequest {
  platform: 'ios' | 'android';
  token: string;
  userAgent?: string;
}
