/**
 * Engagement Validators
 * Zod validation schemas for engagement operations
 */

import { z } from 'zod';

// Target type enum
export const TargetTypeEnum = z.enum([
  'ad',
  'room',
  'campaign',
  'product',
  'comment',
  'brand'
]);

// Action type enum
export const ActionTypeEnum = z.enum([
  'like',
  'comment',
  'share',
  'click',
  'view',
  'save',
  'report'
]);

// Process engagement validation
export const processEngagementValidator = z.object({
  body: z.object({
    targetType: TargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
    action: ActionTypeEnum,
    metadata: z.record(z.any()).optional(),
  }),
});

// Get engagement counts validation
export const getEngagementCountsValidator = z.object({
  params: z.object({
    targetType: TargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
  }),
});

// Get user engagement validation
export const getUserEngagementValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get reward weights validation
export const getRewardWeightsValidator = z.object({});

// Get user reward stats validation
export const getUserRewardStatsValidator = z.object({});

// Get top earners validation
export const getTopEarnersValidator = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'allTime']).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});