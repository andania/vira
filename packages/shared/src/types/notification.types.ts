/**
 * Notification and messaging related type definitions
 */

import { UUID, DateTime } from './index';

// Notification types
export enum NotificationType {
  FINANCIAL = 'financial',
  ENGAGEMENT = 'engagement',
  CAMPAIGN = 'campaign',
  ROOM = 'room',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
  AI = 'ai',
  SOCIAL = 'social'
}

export enum NotificationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  CLICKED = 'clicked',
  FAILED = 'failed'
}

// Conversation types
export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  SUPPORT = 'support'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  SYSTEM = 'system'
}

// Notification interfaces
export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>; // Deep link data
  priority: NotificationPriority;
  isRead: boolean;
  isClicked: boolean;
  readAt?: DateTime;
  clickedAt?: DateTime;
  expiresAt?: DateTime;
  createdAt: DateTime;
}

export interface NotificationPreference {
  userId: UUID;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  preferences: {
    financial: boolean;
    engagement: boolean;
    campaigns: boolean;
    rooms: boolean;
    achievements: boolean;
    system: boolean;
    ai: boolean;
    social: boolean;
  };
  updatedAt: DateTime;
}

export interface NotificationLog {
  id: UUID;
  userId: UUID;
  notificationId?: UUID;
  channel: NotificationChannel;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt: DateTime;
  deliveredAt?: DateTime;
}

export interface EmailNotification {
  id: UUID;
  userId: UUID;
  emailTo: string;
  emailFrom?: string;
  subject: string;
  templateName?: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked';
  retryCount: number;
  errorMessage?: string;
  sentAt?: DateTime;
  openedAt?: DateTime;
  createdAt: DateTime;
}

export interface SmsNotification {
  id: UUID;
  userId: UUID;
  phoneNumber: string;
  message: string;
  templateName?: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  retryCount: number;
  errorMessage?: string;
  sentAt?: DateTime;
  deliveredAt?: DateTime;
  createdAt: DateTime;
}

export interface PushNotification {
  id: UUID;
  userId: UUID;
  deviceTokenId?: UUID;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'clicked';
  retryCount: number;
  errorMessage?: string;
  sentAt?: DateTime;
  clickedAt?: DateTime;
  createdAt: DateTime;
}

// Conversation interfaces
export interface Conversation {
  id: UUID;
  conversationType: ConversationType;
  title?: string;
  createdBy: UUID;
  isArchived: boolean;
  lastMessageAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ConversationParticipant {
  conversationId: UUID;
  userId: UUID;
  joinedAt: DateTime;
  leftAt?: DateTime;
  isAdmin: boolean;
  mutedUntil?: DateTime;
}

export interface Message {
  id: UUID;
  conversationId: UUID;
  senderId: UUID;
  messageType: MessageType;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
  }>;
  mentions?: UUID[];
  isEdited: boolean;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  createdAt: DateTime;
  updatedAt?: DateTime;
}

export interface MessageRead {
  messageId: UUID;
  userId: UUID;
  readAt: DateTime;
}

// DTOs
export interface CreateNotificationDTO {
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  expiresAt?: DateTime;
}

export interface UpdateNotificationPreferencesDTO {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferences?: Partial<NotificationPreference['preferences']>;
}

export interface SendEmailDTO {
  userId: UUID;
  to: string;
  subject: string;
  templateName?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
}

export interface SendSmsDTO {
  userId: UUID;
  to: string;
  message: string;
  templateName?: string;
}

export interface SendPushDTO {
  userId: UUID;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface CreateConversationDTO {
  type: ConversationType;
  title?: string;
  participantIds: UUID[];
}

export interface SendMessageDTO {
  conversationId: UUID;
  senderId: UUID;
  messageType?: MessageType;
  content: string;
  attachments?: Message['attachments'];
  mentions?: UUID[];
}

// Notification templates
export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

export interface SmsTemplate {
  name: string;
  content: string;
  variables: string[];
}

// Predefined notification types for re-engagement
export interface ReEngagementStrategy {
  userId: UUID;
  inactivityDays: number;
  lastAction?: string;
  preferredBrands?: UUID[];
  previousEarnings?: number;
  recommendedAction: {
    type: 'push' | 'email' | 'sms' | 'all';
    message: string;
    incentive?: {
      type: 'bonus' | 'discount' | 'decay-protection';
      amount?: number;
    };
  };
}