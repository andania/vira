/**
 * Leaderboard Validators
 * Zod validation schemas for leaderboard operations
 */

import { z } from 'zod';

// Leaderboard type enum
export const LeaderboardTypeEnum = z.enum([
  'global',
  'weekly',
  'monthly',
  'brand',
  'category'
]);

// Leaderboard period enum
export const LeaderboardPeriodEnum = z.enum([
  'daily',
  'weekly',
  'monthly',
  'allTime'
]);

// Get leaderboard validation
export const getLeaderboardValidator = z.object({
  query: z.object({
    type: LeaderboardTypeEnum.default('global'),
    period: LeaderboardPeriodEnum.default('allTime'),
    brandId: z.string().uuid().optional(),
    category: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get global leaderboard validation
export const getGlobalLeaderboardValidator = z.object({
  query: z.object({
    period: LeaderboardPeriodEnum.default('allTime'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get weekly leaderboard validation
export const getWeeklyLeaderboardValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get monthly leaderboard validation
export const getMonthlyLeaderboardValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get brand leaderboard validation
export const getBrandLeaderboardValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    period: LeaderboardPeriodEnum.default('allTime'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get category leaderboard validation
export const getCategoryLeaderboardValidator = z.object({
  params: z.object({
    category: z.string().min(1).max(50),
  }),
  query: z.object({
    period: LeaderboardPeriodEnum.default('allTime'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get user rank validation
export const getUserRankValidator = z.object({
  query: z.object({
    type: LeaderboardTypeEnum.default('global'),
  }),
});

// Get leaderboard stats validation
export const getLeaderboardStatsValidator = z.object({});

// Clear cache validation (admin)
export const clearLeaderboardCacheValidator = z.object({});