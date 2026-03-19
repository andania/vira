/**
 * AI Validators
 * Zod validation schemas for AI operations
 */

import { z } from 'zod';

// AI request type enum
export const AIRequestTypeEnum = z.enum([
  'recommendation',
  'personalization',
  'trend',
  'fraud',
  'moderation'
]);

// Process AI request validation
export const processAIRequestValidator = z.object({
  body: z.object({
    type: AIRequestTypeEnum,
    data: z.record(z.any()),
  }),
});

// Get usage stats validation (admin)
export const getUsageStatsValidator = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get AI health validation
export const getAIHealthValidator = z.object({});

// Clear cache validation (admin)
export const clearCacheValidator = z.object({
  body: z.object({
    type: z.string().optional(),
  }),
});

// Train models validation (admin)
export const trainModelsValidator = z.object({
  body: z.object({
    models: z.array(z.enum(['recommendation', 'fraud', 'moderation'])),
  }),
});

// Get AI features validation
export const getAIFeaturesValidator = z.object({});

// Get model performance validation (admin)
export const getModelPerformanceValidator = z.object({});

// Test AI validation (development)
export const testAIValidator = z.object({
  body: z.object({
    type: z.string(),
    input: z.any().optional(),
  }),
});