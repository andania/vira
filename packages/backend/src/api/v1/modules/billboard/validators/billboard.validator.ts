/**
 * Billboard Validators
 * Zod validation schemas for main billboard operations
 */

import { z } from 'zod';

// Billboard section enum
export const BillboardSectionEnum = z.enum([
  'trending',
  'live',
  'just-launched',
  'top-earning',
  'near-you',
  'categories',
  'recommended'
]);

// Get billboard validation
export const getBillboardValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    lat: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    lng: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    radius: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get section validation
export const getSectionValidator = z.object({
  params: z.object({
    sectionId: BillboardSectionEnum,
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    lat: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    lng: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    radius: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get billboard stats validation
export const getBillboardStatsValidator = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Track interaction validation
export const trackInteractionValidator = z.object({
  body: z.object({
    itemId: z.string().uuid(),
    itemType: z.enum(['ad', 'room', 'campaign', 'product', 'brand']),
    action: z.enum(['view', 'click', 'engage']),
  }),
});

// Get recommendations validation
export const getRecommendationsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    exclude: z.string().optional(),
    lat: z.string().regex(/^-?\d*\.?\d+$/).optional(),
    lng: z.string().regex(/^-?\d*\.?\d+$/).optional(),
  }),
});

// Get recommendation explanation validation
export const getRecommendationExplanationValidator = z.object({
  params: z.object({
    itemId: z.string().uuid(),
    itemType: z.enum(['ad', 'room', 'campaign', 'product']),
  }),
});

// Refresh recommendations validation
export const refreshRecommendationsValidator = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
  }),
});