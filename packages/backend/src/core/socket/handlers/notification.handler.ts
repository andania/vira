/**
 * Notification Socket Handler
 * Manages real-time notifications
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../logger';
import { redis } from '../../cache/redis.client';
import { prisma } from '../../database/client';

export const notificationHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;

  // Subscribe to notifications
  socket.on('notification:subscribe', async () => {
    try {
      // Add to user's notification room
      await socket.join(`user:${userId}`);
      
      // Get unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      // Send unread count
      socket.emit('notification:unread:count', { count: unreadCount });

      logger.debug(`User ${userId} subscribed to notifications`);

    } catch (error) {
      logger.error('Error subscribing to notifications:', error);
    }
  });

  // Mark notification as read
  socket.on('notification:read', async ({ notificationId }, callback) => {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      socket.emit('notification:unread:count', { count: unreadCount });

      callback({ success: true });

    } catch (error) {
      logger.error('Error marking notification as read:', error);
      callback({ error: 'Failed to mark as read' });
    }
  });

  // Mark all notifications as read
  socket.on('notification:read:all', async (callback) => {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      socket.emit('notification:unread:count', { count: 0 });
      callback({ success: true });

    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      callback({ error: 'Failed to mark all as read' });
    }
  });

  // Get notifications
  socket.on('notification:list', async ({ page = 1, limit = 20 }, callback) => {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({
          where: { userId },
        }),
      ]);

      callback({
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      logger.error('Error getting notifications:', error);
      callback({ error: 'Failed to get notifications' });
    }
  });

  // Update notification preferences
  socket.on('notification:preferences:update', async ({ preferences }, callback) => {
    try {
      await prisma.notificationPreference.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });

      callback({ success: true });

    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      callback({ error: 'Failed to update preferences' });
    }
  });

  // Get notification preferences
  socket.on('notification:preferences:get', async (callback) => {
    try {
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      callback({ preferences });

    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      callback({ error: 'Failed to get preferences' });
    }
  });
};

export default notificationHandler;