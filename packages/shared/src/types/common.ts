export type Locale = 'ru' | 'en' | 'zh';
export type Currency = 'rub' | 'cny' | 'usd' | 'eur';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FileUpload {
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Address {
  country: string;
  province?: string;
  city: string;
  district?: string;
  street: string;
  postalCode?: string;
}
