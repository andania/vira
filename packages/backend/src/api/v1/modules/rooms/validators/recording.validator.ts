/**
 * Recording Validators
 * Zod validation schemas for recording operations
 */

import { z } from 'zod';

// Start recording validation
export const startRecordingValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    quality: z.enum(['low', 'medium', 'high']).optional(),
    recordAudio: z.boolean().default(true),
    recordVideo: z.boolean().default(true),
    recordScreen: z.boolean().default(false),
  }),
});

// Stop recording validation
export const stopRecordingValidator = z.object({
  params: z.object({
    recordingId: z.string().uuid('Invalid recording ID format'),
  }),
});

// Get recording validation
export const getRecordingValidator = z.object({
  params: z.object({
    recordingId: z.string().uuid('Invalid recording ID format'),
  }),
});

// Get room recordings validation
export const getRoomRecordingsValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Delete recording validation
export const deleteRecordingValidator = z.object({
  params: z.object({
    recordingId: z.string().uuid('Invalid recording ID format'),
  }),
});

// Get recording statistics validation
export const getRecordingStatsValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Increment views validation
export const incrementViewsValidator = z.object({
  params: z.object({
    recordingId: z.string().uuid('Invalid recording ID format'),
  }),
});