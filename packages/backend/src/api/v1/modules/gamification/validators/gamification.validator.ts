/**
 * Gamification Validators
 * Zod validation schemas for gamification operations
 */

import { z } from 'zod';

// Event type enum
export const EventTypeEnum = z.enum([
  'earn',
  'engage',
  'share',
  'comment',
  'suggest',
  'purchase',
  'login',
  'referral'
]);

// Process event validation
export const processEventValidator = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    type: EventTypeEnum,
    value: z.number().positive().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// Get user profile validation
export const getUserProfileValidator = z.object({});

// Get gamification stats validation (admin)
export const getGamificationStatsValidator = z.object({});

// Get available badges validation
export const getAvailableBadgesValidator = z.object({});

// Initialize user validation (admin)
export const initializeUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});