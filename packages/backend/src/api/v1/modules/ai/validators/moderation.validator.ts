/**
 * Content Moderation Validators
 * Zod validation schemas for moderation operations
 */

import { z } from 'zod';

// Moderate text validation
export const moderateTextValidator = z.object({
  body: z.object({
    content: z.string().min(1).max(10000),
  }),
});

// Moderate image validation
export const moderateImageValidator = z.object({
  body: z.object({
    imageUrl: z.string().url(),
  }),
});

// Get moderation stats validation
export const getModerationStatsValidator = z.object({});

// Get moderation rules validation
export const getModerationRulesValidator = z.object({});

// Update moderation rules validation (admin)
export const updateModerationRulesValidator = z.object({
  body: z.object({
    rules: z.record(z.any()),
  }),
});