/**
 * Comment Validators
 * Zod validation schemas for comment operations
 */

import { z } from 'zod';

// Target type enum for comments
export const CommentTargetTypeEnum = z.enum([
  'ad',
  'room',
  'campaign',
  'product'
]);

// Create comment validation
export const createCommentValidator = z.object({
  body: z.object({
    targetType: CommentTargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
    content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
    parentId: z.string().uuid().optional(),
  }),
});

// Get comments validation
export const getCommentsValidator = z.object({
  params: z.object({
    targetType: CommentTargetTypeEnum,
    targetId: z.string().uuid('Invalid target ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['recent', 'popular']).optional(),
    parentId: z.string().optional(),
  }),
});

// Get comment validation
export const getCommentValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
});

// Update comment validation
export const updateCommentValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
  body: z.object({
    content: z.string().min(1).max(1000),
  }),
});

// Delete comment validation
export const deleteCommentValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
});

// Toggle comment like validation
export const toggleCommentLikeValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
});

// Report comment validation
export const reportCommentValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
  body: z.object({
    reason: z.enum(['spam', 'harassment', 'hate_speech', 'inappropriate', 'other']),
    description: z.string().max(1000).optional(),
  }),
});

// Get comment replies validation
export const getCommentRepliesValidator = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});