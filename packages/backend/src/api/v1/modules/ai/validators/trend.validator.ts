/**
 * Trend Validators
 * Zod validation schemas for trend operations
 */

import { z } from 'zod';

// Get trending items validation
export const getTrendingItemsValidator = z.object({
  query: z.object({
    type: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get predictions validation
export const getPredictionsValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID format'),
    itemType: z.enum(['ad', 'room', 'product']),
  }),
});

// Get trend categories validation
export const getTrendCategoriesValidator = z.object({});

// Get trend insights validation
export const getTrendInsightsValidator = z.object({});