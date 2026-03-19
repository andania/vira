/**
 * Socket.IO Server Configuration
 * Real-time communication setup with authentication
 */

import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../../config';
import { logger } from '../logger';
import { redis } from '../cache/redis.client';
import { socketAuthMiddleware, validateRoomAccess, cleanupUserSockets } from './middleware/auth.socket';
import { roomHandler } from './handlers/room.handler';
import { chatHandler } from './handlers/chat.handler';
import { notificationHandler } from './handlers/notification.handler';
import { engagementHandler } from './handlers/engagement.handler';

let io: SocketServer;

export const initializeSocket = (server: HttpServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Apply authentication middleware to all connections
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    logger.info(`🔌 Socket connected: ${socket.id} for user ${userId}`);

    // Update user status in Redis (5 minute TTL)
    redis.setex(`user:status:${userId}`, 300, 'online');

    // Initialize all handlers
    roomHandler(io, socket);
    chatHandler(io, socket);
    notificationHandler(io, socket);
    engagementHandler(io, socket);

    // Handle joining room with validation
    socket.on('room:join', async ({ roomId, metadata }, callback) => {
      try {
        // Validate room access
        const hasAccess = await validateRoomAccess(socket, roomId);
        
        if (!hasAccess) {
          return callback({ error: 'Access denied to this room' });
        }

        // Join the socket room
        await socket.join(`room:${roomId}`);
        
        // Track in Redis
        await redis.sadd(`room:${roomId}:participants`, userId);
        await redis.hset(`room:${roomId}:user:${userId}`, {
          joinedAt: Date.now(),
          socketId: socket.id,
          ...metadata,
        });

        // Get current participants
        const participants = await redis.smembers(`room:${roomId}:participants`);
        
        // Notify others
        socket.to(`room:${roomId}`).emit('room:participant:joined', {
          userId,
          metadata,
          participants: participants.length,
        });

        callback({ success: true, participants: participants.length });

      } catch (error) {
        logger.error('Error joining room:', error);
        callback({ error: 'Failed to join room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
      
      // Remove from Redis tracking
      await redis.srem(`user:sockets:${userId}`, socket.id);
      await redis.del(`socket:${socket.id}`);

      // Check if user has any other connections
      const remainingSockets = await redis.scard(`user:sockets:${userId}`);
      if (remainingSockets === 0) {
        await redis.del(`user:status:${userId}`);
        logger.info(`👤 User ${userId} went offline`);
      }

      // Clean up any room memberships
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room.startsWith('room:')) {
          const roomId = room.replace('room:', '');
          await redis.srem(`room:${roomId}:participants`, userId);
          await redis.del(`room:${roomId}:user:${userId}`);
          
          // Notify room
          socket.to(room).emit('room:participant:left', {
            userId,
            participants: await redis.scard(`room:${roomId}:participants`),
          });
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // Handle ping/pong for latency monitoring
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  });

  // Redis pub/sub for cross-server communication
  const redisSub = redis.duplicate();
  
  redisSub.subscribe('socket:events', (err, count) => {
    if (err) {
      logger.error('Redis subscription error:', err);
    } else {
      logger.info(`📡 Redis pub/sub subscribed to ${count} channels`);
    }
  });

  redisSub.on('message', (channel, message) => {
    if (channel === 'socket:events') {
      try {
        const { type, target, data } = JSON.parse(message);
        
        switch (type) {
          case 'broadcast':
            io.emit(target, data);
            break;
          case 'toUser':
            io.to(`user:${target}`).emit('message', data);
            break;
          case 'toRoom':
            io.to(`room:${target}`).emit('room:message', data);
            break;
        }
      } catch (error) {
        logger.error('Redis pub/sub message error:', error);
      }
    }
  });

  // Stats reporting
  const statsInterval = setInterval(() => {
    const stats = {
      connections: io.engine.clientsCount,
      rooms: Object.keys(io.sockets.adapter.rooms).length,
      users: new Set(
        Array.from(io.sockets.sockets.values()).map(s => s.data.user?.id)
      ).size,
    };
    
    logger.debug('Socket.IO Stats:', stats);
    
    // Store stats in Redis
    redis.setex('socket:stats', 60, JSON.stringify({
      ...stats,
      timestamp: new Date().toISOString(),
    }));
  }, 60000); // Every minute

  // Cleanup on server close
  server.on('close', () => {
    clearInterval(statsInterval);
    redisSub.unsubscribe();
    redisSub.quit();
    
    // Clean up all user sockets
    Promise.all(
      Array.from(io.sockets.sockets.keys()).map(async (socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket?.data?.user?.id) {
          await cleanupUserSockets(socket.data.user.id);
        }
      })
    );
  });

  logger.info('✅ Socket.IO server initialized with auth middleware');
  return io;
};

// Helper functions
export const getIo = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit to specific user
export const emitToUser = async (userId: string, event: string, data: any) => {
  const socketIds = await redis.smembers(`user:sockets:${userId}`);
  
  if (socketIds.length > 0) {
    io.to(socketIds).emit(event, data);
    return true;
  }
  
  // If user is offline, store notification for later
  await redis.lpush(`offline:${userId}`, JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  }));
  await redis.ltrim(`offline:${userId}`, 0, 49); // Keep last 50
  
  return false;
};

// Emit to room
export const emitToRoom = (roomId: string, event: string, data: any) => {
  io.to(`room:${roomId}`).emit(event, data);
};

// Get user's online status
export const getUserStatus = async (userId: string): Promise<'online' | 'offline'> => {
  const status = await redis.get(`user:status:${userId}`);
  return status ? 'online' : 'offline';
};

// Get offline messages for user
export const getOfflineMessages = async (userId: string): Promise<any[]> => {
  const messages = await redis.lrange(`offline:${userId}`, 0, -1);
  await redis.del(`offline:${userId}`);
  return messages.map(msg => JSON.parse(msg));
};

export { io };
export default io;