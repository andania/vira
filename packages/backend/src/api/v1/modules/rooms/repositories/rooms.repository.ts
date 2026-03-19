/**
 * Room Repository
 * Handles database operations for rooms
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type RoomCreateInput = Prisma.RoomUncheckedCreateInput;
type RoomUpdateInput = Prisma.RoomUncheckedUpdateInput;

export class RoomRepository extends BaseRepository<any, RoomCreateInput, RoomUpdateInput> {
  protected modelName = 'room';
  protected prismaModel = prisma.room;

  /**
   * Find rooms by brand ID
   */
  async findByBrandId(brandId: string, filters: any = {}) {
    const where: any = { brandId, deletedAt: null, ...filters };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          hosts: {
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
          },
          _count: {
            select: {
              participants: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.room.count({ where }),
    ]);

    return { rooms, total };
  }

  /**
   * Find live rooms
   */
  async findLiveRooms(limit: number = 50) {
    return prisma.room.findMany({
      where: {
        status: 'live',
        visibility: 'public',
        deletedAt: null,
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        hosts: {
          take: 1,
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
        },
        _count: {
          select: {
            participants: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: {
        participants: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Find upcoming scheduled rooms
   */
  async findUpcomingRooms(days: number = 7, limit: number = 50) {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.room.findMany({
      where: {
        status: 'scheduled',
        scheduledStart: {
          gte: now,
          lte: endDate,
        },
        visibility: 'public',
        deletedAt: null,
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        hosts: {
          take: 1,
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
        },
      },
      orderBy: { scheduledStart: 'asc' },
      take: limit,
    });
  }

  /**
   * Update room status
   */
  async updateStatus(roomId: string, status: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }

  /**
   * Increment participant count
   */
  async incrementParticipantCount(roomId: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: {
        currentParticipants: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Decrement participant count
   */
  async decrementParticipantCount(roomId: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: {
        currentParticipants: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Get room statistics
   */
  async getRoomStats(roomId: string) {
    const [participantCount, messageCount, recordingCount] = await Promise.all([
      prisma.roomParticipant.count({
        where: { roomId, isActive: true },
      }),
      prisma.roomMessage.count({
        where: { roomId },
      }),
      prisma.roomRecording.count({
        where: { roomId },
      }),
    ]);

    return {
      participantCount,
      messageCount,
      recordingCount,
    };
  }

  /**
   * Get rooms ending soon
   */
  async findRoomsEndingSoon(minutes: number = 15) {
    const endThreshold = new Date(Date.now() + minutes * 60 * 1000);

    return prisma.room.findMany({
      where: {
        status: 'live',
        scheduledEnd: {
          lte: endThreshold,
          gte: new Date(),
        },
      },
      include: {
        hosts: true,
      },
    });
  }

  /**
   * Search rooms
   */
  async searchRooms(query: string, limit: number = 20, offset: number = 0) {
    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          visibility: 'public',
          deletedAt: null,
        },
        include: {
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
          hosts: {
            take: 1,
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
          },
          _count: {
            select: {
              participants: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.room.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          visibility: 'public',
          deletedAt: null,
        },
      }),
    ]);

    return { rooms, total };
  }
}

export const roomRepository = new RoomRepository();