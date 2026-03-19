/**
 * Room Validators
 * Zod validation schemas for room operations
 */

import { z } from 'zod';

// Room type enum
export const RoomTypeEnum = z.enum([
  'live_demo',
  'product_showcase',
  'campaign',
  'community',
  'event'
]);

// Room status enum
export const RoomStatusEnum = z.enum([
  'draft',
  'scheduled',
  'live',
  'ended',
  'cancelled',
  'archived'
]);

// Room visibility enum
export const RoomVisibilityEnum = z.enum([
  'public',
  'unlisted',
  'private'
]);

// Room settings schema
const roomSettingsSchema = z.object({
  allowChat: z.boolean().default(true),
  allowReactions: z.boolean().default(true),
  allowPolls: z.boolean().default(true),
  allowScreenShare: z.boolean().default(false),
  allowRecording: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  muteOnEntry: z.boolean().default(false),
  chatDelay: z.number().min(0).max(60).optional(),
  reactionCooldown: z.number().min(0).max(30).optional(),
  hostControls: z.object({
    canMuteAll: z.boolean().default(true),
    canRemoveParticipants: z.boolean().default(true),
    canEndRoom: z.boolean().default(true),
  }).default({}),
  streaming: z.object({
    videoQuality: z.enum(['auto', 'low', 'medium', 'high']).default('auto'),
    audioQuality: z.enum(['low', 'medium', 'high']).default('medium'),
    maxBitrate: z.number().positive().optional(),
    recordingFormat: z.enum(['mp4', 'webm']).optional(),
  }).default({}),
}).partial();

// Create room validation
export const createRoomValidator = z.object({
  body: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    name: z.string().min(3, 'Room name must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    roomType: RoomTypeEnum,
    visibility: RoomVisibilityEnum.default('public'),
    maxParticipants: z.number().positive().max(10000).optional(),
    scheduledStart: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    scheduledEnd: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    settings: roomSettingsSchema.optional(),
  }).refine(data => {
    if (data.scheduledStart && data.scheduledEnd) {
      return data.scheduledEnd > data.scheduledStart;
    }
    return true;
  }, {
    message: 'End time must be after start time',
    path: ['scheduledEnd'],
  }),
});

// Update room validation
export const updateRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    visibility: RoomVisibilityEnum.optional(),
    maxParticipants: z.number().positive().max(10000).optional(),
    scheduledStart: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    scheduledEnd: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    settings: roomSettingsSchema.optional(),
    status: RoomStatusEnum.optional(),
  }),
});

// Get room by ID validation
export const getRoomByIdValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Delete room validation
export const deleteRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Start room validation
export const startRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// End room validation
export const endRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Join room validation
export const joinRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    metadata: z.object({
      device: z.string().optional(),
      platform: z.string().optional(),
    }).optional(),
  }),
});

// Leave room validation
export const leaveRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Get rooms by brand validation
export const getRoomsByBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    status: z.string().optional(),
    roomType: z.string().optional(),
    visibility: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get live rooms validation
export const getLiveRoomsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get upcoming rooms validation
export const getUpcomingRoomsValidator = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get participants validation
export const getParticipantsValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});