/**
 * Room Service
 * Handles room CRUD operations and management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { queueService } from '../../../../../core/queue/bull.queue';
import { notificationService } from '../../notifications/services/notification.service';
import { Prisma } from '@prisma/client';

export interface CreateRoomData {
  brandId: string;
  name: string;
  description?: string;
  roomType: string;
  visibility?: string;
  maxParticipants?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  settings?: any;
  createdBy: string;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  visibility?: string;
  maxParticipants?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  settings?: any;
  status?: string;
}

export class RoomService {
  /**
   * Create new room
   */
  async createRoom(data: CreateRoomData) {
    try {
      // Validate dates if provided
      if (data.scheduledStart && data.scheduledEnd) {
        if (data.scheduledEnd <= data.scheduledStart) {
          throw new Error('End time must be after start time');
        }
      }

      // Check brand ownership
      const brand = await prisma.brand.findUnique({
        where: { id: data.brandId },
      });

      if (!brand) {
        throw new Error('Brand not found');
      }

      // Generate slug from name
      const slug = this.generateSlug(data.name);

      // Create room
      const room = await prisma.room.create({
        data: {
          brandId: data.brandId,
          name: data.name,
          slug,
          description: data.description,
          roomType: data.roomType,
          visibility: data.visibility || 'public',
          maxParticipants: data.maxParticipants,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          settings: data.settings || {},
          status: 'draft',
          createdBy: data.createdBy,
        },
      });

      // Add creator as host
      await prisma.roomHost.create({
        data: {
          roomId: room.id,
          userId: data.createdBy,
          role: 'host',
        },
      });

      logger.info(`Room created: ${room.id}`);
      return room;
    } catch (error) {
      logger.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string) {
    try {
      // Try cache first
      const cached = await cacheService.getRoom(roomId);
      if (cached) {
        return cached;
      }

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          brand: true,
          hosts: {
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
          },
          _count: {
            select: {
              participants: true,
              messages: true,
            },
          },
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // Cache for 5 minutes
      await cacheService.cacheRoom(roomId, room, { ttl: 300 });

      return room;
    } catch (error) {
      logger.error('Error getting room:', error);
      throw error;
    }
  }

  /**
   * Update room
   */
  async updateRoom(roomId: string, data: UpdateRoomData, userId: string) {
    try {
      const room = await this.getRoomById(roomId);

      // Check if user is host
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      if (!isHost) {
        throw new Error('Only hosts can update room');
      }

      // Validate dates if changing
      if (data.scheduledStart && data.scheduledEnd) {
        if (data.scheduledEnd <= data.scheduledStart) {
          throw new Error('End time must be after start time');
        }
      }

      // Update room
      const updated = await prisma.room.update({
        where: { id: roomId },
        data: {
          ...data,
          ...(data.name && { slug: this.generateSlug(data.name) }),
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`Room updated: ${roomId}`);
      return updated;
    } catch (error) {
      logger.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string, userId: string) {
    try {
      const room = await this.getRoomById(roomId);

      // Check if user is host
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      if (!isHost) {
        throw new Error('Only hosts can delete room');
      }

      // Soft delete
      await prisma.room.update({
        where: { id: roomId },
        data: { deletedAt: new Date() },
      });

      // Invalidate cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`Room deleted: ${roomId}`);
    } catch (error) {
      logger.error('Error deleting room:', error);
      throw error;
    }
  }

  /**
   * Start room (go live)
   */
  async startRoom(roomId: string, userId: string) {
    try {
      const room = await this.getRoomById(roomId);

      // Check if user is host
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      if (!isHost) {
        throw new Error('Only hosts can start room');
      }

      if (room.status !== 'scheduled' && room.status !== 'draft') {
        throw new Error(`Room cannot be started from ${room.status} status`);
      }

      const updated = await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'live',
          actualStart: new Date(),
        },
      });

      // Notify followers
      await this.notifyFollowers(room.brandId, room);

      // Invalidate cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`Room started: ${roomId}`);
      return updated;
    } catch (error) {
      logger.error('Error starting room:', error);
      throw error;
    }
  }

  /**
   * End room
   */
  async endRoom(roomId: string, userId: string) {
    try {
      const room = await this.getRoomById(roomId);

      // Check if user is host
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      if (!isHost) {
        throw new Error('Only hosts can end room');
      }

      if (room.status !== 'live') {
        throw new Error('Room is not live');
      }

      const updated = await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'ended',
          actualEnd: new Date(),
        },
      });

      // Invalidate cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`Room ended: ${roomId}`);
      return updated;
    } catch (error) {
      logger.error('Error ending room:', error);
      throw error;
    }
  }

  /**
   * Join room
   */
  async joinRoom(roomId: string, userId: string, metadata?: any) {
    try {
      const room = await this.getRoomById(roomId);

      if (room.status !== 'live' && room.status !== 'scheduled') {
        throw new Error('Room is not available');
      }

      // Check participant limit
      const participantCount = await prisma.roomParticipant.count({
        where: {
          roomId,
          isActive: true,
        },
      });

      if (room.maxParticipants && participantCount >= room.maxParticipants) {
        throw new Error('Room has reached maximum capacity');
      }

      // Check if already joined
      const existing = await prisma.roomParticipant.findFirst({
        where: {
          roomId,
          userId,
          isActive: true,
        },
      });

      if (existing) {
        return existing;
      }

      // Create participant record
      const participant = await prisma.roomParticipant.create({
        data: {
          roomId,
          userId,
          joinedAt: new Date(),
          isActive: true,
          role: 'viewer',
          metadata,
        },
      });

      // Track in Redis for real-time
      await redis.sadd(`room:${roomId}:participants`, userId);
      await redis.hset(`room:${roomId}:user:${userId}`, {
        joinedAt: Date.now(),
        ...metadata,
      });

      // Update participant count in cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`User ${userId} joined room ${roomId}`);
      return participant;
    } catch (error) {
      logger.error('Error joining room:', error);
      throw error;
    }
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string) {
    try {
      // Update participant record
      await prisma.roomParticipant.updateMany({
        where: {
          roomId,
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      // Remove from Redis
      await redis.srem(`room:${roomId}:participants`, userId);
      await redis.del(`room:${roomId}:user:${userId}`);

      // Update participant count in cache
      await cacheService.invalidateRoom(roomId);

      logger.info(`User ${userId} left room ${roomId}`);
    } catch (error) {
      logger.error('Error leaving room:', error);
      throw error;
    }
  }

  /**
   * Get room participants
   */
  async getRoomParticipants(roomId: string) {
    try {
      // Try Redis first for active participants
      const activeParticipantIds = await redis.smembers(`room:${roomId}:participants`);
      
      if (activeParticipantIds.length > 0) {
        const participants = await Promise.all(
          activeParticipantIds.map(async (id) => {
            const metadata = await redis.hgetall(`room:${roomId}:user:${id}`);
            return {
              userId: id,
              ...metadata,
            };
          })
        );
        return participants;
      }

      // Fallback to database
      const participants = await prisma.roomParticipant.findMany({
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

      return participants.map(p => ({
        userId: p.userId,
        username: p.user?.username,
        displayName: p.user?.profile?.displayName,
        avatarUrl: p.user?.profile?.avatarUrl,
        role: p.role,
        joinedAt: p.joinedAt,
      }));
    } catch (error) {
      logger.error('Error getting room participants:', error);
      throw error;
    }
  }

  /**
   * Get rooms by brand
   */
  async getRoomsByBrand(brandId: string, filters: any = {}) {
    try {
      const where: any = { brandId, deletedAt: null };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.roomType) {
        where.roomType = filters.roomType;
      }

      if (filters.visibility) {
        where.visibility = filters.visibility;
      }

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
    } catch (error) {
      logger.error('Error getting rooms by brand:', error);
      throw error;
    }
  }

  /**
   * Get live rooms
   */
  async getLiveRooms(limit: number = 50) {
    try {
      const rooms = await prisma.room.findMany({
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

      return rooms;
    } catch (error) {
      logger.error('Error getting live rooms:', error);
      throw error;
    }
  }

  /**
   * Get upcoming scheduled rooms
   */
  async getUpcomingRooms(days: number = 7, limit: number = 50) {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const rooms = await prisma.room.findMany({
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

      return rooms;
    } catch (error) {
      logger.error('Error getting upcoming rooms:', error);
      throw error;
    }
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Notify brand followers about room
   */
  private async notifyFollowers(brandId: string, room: any) {
    try {
      const followers = await prisma.brandFollower.findMany({
        where: { brandId },
        take: 1000, // Limit to 1000 for performance
      });

      for (const follower of followers) {
        await notificationService.create({
          userId: follower.userId,
          type: 'ROOM',
          title: '🔴 Live Now!',
          body: `${room.name} is live now!`,
          data: {
            screen: 'room',
            action: 'join',
            id: room.id,
          },
        });
      }
    } catch (error) {
      logger.error('Error notifying followers:', error);
    }
  }
}

export const roomService = new RoomService();