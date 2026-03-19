/**
 * Notification Repository
 * Handles database operations for notifications
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type NotificationCreateInput = Prisma.NotificationUncheckedCreateInput;
type NotificationUpdateInput = Prisma.NotificationUncheckedUpdateInput;

export class NotificationRepository extends BaseRepository<any, NotificationCreateInput, NotificationUpdateInput> {
  protected modelName = 'notification';
  protected prismaModel = prisma.notification;

  /**
   * Find notifications by user ID with pagination
   */
  async findByUserId(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: string[];
    } = {}
  ) {
    const { limit = 50, offset = 0, unreadOnly = false, types } = options;

    const where: any = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    return prisma.notification.update({
      where: { id, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Delete old notifications
   */
  async deleteOld(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });
  }

  /**
   * Get notification statistics
   */
  async getStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, read, unread, byType] = await Promise.all([
      prisma.notification.count({
        where: { userId, createdAt: { gte: startDate } },
      }),
      prisma.notification.count({
        where: { userId, isRead: true, createdAt: { gte: startDate } },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, createdAt: { gte: startDate } },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId, createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    return {
      total,
      read,
      unread,
      readRate: total > 0 ? (read / total) * 100 : 0,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
      })),
    };
  }
}

export const notificationRepository = new NotificationRepository();