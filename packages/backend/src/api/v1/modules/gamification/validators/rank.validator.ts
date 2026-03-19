/**
 * Rank Validators
 * Zod validation schemas for rank operations
 */

import { z } from 'zod';

// Get user rank validation
export const getUserRankValidator = z.object({});

// Get leaderboard validation
export const getLeaderboardValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get rank stats validation
export const getRankStatsValidator = z.object({});