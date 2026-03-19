/**
 * Room Middleware
 * Room-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if room exists
 */
export const roomExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Room ID required',
        },
      });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        brand: true,
        hosts: true,
      },
    });

    if (!room || room.deletedAt) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Room not found',
        },
      });
    }

    req.room = room;
    next();
  } catch (error) {
    logger.error('Error in roomExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify room',
      },
    });
  }
};

/**
 * Check if user can access room
 */
export const canAccessRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const room = req.room;

    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Room not found',
        },
      });
    }

    // Public rooms are accessible to all authenticated users
    if (room.visibility === 'public') {
      return next();
    }

    // Check if user is host
    const isHost = room.hosts.some((h: any) => h.userId === userId);
    if (isHost) {
      return next();
    }

    // Check if user is brand member
    const isBrandMember = await prisma.brandMember.findFirst({
      where: {
        brandId: room.brandId,
        userId,
      },
    });

    if (isBrandMember) {
      return next();
    }

    // For unlisted rooms, check if user has invite
    if (room.visibility === 'unlisted') {
      const hasInvite = await prisma.roomInvite.findFirst({
        where: {
          roomId: room.id,
          inviteeId: userId,
          status: 'accepted',
        },
      });

      if (hasInvite) {
        return next();
      }
    }

    // For private rooms, deny access
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not have access to this room',
      },
    });
  } catch (error) {
    logger.error('Error in canAccessRoom middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to check room access',
      },
    });
  }
};

/**
 * Check if user is host
 */
export const isHost = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const room = req.room;

  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Room not found',
      },
    });
  }

  const isUserHost = room.hosts.some((h: any) => h.userId === userId);

  if (!isUserHost) {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Only hosts can perform this action',
      },
    });
  }

  next();
};

/**
 * Check if room can be modified
 */
export const canModifyRoom = (req: Request, res: Response, next: NextFunction) => {
  const room = req.room;

  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Room not found',
      },
    });
  }

  // Rooms can only be modified if not ended or archived
  if (room.status === 'ended' || room.status === 'archived') {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: `Room cannot be modified in ${room.status} state`,
      },
    });
  }

  next();
};

/**
 * Check if user is in room
 */
export const isInRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const roomId = req.params.roomId;

    // Check Redis first for active participants
    const isInRedis = await redis.sismember(`room:${roomId}:participants`, userId);
    
    if (isInRedis) {
      return next();
    }

    // Check database
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId,
        userId,
        isActive: true,
      },
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'You are not in this room',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in isInRoom middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify room membership',
      },
    });
  }
};

/**
 * Check room capacity
 */
export const checkRoomCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = req.room;

    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Room not found',
        },
      });
    }

    if (!room.maxParticipants) {
      return next();
    }

    // Get current participant count from Redis
    const currentParticipants = await redis.scard(`room:${room.id}:participants`);

    if (currentParticipants >= room.maxParticipants) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.ROOM_FULL,
          message: 'Room has reached maximum capacity',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkRoomCapacity middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to check room capacity',
      },
    });
  }
};

/**
 * Validate room settings
 */
export const validateRoomSettings = (req: Request, res: Response, next: NextFunction) => {
  const { settings } = req.body;

  if (!settings) {
    return next();
  }

  // Validate max participants
  if (settings.maxParticipants && (settings.maxParticipants < 1 || settings.maxParticipants > 10000)) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Max participants must be between 1 and 10000',
      },
    });
  }

  // Validate chat delay
  if (settings.chatDelay && (settings.chatDelay < 0 || settings.chatDelay > 60)) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Chat delay must be between 0 and 60 seconds',
      },
    });
  }

  // Validate reaction cooldown
  if (settings.reactionCooldown && (settings.reactionCooldown < 0 || settings.reactionCooldown > 30)) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Reaction cooldown must be between 0 and 30 seconds',
      },
    });
  }

  next();
};

/**
 * Rate limit for room actions
 */
export const roomRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const roomId = req.params.roomId;
  const action = req.method + req.path;
  
  const key = `ratelimit:room:${roomId}:user:${userId}:${action}`;
  const limit = 100; // Max 100 actions per hour
  const windowMs = 60 * 60 * 1000; // 1 hour

  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowMs / 1000);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many room actions. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in roomRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Validate room dates
 */
export const validateRoomDates = (req: Request, res: Response, next: NextFunction) => {
  const { scheduledStart, scheduledEnd } = req.body;

  if (scheduledStart && scheduledEnd) {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'End time must be after start time',
        },
      });
    }

    // Check if start time is in the past
    const now = new Date();
    if (start < now) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Start time cannot be in the past',
        },
      });
    }
  }

  next();
};