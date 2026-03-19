/**
 * Chat Socket Handler
 * Manages real-time chat in rooms and conversations
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../logger';
import { redis } from '../../cache/redis.client';
import { prisma } from '../../database/client';
import { emitToUser } from '../socket.server';
import { notificationService } from '../../../services/notification.service';

export const chatHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;

  // Send message to room
  socket.on('chat:room:message', async ({ roomId, content, mentions }, callback) => {
    try {
      // Save message to database
      const message = await prisma.roomMessage.create({
        data: {
          roomId,
          userId,
          content,
          mentions: mentions || [],
          messageType: 'text',
        },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: { avatarUrl: true, displayName: true },
              },
            },
          },
        },
      });

      // Broadcast to room
      io.to(`room:${roomId}`).emit('chat:room:message:new', {
        id: message.id,
        userId,
        username: message.user.username,
        avatar: message.user.profile?.avatarUrl,
        displayName: message.user.profile?.displayName,
        content,
        mentions,
        createdAt: message.createdAt,
      });

      // Handle mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedId of mentions) {
          await notificationService.create({
            userId: mentionedId,
            type: 'ENGAGEMENT',
            title: '📨 You were mentioned',
            body: `${message.user.username} mentioned you in a message`,
            data: {
              screen: 'room',
              action: 'view',
              id: roomId,
            },
          });
        }
      }

      callback({ success: true, messageId: message.id });

    } catch (error) {
      logger.error('Error sending room message:', error);
      callback({ error: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('chat:room:typing', ({ roomId, isTyping }) => {
    socket.to(`room:${roomId}`).emit('chat:room:typing:update', {
      userId,
      isTyping,
    });
  });

  // Send private message
  socket.on('chat:private:message', async ({ recipientId, content }, callback) => {
    try {
      // Get or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: { in: [userId, recipientId] },
            },
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            type: 'DIRECT',
            participants: {
              create: [
                { userId, isAdmin: true },
                { userId: recipientId, isAdmin: false },
              ],
            },
          },
        });
      }

      // Save message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content,
          messageType: 'text',
        },
        include: {
          sender: {
            select: {
              username: true,
              profile: {
                select: { avatarUrl: true, displayName: true },
              },
            },
          },
        },
      });

      // Send to recipient if online
      const delivered = await emitToUser(recipientId, 'chat:private:message:new', {
        id: message.id,
        conversationId: conversation.id,
        senderId: userId,
        senderUsername: message.sender.username,
        senderAvatar: message.sender.profile?.avatarUrl,
        content,
        createdAt: message.createdAt,
      });

      // Send confirmation to sender
      callback({
        success: true,
        messageId: message.id,
        delivered,
      });

      // Send notification if offline
      if (!delivered) {
        await notificationService.create({
          userId: recipientId,
          type: 'SOCIAL',
          title: '💬 New Message',
          body: `${message.sender.username} sent you a message`,
          data: {
            screen: 'messages',
            action: 'view',
            id: conversation.id,
          },
        });
      }

    } catch (error) {
      logger.error('Error sending private message:', error);
      callback({ error: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('chat:read', async ({ conversationId, messageIds }) => {
    try {
      // Mark messages as read in database
      await prisma.messageRead.createMany({
        data: messageIds.map((messageId: string) => ({
          messageId,
          userId,
        })),
        skipDuplicates: true,
      });

      // Notify sender
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
        },
        select: { senderId: true },
      });

      const uniqueSenders = [...new Set(messages.map(m => m.senderId))];

      for (const senderId of uniqueSenders) {
        if (senderId !== userId) {
          await emitToUser(senderId, 'chat:read:receipt', {
            conversationId,
            messageIds,
            readBy: userId,
            readAt: new Date(),
          });
        }
      }

    } catch (error) {
      logger.error('Error marking messages as read:', error);
    }
  });

  // Get conversation history
  socket.on('chat:history', async ({ conversationId, before, limit = 50 }, callback) => {
    try {
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          createdAt: before ? { lt: new Date(before) } : undefined,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          sender: {
            select: {
              username: true,
              profile: {
                select: { avatarUrl: true, displayName: true },
              },
            },
          },
          reads: {
            where: { userId },
            select: { readAt: true },
          },
        },
      });

      callback({
        messages: messages.reverse(),
        hasMore: messages.length === limit,
      });

    } catch (error) {
      logger.error('Error getting chat history:', error);
      callback({ error: 'Failed to get history' });
    }
  });
};

export default chatHandler;