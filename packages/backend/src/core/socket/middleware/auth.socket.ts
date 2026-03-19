/**
 * Socket Authentication Middleware
 * Validates JWT tokens and attaches user data to socket
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import { logger } from '../../logger';
import { redis } from '../../cache/redis.client';
import { prisma } from '../../database/client';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      role: string;
      permissions: string[];
    };
    authenticated: boolean;
    connectedAt: Date;
  };
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    // Extract token from handshake
    const token = 
      socket.handshake.auth.token || 
      socket.handshake.headers.authorization ||
      socket.handshake.query.token as string;

    if (!token) {
      logger.warn('Socket connection attempt without token');
      return next(new Error('Authentication required'));
    }

    // Remove Bearer prefix if present
    const cleanToken = token.replace('Bearer ', '');

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(cleanToken, config.jwtSecret);
    } catch (err) {
      logger.warn('Invalid socket token:', err.message);
      return next(new Error('Invalid token'));
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklisted:token:${cleanToken}`);
    if (isBlacklisted) {
      logger.warn('Blacklisted token used for socket connection');
      return next(new Error('Token has been revoked'));
    }

    // Get user from database with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn(`Socket connection attempt for non-existent user: ${decoded.sub}`);
      return next(new Error('User not found'));
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      logger.warn(`Socket connection attempt for ${user.status} user: ${user.id}`);
      return next(new Error(`Account is ${user.status.toLowerCase()}`));
    }

    // Check if user has reached maximum concurrent connections
    const existingConnections = await redis.scard(`user:sockets:${user.id}`);
    const maxConnections = 5; // Configurable per user role

    if (existingConnections >= maxConnections) {
      logger.warn(`User ${user.id} exceeded max socket connections`);
      return next(new Error('Maximum concurrent connections reached'));
    }

    // Collect user permissions
    const permissions = new Set<string>();

    // Add role-based permissions
    user.roles?.forEach(ur => {
      ur.role.permissions?.forEach(rp => {
        if (rp.permission) {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
        }
      });
    });

    // Add direct permissions
    user.permissions?.forEach(up => {
      if (up.permission && up.grantType === 'allow') {
        permissions.add(`${up.permission.resource}:${up.permission.action}`);
      }
    });

    // Attach user data to socket
    (socket as AuthenticatedSocket).data = {
      user: {
        id: user.id,
        email: user.email,
        role: user.accountType,
        permissions: Array.from(permissions),
      },
      authenticated: true,
      connectedAt: new Date(),
    };

    // Track socket connection in Redis
    await redis.sadd(`user:sockets:${user.id}`, socket.id);
    await redis.setex(
      `socket:${socket.id}`,
      86400, // 24 hours
      JSON.stringify({
        userId: user.id,
        email: user.email,
        connectedAt: new Date().toISOString(),
        userAgent: socket.handshake.headers['user-agent'],
        ip: socket.handshake.address,
      })
    );

    // Update user's last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    logger.info(`✅ Socket authenticated for user ${user.id} (${user.email})`);
    next();

  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Middleware to check if socket has required permission
 */
export const requirePermission = (resource: string, action: string) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const permission = `${resource}:${action}`;
    
    if (socket.data.user.permissions.includes(permission)) {
      next();
    } else {
      logger.warn(`Socket permission denied: ${permission} for user ${socket.data.user.id}`);
      next(new Error('Insufficient permissions'));
    }
  };
};

/**
 * Middleware to check if socket has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    if (allowedRoles.includes(socket.data.user.role)) {
      next();
    } else {
      logger.warn(`Socket role denied: required ${allowedRoles.join(', ')} for user ${socket.data.user.id}`);
      next(new Error('Insufficient role'));
    }
  };
};

/**
 * Middleware to rate limit socket events
 */
export const socketRateLimiter = (limits: Record<string, number>) => {
  const userEventCounts = new Map<string, Map<string, { count: number; resetTime: number }>>();

  return (socket: AuthenticatedSocket, event: string, next: (err?: Error) => void) => {
    const userId = socket.data.user.id;
    const limit = limits[event] || 100; // Default 100 per minute
    
    if (!userEventCounts.has(userId)) {
      userEventCounts.set(userId, new Map());
    }

    const userEvents = userEventCounts.get(userId)!;
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    if (!userEvents.has(event)) {
      userEvents.set(event, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    const eventData = userEvents.get(event)!;
    
    if (now > eventData.resetTime) {
      // Reset window
      userEvents.set(event, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (eventData.count >= limit) {
      logger.warn(`Socket rate limit exceeded: ${event} for user ${userId}`);
      next(new Error('Rate limit exceeded. Please slow down.'));
      return;
    }

    eventData.count++;
    next();
  };
};

/**
 * Validate socket room access
 */
export const validateRoomAccess = async (
  socket: AuthenticatedSocket,
  roomId: string
): Promise<boolean> => {
  try {
    const userId = socket.data.user.id;

    // Check if room exists and user has access
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        hosts: true,
        brand: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!room) {
      return false;
    }

    // Public rooms are accessible to all authenticated users
    if (room.visibility === 'PUBLIC') {
      return true;
    }

    // Unlisted rooms are accessible if user has link
    if (room.visibility === 'UNLISTED') {
      // Check if user was invited or is host
      const isInvited = await prisma.roomInvite.findFirst({
        where: {
          roomId,
          inviteeId: userId,
          status: 'accepted',
        },
      });

      return !!(isInvited || room.hosts.some(h => h.userId === userId));
    }

    // Private rooms require explicit membership
    if (room.visibility === 'PRIVATE') {
      const isMember = room.hosts.some(h => h.userId === userId) ||
                       room.brand?.members?.some(m => m.userId === userId);
      
      return !!isMember;
    }

    return false;

  } catch (error) {
    logger.error('Error validating room access:', error);
    return false;
  }
};

/**
 * Clean up socket connections for a user
 */
export const cleanupUserSockets = async (userId: string) => {
  try {
    const socketIds = await redis.smembers(`user:sockets:${userId}`);
    
    for (const socketId of socketIds) {
      await redis.del(`socket:${socketId}`);
    }
    
    await redis.del(`user:sockets:${userId}`);
    await redis.del(`user:status:${userId}`);
    
    logger.info(`🧹 Cleaned up socket data for user ${userId}`);
  } catch (error) {
    logger.error(`Error cleaning up sockets for user ${userId}:`, error);
  }
};

export default socketAuthMiddleware;