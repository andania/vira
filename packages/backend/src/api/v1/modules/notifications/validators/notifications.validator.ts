/**
 * Notification Validators
 * Zod validation schemas for notification operations
 */

import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@viraz/shared';

// Notification type enum
export const NotificationTypeEnum = z.enum([
  'financial',
  'engagement',
  'campaign',
  'room',
  'achievement',
  'system',
  'ai',
  'social'
]);

// Notification priority enum
export const NotificationPriorityEnum = z.enum([
  'high',
  'medium',
  'low'
]);

// Notification channel enum
export const NotificationChannelEnum = z.enum([
  'push',
  'email',
  'sms',
  'in-app'
]);

// Get notifications validation
export const getNotificationsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    unread: z.enum(['true', 'false']).optional(),
    types: z.string().optional(),
  }),
});

// Get unread count validation
export const getUnreadCountValidator = z.object({});

// Mark as read validation
export const markAsReadValidator = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid notification ID format'),
  }),
});

// Mark all as read validation
export const markAllAsReadValidator = z.object({});

// Delete notification validation
export const deleteNotificationValidator = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid notification ID format'),
  }),
});

// Create notification validation (admin)
export const createNotificationValidator = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    type: NotificationTypeEnum,
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    data: z.record(z.any()).optional(),
    priority: NotificationPriorityEnum.default('medium'),
    expiresAt: z.string().optional(),
    channels: z.array(NotificationChannelEnum).optional(),
  }),
});

// Send bulk notification validation (admin)
export const sendBulkNotificationValidator = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid()).min(1).max(1000),
    type: NotificationTypeEnum,
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    data: z.record(z.any()).optional(),
    priority: NotificationPriorityEnum.default('medium'),
  }),
});

// Test notification validation (admin)
export const testNotificationValidator = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    type: NotificationTypeEnum,
    channel: NotificationChannelEnum.optional(),
  }),
});