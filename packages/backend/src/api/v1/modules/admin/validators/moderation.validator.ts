/**
 * Moderation Validators
 * Zod validation schemas for moderation operations
 */

import { z } from 'zod';

// Get moderation queue validation
export const getModerationQueueValidator = z.object({
  query: z.object({
    type: z.enum(['all', 'rooms', 'messages', 'users']).default('all'),
    status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']).default('pending'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get report details validation
export const getReportDetailsValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
});

// Resolve report validation
export const resolveReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
  body: z.object({
    resolution: z.string().min(1).max(1000),
    action: z.enum(['warning', 'mute', 'suspend', 'ban', 'content_removal']).optional(),
  }),
});

// Dismiss report validation
export const dismissReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
  body: z.object({
    reason: z.string().min(1).max(500),
  }),
});

// Take moderation action validation
export const takeActionValidator = z.object({
  body: z.object({
    targetUserId: z.string().uuid('Invalid user ID format'),
    actionType: z.enum(['warning', 'mute', 'suspend', 'ban']),
    duration: z.number().positive().optional(),
    reason: z.string().min(1).max(500),
  }),
});

// Remove moderation action validation
export const removeActionValidator = z.object({
  params: z.object({
    actionId: z.string().uuid('Invalid action ID format'),
  }),
});

// Get moderation stats validation
export const getModerationStatsValidator = z.object({});

// Moderate content validation
export const moderateContentValidator = z.object({
  body: z.object({
    content: z.string().min(1),
    type: z.enum(['comment', 'message', 'description']),
  }),
});

// Get user moderation history validation
export const getUserModerationHistoryValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get room moderation history validation
export const getRoomModerationHistoryValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});