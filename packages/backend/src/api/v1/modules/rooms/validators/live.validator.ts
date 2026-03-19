/**
 * Live Streaming Validators
 * Zod validation schemas for live streaming operations
 */

import { z } from 'zod';

// Start live validation
export const startLiveValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    videoQuality: z.enum(['low', 'medium', 'high']).optional(),
    audioQuality: z.enum(['low', 'medium', 'high']).optional(),
    maxBitrate: z.number().positive().optional(),
    title: z.string().max(100).optional(),
  }),
});

// Stop live validation
export const stopLiveValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Get live status validation
export const getLiveStatusValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Get viewer count validation
export const getViewerCountValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Generate viewer token validation
export const generateViewerTokenValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Validate viewer token validation
export const validateViewerTokenValidator = z.object({
  params: z.object({
    token: z.string(),
  }),
});

// Update stream quality validation
export const updateStreamQualityValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    quality: z.enum(['low', 'medium', 'high']),
  }),
});

// Get stream statistics validation
export const getStreamStatisticsValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Send stream event validation
export const sendStreamEventValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    eventType: z.enum(['like', 'reaction', 'comment', 'share']),
    data: z.record(z.any()).optional(),
  }),
});

// Get stream health validation
export const getStreamHealthValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Toggle mute validation
export const toggleMuteValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    muted: z.boolean(),
  }),
});