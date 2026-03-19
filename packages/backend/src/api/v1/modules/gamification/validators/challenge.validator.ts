/**
 * Challenge Validators
 * Zod validation schemas for challenge operations
 */

import { z } from 'zod';

// Challenge type enum
export const ChallengeTypeEnum = z.enum([
  'daily',
  'weekly',
  'special'
]);

// Get active challenges validation
export const getActiveChallengesValidator = z.object({});

// Get user challenges validation
export const getUserChallengesValidator = z.object({});

// Get challenge validation
export const getChallengeValidator = z.object({
  params: z.object({
    challengeId: z.string().uuid('Invalid challenge ID format'),
  }),
});

// Claim challenge reward validation
export const claimChallengeRewardValidator = z.object({
  params: z.object({
    challengeId: z.string().uuid('Invalid challenge ID format'),
  }),
});

// Get challenge stats validation
export const getChallengeStatsValidator = z.object({});

// Get challenge leaderboard validation
export const getChallengeLeaderboardValidator = z.object({
  params: z.object({
    challengeId: z.string().uuid('Invalid challenge ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Create weekly challenges validation (admin)
export const createWeeklyChallengesValidator = z.object({});

// Update challenge progress validation (internal)
export const updateChallengeProgressValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    action: z.string(),
    value: z.number().positive().default(1),
  }),
});