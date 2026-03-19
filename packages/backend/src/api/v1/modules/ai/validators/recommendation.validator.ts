/**
 * Recommendation Validators
 * Zod validation schemas for recommendation operations
 */

import { z } from 'zod';

// Content type enum
export const ContentTypeEnum = z.enum([
  'ads',
  'rooms',
  'campaigns',
  'products',
  'all'
]);

// Get recommendations validation
export const getRecommendationsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    type: ContentTypeEnum.optional(),
    exclude: z.string().optional(),
    lat: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    lng: z.string().regex(/^-?\d*\.?\d+$/).optional(),
  }),
});

// Get recommendation explanation validation
export const getExplanationValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID format'),
    itemType: z.enum(['ad', 'room', 'campaign', 'product']),
  }),
});

// Refresh cache validation
export const refreshCacheValidator = z.object({});