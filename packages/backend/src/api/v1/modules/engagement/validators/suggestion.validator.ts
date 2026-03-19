/**
 * Suggestion Validators
 * Zod validation schemas for suggestion operations
 */

import { z } from 'zod';

// Target type enum for suggestions
export const SuggestionTargetTypeEnum = z.enum([
  'ad',
  'room',
  'campaign',
  'brand'
]);

// Category enum
export const SuggestionCategoryEnum = z.enum([
  'improvement',
  'bug',
  'feature',
  'content',
  'other'
]);

// Status enum
export const SuggestionStatusEnum = z.enum([
  'pending',
  'reviewed',
  'accepted',
  'rejected',
  'implemented'
]);

// Create suggestion validation
export const createSuggestionValidator = z.object({
  body: z.object({
    targetType: SuggestionTargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    content: z.string().min(10, 'Content must be at least 10 characters').max(5000),
    category: SuggestionCategoryEnum,
  }),
});

// Get suggestions validation
export const getSuggestionsValidator = z.object({
  params: z.object({
    targetType: SuggestionTargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
  }),
  query: z.object({
    status: SuggestionStatusEnum.optional(),
    category: SuggestionCategoryEnum.optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['recent', 'popular', 'status']).optional(),
  }),
});

// Get suggestion validation
export const getSuggestionValidator = z.object({
  params: z.object({
    suggestionId: z.string().uuid('Invalid suggestion ID format'),
  }),
});

// Update suggestion status validation
export const updateSuggestionStatusValidator = z.object({
  params: z.object({
    suggestionId: z.string().uuid('Invalid suggestion ID format'),
  }),
  body: z.object({
    status: SuggestionStatusEnum,
    feedback: z.string().max(1000).optional(),
  }),
});

// Vote on suggestion validation
export const voteSuggestionValidator = z.object({
  params: z.object({
    suggestionId: z.string().uuid('Invalid suggestion ID format'),
  }),
  body: z.object({
    vote: z.enum(['up', 'down']),
  }),
});

// Add comment to suggestion validation
export const addSuggestionCommentValidator = z.object({
  params: z.object({
    suggestionId: z.string().uuid('Invalid suggestion ID format'),
  }),
  body: z.object({
    content: z.string().min(1).max(1000),
  }),
});

// Get suggestion stats validation
export const getSuggestionStatsValidator = z.object({
  params: z.object({
    targetType: SuggestionTargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
  }),
});