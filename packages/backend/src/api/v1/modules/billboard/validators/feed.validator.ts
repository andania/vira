/**
 * Feed Validators
 * Zod validation schemas for feed operations
 */

import { z } from 'zod';

// Feed type enum
export const FeedTypeEnum = z.enum([
  'all',
  'trending',
  'recommended',
  'nearby'
]);

// Get feed validation
export const getFeedValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    type: FeedTypeEnum.optional(),
    categories: z.string().optional(),
    lat: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    lng: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    radius: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get trending validation
export const getTrendingValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get recommended validation
export const getRecommendedValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get nearby validation
export const getNearbyValidator = z.object({
  query: z.object({
    lat: z.string().regex(/^-?\d*\.?\d+$/),
    lng: z.string().regex(/^-?\d*\.?\d+$/),
    radius: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get by category validation
export const getByCategoryValidator = z.object({
  params: z.object({
    category: z.string().min(1).max(50),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Refresh feed validation
export const refreshFeedValidator = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
  }),
});