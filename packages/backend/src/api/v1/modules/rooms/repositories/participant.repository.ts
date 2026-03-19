/**
 * Participant Repository
 * Handles database operations for room participants
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type ParticipantCreateInput = Prisma.RoomParticipantUncheckedCreateInput;
type ParticipantUpdateInput = Prisma.RoomParticipantUncheckedUpdateInput;

export class ParticipantRepository extends BaseRepository<any, ParticipantCreateInput, ParticipantUpdateInput> {
  protected modelName = 'roomParticipant';
  protected prismaModel = prisma.roomParticipant;

  /**
   * Find active participants in room
   */
  async findActiveByRoomId(roomId: string) {
    return prisma.roomParticipant.findMany({
      where: {
        roomId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
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
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Find participant by user and room
   */
  async findByUserAndRoom(userId: string, roomId: string) {
    return prisma.roomParticipant.findFirst({
      where: {
        userId,
        roomId,
        isActive: true,
      },
    });
  }

  /**
   * Get participant count for room
   */
  async getParticipantCount(roomId: string) {
    return prisma.roomParticipant.count({
      where: {
        roomId,
        isActive: true,
      },
    });
  }

  /**
   * Get user's active rooms
   */
  async findUserActiveRooms(userId: string) {
    return prisma.roomParticipant.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        room: {
          include: {
            brand: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Get user's room history
   */
  async findUserRoomHistory(userId: string, limit: number = 50, offset: number = 0) {
    const [history, total] = await Promise.all([
      prisma.roomParticipant.findMany({
        where: { userId },
        include: {
          room: {
            include: {
              brand: {
                select: {
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.roomParticipant.count({
        where: { userId },
      }),
    ]);

    return { history, total };
  }

  /**
   * Update participant role
   */
  async updateRole(roomId: string, userId: string, role: string) {
    return prisma.roomParticipant.updateMany({
      where: {
        roomId,
        userId,
        isActive: true,
      },
      data: { role },
    });
  }

  /**
   * Deactivate all participants in room
   */
  async deactivateAllInRoom(roomId: string) {
    return prisma.roomParticipant.updateMany({
      where: {
        roomId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  /**
   * Get participant statistics
   */
  async getParticipantStats(roomId: string) {
    const [totalParticipants, peakParticipants, averageDuration] = await Promise.all([
      prisma.roomParticipant.count({
        where: { roomId },
      }),
      prisma.roomParticipant.groupBy({
        by: ['roomId'],
        where: { roomId },
        _max: {
          // This would need a peak tracking mechanism
          // Simplified for now
        },
      }),
      prisma.roomParticipant.aggregate({
        where: {
          roomId,
          leftAt: { not: null },
        },
        _avg: {
          // Calculate duration between joinedAt and leftAt
        },
      }),
    ]);

    return {
      totalParticipants,
      peakParticipants: 0, // Placeholder
      averageDuration: 0, // Placeholder
    };
  }

  /**
   * Get active participants count by role
   */
  async getParticipantCountByRole(roomId: string) {
    const counts = await prisma.roomParticipant.groupBy({
      by: ['role'],
      where: {
        roomId,
        isActive: true,
      },
      _count: true,
    });

    return counts.reduce((acc, curr) => {
      acc[curr.role] = curr._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Bulk insert participants (for testing/analytics)
   */
  async bulkCreate(data: ParticipantCreateInput[]) {
    return prisma.roomParticipant.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

export const participantRepository = new ParticipantRepository();