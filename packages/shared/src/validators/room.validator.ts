/**
 * Room and live streaming validators using Zod
 */

import { z } from 'zod';
import { RoomType, RoomVisibility, RoomStatus } from '../types/room.types';

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
    roomType: z.enum([
      RoomType.LIVE_DEMO,
      RoomType.PRODUCT_SHOWCASE,
      RoomType.CAMPAIGN,
      RoomType.COMMUNITY,
      RoomType.EVENT,
    ]),
    visibility: z.enum([
      RoomVisibility.PUBLIC,
      RoomVisibility.UNLISTED,
      RoomVisibility.PRIVATE,
    ]).default(RoomVisibility.PUBLIC),
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

export type CreateRoomRequest = z.infer<typeof createRoomValidator>['body'];

// Update room validation
export const updateRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    visibility: z.enum([RoomVisibility.PUBLIC, RoomVisibility.UNLISTED, RoomVisibility.PRIVATE]).optional(),
    maxParticipants: z.number().positive().max(10000).optional(),
    scheduledStart: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    scheduledEnd: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    settings: roomSettingsSchema.optional(),
    status: z.enum([RoomStatus.DRAFT, RoomStatus.SCHEDULED, RoomStatus.LIVE, RoomStatus.ENDED]).optional(),
  }),
});

export type UpdateRoomParams = z.infer<typeof updateRoomValidator>['params'];
export type UpdateRoomRequest = z.infer<typeof updateRoomValidator>['body'];

// Get room by ID validation
export const getRoomByIdValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

export type GetRoomByIdParams = z.infer<typeof getRoomByIdValidator>['params'];

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

export type JoinRoomParams = z.infer<typeof joinRoomValidator>['params'];
export type JoinRoomRequest = z.infer<typeof joinRoomValidator>['body'];

// Leave room validation
export const leaveRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

export type LeaveRoomParams = z.infer<typeof leaveRoomValidator>['params'];

// Send message validation
export const sendMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    content: z.string().min(1).max(1000),
    messageType: z.enum(['text', 'announcement']).default('text'),
    mentions: z.array(z.string().uuid()).optional(),
    repliedTo: z.string().uuid().optional(),
  }),
});

export type SendMessageParams = z.infer<typeof sendMessageValidator>['params'];
export type SendMessageRequest = z.infer<typeof sendMessageValidator>['body'];

// Get messages validation
export const getMessagesValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    before: z.string().optional(),
    after: z.string().optional(),
  }),
});

export type GetMessagesParams = z.infer<typeof getMessagesValidator>['params'];
export type GetMessagesQuery = z.infer<typeof getMessagesValidator>['query'];

// Create poll validation
export const createPollValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    question: z.string().min(1).max(500),
    options: z.array(z.object({
      text: z.string().min(1).max(200),
      image: z.string().url().optional(),
    })).min(2).max(10),
    settings: z.object({
      allowMultiple: z.boolean().default(false),
      allowAnonymous: z.boolean().default(true),
      hideResultsUntilEnd: z.boolean().default(false),
      requireVerification: z.boolean().default(false),
    }).optional(),
    endsAt: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  }),
});

export type CreatePollParams = z.infer<typeof createPollValidator>['params'];
export type CreatePollRequest = z.infer<typeof createPollValidator>['body'];

// Vote poll validation
export const votePollValidator = z.object({
  params: z.object({
    pollId: z.string().uuid('Invalid poll ID format'),
  }),
  body: z.object({
    optionIndex: z.number().min(0),
  }),
});

export type VotePollParams = z.infer<typeof votePollValidator>['params'];
export type VotePollRequest = z.infer<typeof votePollValidator>['body'];

// Moderate room validation
export const moderateRoomValidator = z.object({
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

export type ModerateRoomParams = z.infer<typeof moderateRoomValidator>['params'];
export type ModerateRoomRequest = z.infer<typeof moderateRoomValidator>['body'];

// Room invite validation
export const inviteToRoomValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    inviteeId: z.string().uuid().optional(),
    inviteeEmail: z.string().email().optional(),
  }).refine(data => data.inviteeId || data.inviteeEmail, {
    message: 'Either inviteeId or inviteeEmail is required',
  }),
});

export type InviteToRoomParams = z.infer<typeof inviteToRoomValidator>['params'];
export type InviteToRoomRequest = z.infer<typeof inviteToRoomValidator>['body'];

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

export type ReportRoomParams = z.infer<typeof reportRoomValidator>['params'];
export type ReportRoomRequest = z.infer<typeof reportRoomValidator>['body'];

// List rooms validation
export const listRoomsValidator = z.object({
  query: z.object({
    brandId: z.string().uuid().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    visibility: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type ListRoomsQuery = z.infer<typeof listRoomsValidator>['query'];