/**
 * Room and live streaming related type definitions
 */

import { UUID, DateTime } from './index';

// Room types and status
export enum RoomType {
  LIVE_DEMO = 'live_demo',
  PRODUCT_SHOWCASE = 'product_showcase',
  CAMPAIGN = 'campaign',
  COMMUNITY = 'community',
  EVENT = 'event'
}

export enum RoomStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

export enum RoomVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
  PRIVATE = 'private'
}

export enum ParticipantRole {
  HOST = 'host',
  CO_HOST = 'co_host',
  MODERATOR = 'moderator',
  SPEAKER = 'speaker',
  VIEWER = 'viewer'
}

// Room interfaces
export interface Room {
  id: UUID;
  brandId: UUID;
  name: string;
  slug: string;
  description?: string;
  roomType: RoomType;
  status: RoomStatus;
  visibility: RoomVisibility;
  maxParticipants?: number;
  currentParticipants: number;
  scheduledStart?: DateTime;
  scheduledEnd?: DateTime;
  actualStart?: DateTime;
  actualEnd?: DateTime;
  settings: RoomSettings;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface RoomSettings {
  allowChat: boolean;
  allowReactions: boolean;
  allowPolls: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;
  requireApproval: boolean;
  muteOnEntry: boolean;
  chatDelay?: number; // seconds
  reactionCooldown?: number; // seconds
  hostControls: {
    canMuteAll: boolean;
    canRemoveParticipants: boolean;
    canEndRoom: boolean;
  };
  streaming: {
    videoQuality: 'auto' | 'low' | 'medium' | 'high';
    audioQuality: 'low' | 'medium' | 'high';
    maxBitrate?: number;
    recordingFormat?: 'mp4' | 'webm';
  };
}

export interface RoomHost {
  id: UUID;
  roomId: UUID;
  userId: UUID;
  role: 'host' | 'co_host' | 'moderator';
  permissions: string[];
  joinedAt: DateTime;
}

export interface RoomParticipant {
  id: UUID;
  roomId: UUID;
  userId: UUID;
  joinedAt: DateTime;
  leftAt?: DateTime;
  isActive: boolean;
  role: ParticipantRole;
  permissions?: string[];
  metadata?: {
    device?: string;
    platform?: string;
    connectionQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

export interface RoomMessage {
  id: UUID;
  roomId: UUID;
  userId: UUID;
  messageType: 'text' | 'system' | 'announcement' | 'poll';
  content: string;
  mentions?: UUID[];
  repliedTo?: UUID;
  isPinned: boolean;
  isFlagged: boolean;
  createdAt: DateTime;
  updatedAt?: DateTime;
}

export interface RoomEvent {
  id: UUID;
  roomId: UUID;
  eventType: 'join' | 'leave' | 'like' | 'share' | 'reaction' | 'purchase' | 'milestone';
  userId?: UUID;
  eventData: Record<string, any>;
  createdAt: DateTime;
}

export interface RoomProduct {
  id: UUID;
  roomId: UUID;
  productId: UUID;
  featuredAt: DateTime;
  featuredBy: UUID;
  sortOrder: number;
}

export interface RoomPoll {
  id: UUID;
  roomId: UUID;
  createdBy: UUID;
  question: string;
  options: Array<{
    id: string;
    text: string;
    image?: string;
  }>;
  settings: {
    allowMultiple: boolean;
    allowAnonymous: boolean;
    hideResultsUntilEnd: boolean;
    requireVerification: boolean;
  };
  startsAt: DateTime;
  endsAt?: DateTime;
  isActive: boolean;
  createdAt: DateTime;
}

export interface RoomPollVote {
  id: UUID;
  pollId: UUID;
  userId: UUID;
  optionIndex: number;
  votedAt: DateTime;
}

export interface RoomRecording {
  id: UUID;
  roomId: UUID;
  recordingUrl: string;
  thumbnailUrl?: string;
  duration: number; // seconds
  sizeBytes: number;
  format: string;
  views: number;
  isPublic: boolean;
  createdAt: DateTime;
}

export interface RoomInvite {
  id: UUID;
  roomId: UUID;
  inviterId: UUID;
  inviteeId?: UUID;
  inviteeEmail?: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: DateTime;
  createdAt: DateTime;
  respondedAt?: DateTime;
}

export interface RoomReport {
  id: UUID;
  roomId: UUID;
  reporterId: UUID;
  reportType: 'inappropriate' | 'harassment' | 'fake' | 'scam' | 'other';
  description?: string;
  evidenceUrls?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  resolvedBy?: UUID;
  resolvedAt?: DateTime;
  createdAt: DateTime;
}

export interface RoomModerationAction {
  id: UUID;
  roomId: UUID;
  moderatorId: UUID;
  targetUserId: UUID;
  actionType: 'warning' | 'mute' | 'kick' | 'ban' | 'unmute' | 'unban';
  duration?: number; // minutes, null for permanent
  reason: string;
  createdAt: DateTime;
  expiresAt?: DateTime;
}

// DTOs
export interface CreateRoomDTO {
  brandId: UUID;
  name: string;
  description?: string;
  roomType: RoomType;
  visibility?: RoomVisibility;
  maxParticipants?: number;
  scheduledStart?: DateTime;
  scheduledEnd?: DateTime;
  settings?: Partial<RoomSettings>;
}

export interface UpdateRoomDTO {
  name?: string;
  description?: string;
  visibility?: RoomVisibility;
  maxParticipants?: number;
  scheduledStart?: DateTime;
  scheduledEnd?: DateTime;
  settings?: Partial<RoomSettings>;
  status?: RoomStatus;
}

export interface JoinRoomDTO {
  roomId: UUID;
  userId: UUID;
  metadata?: {
    device?: string;
    platform?: string;
  };
}

export interface SendMessageDTO {
  roomId: UUID;
  userId: UUID;
  content: string;
  messageType?: 'text' | 'announcement';
  mentions?: UUID[];
  repliedTo?: UUID;
}

export interface CreatePollDTO {
  roomId: UUID;
  question: string;
  options: Array<{ text: string; image?: string }>;
  settings?: Partial<RoomPoll['settings']>;
  endsAt?: DateTime;
}

export interface VotePollDTO {
  pollId: UUID;
  userId: UUID;
  optionIndex: number;
}

export interface ModerateRoomDTO {
  roomId: UUID;
  moderatorId: UUID;
  targetUserId: UUID;
  actionType: RoomModerationAction['actionType'];
  duration?: number;
  reason: string;
}

// Room metrics
export interface RoomMetrics {
  roomId: UUID;
  date: DateTime;
  totalParticipants: number;
  peakParticipants: number;
  avgParticipants: number;
  messagesCount: number;
  engagementsCount: number;
  durationMinutes: number;
  reactionsCount: Record<string, number>;
}