/**
 * Chat Service
 * Handles real-time chat in rooms
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { moderationService } from '../../../admin/services/moderation.service';

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content: string;
  mentions?: string[];
  repliedTo?: string;
  createdAt: Date;
}

export class ChatService {
  private messageCache: Map<string, ChatMessage[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  /**
   * Send message to room
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    mentions?: string[],
    repliedTo?: string
  ): Promise<ChatMessage> {
    try {
      // Check if user is in room
      const isInRoom = await redis.sismember(`room:${roomId}:participants`, userId);
      if (!isInRoom) {
        throw new Error('User is not in this room');
      }

      // Moderate message content
      const moderationResult = await moderationService.moderateContent(content, 'chat');
      if (moderationResult.flagged) {
        throw new Error('Message contains inappropriate content');
      }

      // Save message to database
      const message = await prisma.roomMessage.create({
        data: {
          roomId,
          userId,
          content,
          mentions: mentions || [],
          repliedTo,
          messageType: 'text',
        },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Create chat message object
      const chatMessage: ChatMessage = {
        id: message.id,
        roomId,
        userId,
        username: message.user.username,
        avatarUrl: message.user.profile?.avatarUrl,
        content,
        mentions,
        repliedTo,
        createdAt: message.createdAt,
      };

      // Cache recent messages (last 100)
      let roomMessages = this.messageCache.get(roomId) || [];
      roomMessages.push(chatMessage);
      if (roomMessages.length > 100) {
        roomMessages = roomMessages.slice(-100);
      }
      this.messageCache.set(roomId, roomMessages);

      // Handle mentions
      if (mentions && mentions.length > 0) {
        await this.handleMentions(roomId, mentions, chatMessage);
      }

      logger.debug(`Message sent in room ${roomId} by user ${userId}`);
      return chatMessage;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      // Try cache first
      if (this.messageCache.has(roomId)) {
        const cached = this.messageCache.get(roomId)!;
        return cached.slice(-limit);
      }

      // Get from database
      const messages = await prisma.roomMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      const chatMessages = messages.reverse().map(msg => ({
        id: msg.id,
        roomId: msg.roomId,
        userId: msg.userId,
        username: msg.user.username,
        avatarUrl: msg.user.profile?.avatarUrl,
        content: msg.content,
        mentions: msg.mentions as string[],
        repliedTo: msg.repliedTo || undefined,
        createdAt: msg.createdAt,
      }));

      // Cache messages
      this.messageCache.set(roomId, chatMessages);

      return chatMessages;
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw error;
    }
  }

  /**
   * Set typing indicator
   */
  async setTyping(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      let roomTyping = this.typingUsers.get(roomId);
      
      if (!roomTyping) {
        roomTyping = new Set();
        this.typingUsers.set(roomId, roomTyping);
      }

      if (isTyping) {
        roomTyping.add(userId);
      } else {
        roomTyping.delete(userId);
      }

      // Auto-clear after 5 seconds
      if (isTyping) {
        setTimeout(() => {
          const current = this.typingUsers.get(roomId);
          if (current) {
            current.delete(userId);
          }
        }, 5000);
      }
    } catch (error) {
      logger.error('Error setting typing indicator:', error);
    }
  }

  /**
   * Get typing users
   */
  getTypingUsers(roomId: string): string[] {
    const roomTyping = this.typingUsers.get(roomId);
    return roomTyping ? Array.from(roomTyping) : [];
  }

  /**
   * Pin message
   */
  async pinMessage(roomId: string, messageId: string, userId: string): Promise<void> {
    try {
      // Check if user is host
      const isHost = await prisma.roomHost.findFirst({
        where: {
          roomId,
          userId,
          role: { in: ['host', 'co-host'] },
        },
      });

      if (!isHost) {
        throw new Error('Only hosts can pin messages');
      }

      await prisma.roomMessage.update({
        where: { id: messageId },
        data: { isPinned: true },
      });

      logger.info(`Message ${messageId} pinned in room ${roomId}`);
    } catch (error) {
      logger.error('Error pinning message:', error);
      throw error;
    }
  }

  /**
   * Unpin message
   */
  async unpinMessage(roomId: string, messageId: string, userId: string): Promise<void> {
    try {
      // Check if user is host
      const isHost = await prisma.roomHost.findFirst({
        where: {
          roomId,
          userId,
          role: { in: ['host', 'co-host'] },
        },
      });

      if (!isHost) {
        throw new Error('Only hosts can unpin messages');
      }

      await prisma.roomMessage.update({
        where: { id: messageId },
        data: { isPinned: false },
      });
    } catch (error) {
      logger.error('Error unpinning message:', error);
      throw error;
    }
  }

  /**
   * Get pinned messages
   */
  async getPinnedMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      const messages = await prisma.roomMessage.findMany({
        where: {
          roomId,
          isPinned: true,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return messages.map(msg => ({
        id: msg.id,
        roomId: msg.roomId,
        userId: msg.userId,
        username: msg.user.username,
        avatarUrl: msg.user.profile?.avatarUrl,
        content: msg.content,
        mentions: msg.mentions as string[],
        repliedTo: msg.repliedTo || undefined,
        createdAt: msg.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting pinned messages:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(roomId: string, messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.roomMessage.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is message owner or host
      const isHost = await prisma.roomHost.findFirst({
        where: {
          roomId,
          userId,
          role: { in: ['host', 'co-host'] },
        },
      });

      if (message.userId !== userId && !isHost) {
        throw new Error('Not authorized to delete this message');
      }

      await prisma.roomMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          content: '[deleted]',
        },
      });

      // Remove from cache
      const roomMessages = this.messageCache.get(roomId);
      if (roomMessages) {
        const index = roomMessages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          roomMessages[index].content = '[deleted]';
        }
      }

      logger.info(`Message ${messageId} deleted from room ${roomId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Handle mentions in messages
   */
  private async handleMentions(roomId: string, mentions: string[], message: ChatMessage): Promise<void> {
    try {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          brand: true,
        },
      });

      for (const mentionedId of mentions) {
        // Send notification
        await notificationService.create({
          userId: mentionedId,
          type: 'ROOM',
          title: '📨 You were mentioned',
          body: `${message.username} mentioned you in ${room?.name || 'a room'}`,
          data: {
            screen: 'room',
            action: 'view',
            id: roomId,
            messageId: message.id,
          },
        });

        // Add to Redis for real-time notification
        await redis.publish('chat:mentions', JSON.stringify({
          userId: mentionedId,
          message,
        }));
      }
    } catch (error) {
      logger.error('Error handling mentions:', error);
    }
  }
}

export const chatService = new ChatService();