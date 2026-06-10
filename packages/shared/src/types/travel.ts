import type { Currency } from './common';

export interface TravelDestinationDto {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  country: string;
  description?: string;
  imageUrl?: string;
  temperature?: {
    min: number;
    max: number;
  };
  bestMonths?: string[];
  attractions?: string[];
  createdAt: string;
}

export interface TravelPackageDto {
  id: string;
  destinationId: string;
  titleRu: string;
  titleEn: string;
  titleZh: string;
  description?: string;
  price: number;
  currency: Currency;
  duration: number;
  status: 'active' | 'inactive' | 'sold_out';
  inclusions?: string[];
  exclusions?: string[];
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateTravelBookingRequest {
  packageId: string;
  startDate: string;
  endDate: string;
  passengers: {
    name: string;
    email: string;
    phone?: string;
  }[];
  specialRequests?: string;
}

export interface TravelBookingDto {
  id: string;
  publicId: string;
  packageId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  startDate: string;
  endDate: string;
  passengers: {
    name: string;
    email: string;
    phone?: string;
  }[];
  totalPrice: number;
  currency: Currency;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TravelReviewDto {
  id: string;
  packageId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  images?: string[];
  createdAt: string;
}
