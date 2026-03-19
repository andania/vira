/**
 * Discovery Validators
 * Zod validation schemas for search and discovery operations
 */

import { z } from 'zod';

// Search type enum
export const SearchTypeEnum = z.enum([
  'ad',
  'room',
  'campaign',
  'brand',
  'product'
]);

// Sort by enum
export const SortByEnum = z.enum([
  'relevance',
  'date',
  'popularity',
  'reward'
]);

// Search validation
export const searchValidator = z.object({
  query: z.object({
    q: z.string().min(1).max(100),
    type: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: SortByEnum.optional(),
  }),
});

// Get suggestions validation
export const getSuggestionsValidator = z.object({
  query: z.object({
    q: z.string().min(1).max(50),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get trending searches validation
export const getTrendingSearchesValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get categories validation
export const getCategoriesValidator = z.object({
  query: z.object({
    type: z.string().optional(),
  }),
});

// Filter validation
export const filterValidator = z.object({
  body: z.object({
    type: z.string().optional(),
    category: z.string().optional(),
    minReward: z.number().positive().optional(),
    maxReward: z.number().positive().optional(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number().positive().optional(),
    }).optional(),
    status: z.string().optional(),
    limit: z.number().positive().default(20),
    offset: z.number().min(0).default(0),
  }),
});

// Get content by ID validation
export const getContentByIdValidator = z.object({
  params: z.object({
    type: z.enum(['ad', 'room', 'campaign', 'product']),
    id: z.string().uuid(),
  }),
});

// Get similar content validation
export const getSimilarValidator = z.object({
  params: z.object({
    type: z.enum(['ad', 'room', 'campaign', 'product']),
    id: z.string().uuid(),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});