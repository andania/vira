/**
 * Central type exports for VIRAZ platform
 */

// Re-export all types for convenience
export * from './user.types';
export * from './campaign.types';
export * from './cap.types';
export * from './room.types';
export * from './notification.types';
export * from './marketplace.types';
export * from './api.types';

// Common type utilities
export type UUID = string;
export type DateTime = string | Date;
export type Email = string;
export type PhoneNumber = string;
export type URL = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path?: string;
    duration?: number;
  };
}