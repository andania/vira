/**
 * Achievement Validators
 * Zod validation schemas for achievement operations
 */

import { z } from 'zod';

// Get user achievements validation
export const getUserAchievementsValidator = z.object({});

// Get all achievements validation
export const getAllAchievementsValidator = z.object({});

// Get achievement progress validation
export const getAchievementProgressValidator = z.object({
  params: z.object({
    achievementId: z.string().uuid('Invalid achievement ID format'),
  }),
});

// Claim achievement reward validation
export const claimAchievementRewardValidator = z.object({
  params: z.object({
    achievementId: z.string().uuid('Invalid achievement ID format'),
  }),
});

// Get achievement stats validation
export const getAchievementStatsValidator = z.object({});

// Get top achievers validation
export const getTopAchieversValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});