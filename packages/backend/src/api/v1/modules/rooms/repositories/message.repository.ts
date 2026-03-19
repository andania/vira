/**
 * Message Repository
 * Handles database operations for room messages
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type MessageCreateInput = Prisma.RoomMessageUncheckedCreateInput;
type MessageUpdateInput = Prisma.RoomMessageUncheckedUpdateInput;

export class MessageRepository extends BaseRepository<any, MessageCreateInput, MessageUpdateInput> {
  protected modelName = 'roomMessage';
  protected prismaModel = prisma.roomMessage;

  /**
   * Find messages by room ID with pagination
   */
  async findByRoomId(roomId: string, limit: number = 50, before?: Date) {
    const where: any = { roomId };
    
    if (before) {
      where.createdAt = { lt: before };
    }

    const [messages, total] = await Promise.all([
      prisma.roomMessage.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.roomMessage.count({ where }),
    ]);

    return {
      messages: messages.reverse(),
      total,
    };
  }

  /**
   * Find pinned messages in room
   */
  async findPinnedByRoomId(roomId: string) {
    return prisma.roomMessage.findMany({
      where: {
        roomId,
        isPinned: true,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find messages by user in room
   */
  async findByUserInRoom(userId: string, roomId: string, limit: number = 50) {
    return prisma.roomMessage.findMany({
      where: {
        userId,
        roomId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Search messages in room
   */
  async searchInRoom(roomId: string, query: string, limit: number = 50) {
    return prisma.roomMessage.findMany({
      where: {
        roomId,
        content: { contains: query, mode: 'insensitive' },
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Pin message
   */
  async pinMessage(messageId: string) {
    return prisma.roomMessage.update({
      where: { id: messageId },
      data: { isPinned: true },
    });
  }

  /**
   * Unpin message
   */
  async unpinMessage(messageId: string) {
    return prisma.roomMessage.update({
      where: { id: messageId },
      data: { isPinned: false },
    });
  }

  /**
   * Soft delete message
   */
  async softDelete(messageId: string) {
    return prisma.roomMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '[deleted]',
      },
    });
  }

  /**
   * Get message statistics
   */
  async getMessageStats(roomId: string) {
    const [totalMessages, messagesByUser, messagesByHour] = await Promise.all([
      prisma.roomMessage.count({
        where: { roomId },
      }),
      prisma.roomMessage.groupBy({
        by: ['userId'],
        where: { roomId },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM room_messages
        WHERE room_id = ${roomId}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour ASC
      `,
    ]);

    return {
      totalMessages,
      topUsers: messagesByUser.map(m => ({
        userId: m.userId,
        count: m._count,
      })),
      hourlyDistribution: messagesByHour,
    };
  }

  /**
   * Get messages mentioning user
   */
  async findMentions(userId: string, limit: number = 50) {
    return prisma.roomMessage.findMany({
      where: {
        mentions: {
          has: userId,
        },
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get message thread (replies)
   */
  async getMessageThread(messageId: string) {
    return prisma.roomMessage.findMany({
      where: {
        OR: [
          { id: messageId },
          { repliedTo: messageId },
        ],
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
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Bulk delete messages (for moderation)
   */
  async bulkDelete(messageIds: string[]) {
    return prisma.roomMessage.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: {
        isDeleted: true,
        content: '[deleted]',
      },
    });
  }
}

export const messageRepository = new MessageRepository();