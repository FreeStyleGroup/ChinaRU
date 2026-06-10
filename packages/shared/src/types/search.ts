import type { Currency, Locale } from './common';

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sellerId?: string;
  brands?: string[];
  inStock?: boolean;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'new' | 'popular';
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  type: 'product' | 'seller' | 'collection';
  title: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: Currency;
  rating?: number;
  url: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  took: number;
  facets?: Record<string, { name: string; count: number }[]>;
}

export interface SearchQueryLogDto {
  id: string;
  query: string;
  locale: Locale;
  resultsCount: number;
  clickedResultId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}

export interface AutocompleteRequest {
  query: string;
  limit?: number;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'product' | 'category' | 'brand' | 'seller';
  image?: string;
  meta?: Record<string, any>;
}

export interface SearchFacet {
  field: string;
  values: {
    name: string;
    count: number;
    selected?: boolean;
  }[];
}
