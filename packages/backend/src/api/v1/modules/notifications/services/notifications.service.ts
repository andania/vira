/**
 * Notification Service
 * Handles creating and managing notifications across all channels
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { emailService } from '../../../../../lib/email/email.service';
import { smsService } from '../../../../../lib/sms/sms.service';
import { pushService } from '../../../../../lib/push/push.service';
import { NotificationType, NotificationPriority } from '@viraz/shared';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  expiresAt?: Date;
  channels?: ('push' | 'email' | 'sms' | 'in-app')[];
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: Record<NotificationType, boolean>;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async create(data: NotificationData): Promise<any> {
    try {
      const {
        userId,
        type,
        title,
        body,
        data: meta = {},
        priority = 'medium',
        expiresAt,
        channels = ['in-app', 'push', 'email'],
      } = data;

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: meta,
          priority,
          expiresAt,
        },
      });

      // Determine which channels to use
      const enabledChannels = channels.filter(channel => {
        switch (channel) {
          case 'push':
            return preferences.push;
          case 'email':
            return preferences.email;
          case 'sms':
            return preferences.sms;
          case 'in-app':
            return preferences.inApp;
          default:
            return false;
        }
      });

      // Queue notifications for each channel
      for (const channel of enabledChannels) {
        await this.queueNotification(notification.id, userId, channel, {
          title,
          body,
          data: meta,
          priority,
        });
      }

      // Store in Redis for real-time delivery
      if (enabledChannels.includes('in-app')) {
        await redis.lpush(`notifications:${userId}`, JSON.stringify({
          id: notification.id,
          type,
          title,
          body,
          data: meta,
          createdAt: new Date(),
          read: false,
        }));
        await redis.ltrim(`notifications:${userId}`, 0, 49); // Keep last 50
      }

      logger.info(`Notification created: ${notification.id} for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Queue notification for delivery
   */
  private async queueNotification(
    notificationId: string,
    userId: string,
    channel: string,
    content: any
  ): Promise<void> {
    try {
      const jobData = {
        notificationId,
        userId,
        channel,
        ...content,
      };

      switch (channel) {
        case 'push':
          await queueService.add('push', jobData);
          break;
        case 'email':
          await queueService.add('email', jobData);
          break;
        case 'sms':
          await queueService.add('sms', jobData);
          break;
        default:
          // In-app notifications are handled immediately
          break;
      }

      // Log notification attempt
      await prisma.notificationLog.create({
        data: {
          notificationId,
          channel,
          status: 'queued',
        },
      });
    } catch (error) {
      logger.error('Error queueing notification:', error);
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ) {
    try {
      const { limit = 50, offset = 0, unreadOnly = false, types } = options;

      const where: any = { userId };
      
      if (unreadOnly) {
        where.isRead = false;
      }

      if (types && types.length > 0) {
        where.type = { in: types };
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return {
        notifications,
        total,
        unreadCount,
        hasMore: offset + notifications.length < total,
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId, userId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update Redis
      await this.updateRedisReadStatus(userId, notificationId, true);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Clear Redis
      await redis.del(`notifications:${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.delete({
        where: { id: notificationId, userId },
      });

      // Remove from Redis
      await this.removeFromRedis(userId, notificationId);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (prefs) {
        return {
          push: prefs.pushEnabled,
          email: prefs.emailEnabled,
          sms: prefs.smsEnabled,
          inApp: true, // Always enabled
          quietHoursStart: prefs.quietHoursStart || undefined,
          quietHoursEnd: prefs.quietHoursEnd || undefined,
          categories: prefs.preferences as Record<NotificationType, boolean>,
        };
      }

      // Default preferences
      return {
        push: true,
        email: true,
        sms: false,
        inApp: true,
        categories: {
          financial: true,
          engagement: true,
          campaign: true,
          room: true,
          achievement: true,
          system: true,
          ai: false,
          social: true,
        },
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          pushEnabled: preferences.push,
          emailEnabled: preferences.email,
          smsEnabled: preferences.sms,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
          preferences: preferences.categories,
        },
        create: {
          userId,
          pushEnabled: preferences.push ?? true,
          emailEnabled: preferences.email ?? true,
          smsEnabled: preferences.sms ?? false,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
          preferences: preferences.categories ?? {},
        },
      });

      logger.info(`Notification preferences updated for user ${userId}`);
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(userIds: string[], data: Omit<NotificationData, 'userId'>): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        ...data,
        createdAt: new Date(),
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      // Queue individual notifications
      for (const userId of userIds) {
        await this.create({ userId, ...data });
      }

      logger.info(`Bulk notifications sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try Redis first
      const redisCount = await redis.llen(`notifications:${userId}`);
      if (redisCount > 0) {
        return redisCount;
      }

      // Fallback to database
      return prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Update Redis read status
   */
  private async updateRedisReadStatus(userId: string, notificationId: string, read: boolean): Promise<void> {
    try {
      const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
      
      for (const notif of notifications) {
        const data = JSON.parse(notif);
        if (data.id === notificationId) {
          data.read = read;
          // This is simplified - in production you'd want to update in place
          await redis.lrem(`notifications:${userId}`, 0, notif);
          await redis.lpush(`notifications:${userId}`, JSON.stringify(data));
          break;
        }
      }
    } catch (error) {
      logger.error('Error updating Redis read status:', error);
    }
  }

  /**
   * Remove notification from Redis
   */
  private async removeFromRedis(userId: string, notificationId: string): Promise<void> {
    try {
      const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
      
      for (const notif of notifications) {
        const data = JSON.parse(notif);
        if (data.id === notificationId) {
          await redis.lrem(`notifications:${userId}`, 0, notif);
          break;
        }
      }
    } catch (error) {
      logger.error('Error removing from Redis:', error);
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result.count} expired notifications`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();