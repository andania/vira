/**
 * Billboard API Service
 */

import { ApiClient } from './client';

export interface FeedItem {
  id: string;
  type: 'ad' | 'room' | 'campaign' | 'product' | 'brand';
  title: string;
  description?: string;
  image?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  reward?: {
    action: string;
    amount: number;
  };
  metadata: Record<string, any>;
  score: number;
  createdAt: string;
}

export interface BillboardSection {
  id: string;
  name: string;
  description: string;
  items: any[];
  layout: 'grid' | 'list' | 'carousel' | 'hero';
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  image?: string;
  url: string;
  metadata: Record<string, any>;
  score: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: string;
  image?: string;
}

export const billboardApi = {
  /**
   * Get main feed
   */
  getFeed: (page: number = 1, limit: number = 20, type?: string, categories?: string[], location?: any) =>
    ApiClient.get<{ items: FeedItem[]; pagination: any }>('/api/v1/billboard/feed', {
      params: { page, limit, type, categories: categories?.join(','), ...location },
    }),

  /**
   * Get trending feed
   */
  getTrending: (limit: number = 20) =>
    ApiClient.get<FeedItem[]>('/api/v1/billboard/feed/trending', { params: { limit } }),

  /**
   * Get recommended feed
   */
  getRecommended: (limit: number = 20) =>
    ApiClient.get<FeedItem[]>('/api/v1/billboard/feed/recommended', { params: { limit } }),

  /**
   * Get nearby feed
   */
  getNearby: (lat: number, lng: number, radius?: number, limit: number = 20) =>
    ApiClient.get<FeedItem[]>('/api/v1/billboard/feed/nearby', {
      params: { lat, lng, radius, limit },
    }),

  /**
   * Get billboard sections
   */
  getBillboard: (limit?: number, location?: any) =>
    ApiClient.get<{ greeting: string; sections: BillboardSection[] }>('/api/v1/billboard', {
      params: { limit, ...location },
    }),

  /**
   * Get single section
   */
  getSection: (sectionId: string, limit?: number, location?: any) =>
    ApiClient.get<BillboardSection>(`/api/v1/billboard/sections/${sectionId}`, {
      params: { limit, ...location },
    }),

  /**
   * Search
   */
  search: (query: string, type?: string, category?: string, page: number = 1, limit: number = 20, sortBy?: string) =>
    ApiClient.get<{ results: SearchResult[]; total: number }>('/api/v1/billboard/search', {
      params: { q: query, type, category, page, limit, sortBy },
    }),

  /**
   * Get search suggestions
   */
  getSuggestions: (query: string, limit: number = 5) =>
    ApiClient.get<{
      brands: SearchSuggestion[];
      campaigns: SearchSuggestion[];
      products: SearchSuggestion[];
    }>('/api/v1/billboard/search/suggestions', { params: { q: query, limit } }),

  /**
   * Get trending searches
   */
  getTrendingSearches: (limit: number = 10) =>
    ApiClient.get<Array<{ query: string; count: number }>>('/api/v1/billboard/search/trending', {
      params: { limit },
    }),

  /**
   * Get categories
   */
  getCategories: () =>
    ApiClient.get<any>('/api/v1/billboard/categories'),

  /**
   * Filter content
   */
  filter: (filters: any) =>
    ApiClient.post<{ results: SearchResult[]; total: number }>('/api/v1/billboard/filter', filters),

  /**
   * Get content by ID
   */
  getContentById: (type: string, id: string) =>
    ApiClient.get<any>(`/api/v1/billboard/content/${type}/${id}`),

  /**
   * Get similar content
   */
  getSimilar: (type: string, id: string, limit: number = 10) =>
    ApiClient.get<SearchResult[]>(`/api/v1/billboard/content/${type}/${id}/similar`, {
      params: { limit },
    }),

  /**
   * Track interaction
   */
  trackInteraction: (itemId: string, itemType: string, action: string) =>
    ApiClient.post('/api/v1/billboard/track', { itemId, itemType, action }),

  /**
   * Get recommendations
   */
  getRecommendations: (limit: number = 20, exclude?: string[], location?: any) =>
    ApiClient.get<FeedItem[]>('/api/v1/billboard/recommendations', {
      params: { limit, exclude: exclude?.join(','), ...location },
    }),

  /**
   * Get recommendation explanation
   */
  getRecommendationExplanation: (itemId: string, itemType: string) =>
    ApiClient.get<{ reasons: string[] }>(`/api/v1/billboard/recommendations/${itemType}/${itemId}/explain`),

  /**
   * Refresh recommendations
   */
  refreshRecommendations: () =>
    ApiClient.post('/api/v1/billboard/recommendations/refresh', {}),

  /**
   * Get billboard stats
   */
  getBillboardStats: () =>
    ApiClient.get('/api/v1/billboard/stats'),
};

export default billboardApi;