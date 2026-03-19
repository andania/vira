/**
 * Moderation Validators
 * Zod validation schemas for moderation operations
 */

import { z } from 'zod';

// Moderate user validation
export const moderateUserValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    targetUserId: z.string().uuid('Invalid user ID format'),
    actionType: z.enum(['warning', 'mute', 'kick', 'ban', 'unmute', 'unban']),
    duration: z.number().positive().optional(),
    reason: z.string().min(1).max(500),
  }),
});

// Remove moderation validation
export const removeModerationValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
    actionId: z.string().uuid('Invalid action ID format'),
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

// Report room validation
export const reportRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    reportType: z.enum(['inappropriate', 'harassment', 'fake', 'scam', 'other']),
    description: z.string().max(1000).optional(),
    evidenceUrls: z.array(z.string().url()).optional(),
  }),
});

// Report message validation
export const reportMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z.object({
    reportType: z.enum(['spam', 'harassment', 'hate_speech', 'inappropriate']),
    description: z.string().max(1000).optional(),
  }),
});

// Get moderation queue validation (admin)
export const getModerationQueueValidator = z.object({
  query: z.object({
    type: z.enum(['all', 'rooms', 'messages', 'users']).default('all'),
    status: z.enum(['pending', 'investigating', 'resolved']).default('pending'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Resolve report validation (admin)
export const resolveReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
  body: z.object({
    resolution: z.string().min(1).max(500),
    action: z.enum(['warning', 'mute', 'ban', 'dismiss']).optional(),
  }),
});

// Set moderation settings validation
export const setModerationSettingsValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    settings: z.object({
      autoModerate: z.boolean().optional(),
      profanityFilter: z.boolean().optional(),
      spamFilter: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      maxWarnings: z.number().positive().optional(),
      autoBanThreshold: z.number().positive().optional(),
    }),
  }),
});