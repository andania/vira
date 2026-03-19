/**
 * Personalization Validators
 * Zod validation schemas for personalization operations
 */

import { z } from 'zod';

// Get personalization validation
export const getPersonalizationValidator = z.object({});

// Get user segments validation
export const getUserSegmentsValidator = z.object({});

// Get personalized notifications validation
export const getPersonalizedNotificationsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Update personalization validation
export const updatePersonalizationValidator = z.object({
  body: z.object({
    type: z.string(),
    targetType: z.string(),
    targetId: z.string().uuid(),
  }),
});