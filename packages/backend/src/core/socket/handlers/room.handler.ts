/**
 * Room Socket Handler
 * Manages live room connections and interactions
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../logger';
import { redis } from '../../cache/redis.client';
import { prisma } from '../../database/client';
import { emitToUser } from '../socket.server';

export const roomHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;

  // Join a room
  socket.on('room:join', async ({ roomId, metadata }, callback) => {
    try {
      logger.info(`User ${userId} joining room ${roomId}`);

      // Verify room exists and user can join
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hosts: true },
      });

      if (!room) {
        return callback({ error: 'Room not found' });
      }

      // Check room capacity
      const participantCount = await redis.scard(`room:${roomId}:participants`);
      if (room.maxParticipants && participantCount >= room.maxParticipants) {
        return callback({ error: 'Room is full' });
      }

      // Join socket room
      await socket.join(`room:${roomId}`);
      
      // Track participant in Redis
      await redis.sadd(`room:${roomId}:participants`, userId);
      await redis.hset(`room:${roomId}:user:${userId}`, {
        joinedAt: Date.now(),
        socketId: socket.id,
        ...metadata,
      });

      // Get current participants
      const participants = await redis.smembers(`room:${roomId}:participants`);
      const participantDetails = await Promise.all(
        participants.map(async (id) => {
          const userData = await redis.hgetall(`room:${roomId}:user:${id}`);
          return { userId: id, ...userData };
        })
      );

      // Notify others in room
      socket.to(`room:${roomId}`).emit('room:participant:joined', {
        userId,
        metadata,
        participants: participantDetails.length,
      });

      // Send confirmation to user
      callback({
        success: true,
        participants: participantDetails,
        room,
      });

      // Log event
      await prisma.roomEvent.create({
        data: {
          roomId,
          userId,
          eventType: 'join',
          eventData: { metadata, timestamp: new Date() },
        },
      });

    } catch (error) {
      logger.error('Error joining room:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  // Leave a room
  socket.on('room:leave', async ({ roomId }, callback) => {
    try {
      logger.info(`User ${userId} leaving room ${roomId}`);

      // Leave socket room
      await socket.leave(`room:${roomId}`);
      
      // Remove from Redis tracking
      await redis.srem(`room:${roomId}:participants`, userId);
      await redis.del(`room:${roomId}:user:${userId}`);

      // Get updated participant count
      const participantCount = await redis.scard(`room:${roomId}:participants`);

      // Notify others
      socket.to(`room:${roomId}`).emit('room:participant:left', {
        userId,
        participants: participantCount,
      });

      callback({ success: true });

      // Log event
      await prisma.roomEvent.create({
        data: {
          roomId,
          userId,
          eventType: 'leave',
          eventData: { timestamp: new Date() },
        },
      });

    } catch (error) {
      logger.error('Error leaving room:', error);
      callback({ error: 'Failed to leave room' });
    }
  });

  // Get room participants
  socket.on('room:participants', async ({ roomId }, callback) => {
    try {
      const participants = await redis.smembers(`room:${roomId}:participants`);
      
      const details = await Promise.all(
        participants.map(async (id) => {
          const userData = await redis.hgetall(`room:${roomId}:user:${id}`);
          return { userId: id, ...userData };
        })
      );

      callback({ participants: details });
    } catch (error) {
      logger.error('Error getting participants:', error);
      callback({ error: 'Failed to get participants' });
    }
  });

  // Host controls
  socket.on('room:host:control', async ({ roomId, action, targetUserId, data }, callback) => {
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
        return callback({ error: 'Not authorized' });
      }

      switch (action) {
        case 'mute':
          await emitToUser(targetUserId, 'room:host:muted', { roomId, by: userId });
          break;
        case 'unmute':
          await emitToUser(targetUserId, 'room:host:unmuted', { roomId, by: userId });
          break;
        case 'kick':
          await emitToUser(targetUserId, 'room:host:kicked', { roomId, by: userId });
          // Remove from room
          await redis.srem(`room:${roomId}:participants`, targetUserId);
          break;
        case 'make-host':
          // Add as co-host
          await prisma.roomHost.create({
            data: {
              roomId,
              userId: targetUserId,
              role: 'co-host',
            },
          });
          await emitToUser(targetUserId, 'room:host:promoted', { roomId, by: userId });
          break;
      }

      callback({ success: true });

      // Log moderation action
      await prisma.roomModerationAction.create({
        data: {
          roomId,
          moderatorId: userId,
          targetUserId,
          actionType: action,
          reason: data?.reason,
        },
      });

    } catch (error) {
      logger.error('Error executing host control:', error);
      callback({ error: 'Failed to execute control' });
    }
  });

  // Room reactions
  socket.on('room:reaction', async ({ roomId, reaction }) => {
    try {
      // Broadcast reaction to room
      socket.to(`room:${roomId}`).emit('room:reaction:new', {
        userId,
        reaction,
        timestamp: Date.now(),
      });

      // Track in Redis for analytics
      await redis.hincrby(`room:${roomId}:reactions`, reaction, 1);

    } catch (error) {
      logger.error('Error sending reaction:', error);
    }
  });

  // Room poll vote
  socket.on('room:poll:vote', async ({ pollId, optionIndex }, callback) => {
    try {
      // Record vote in database
      const vote = await prisma.roomPollVote.create({
        data: {
          pollId,
          userId,
          optionIndex,
        },
      });

      // Get updated poll results
      const poll = await prisma.roomPoll.findUnique({
        where: { id: pollId },
        include: {
          votes: true,
        },
      });

      // Calculate results
      const results = poll.options.map((_, index) => ({
        option: index,
        votes: poll.votes.filter(v => v.optionIndex === index).length,
      }));

      // Broadcast updated results
      io.to(`room:${poll.roomId}`).emit('room:poll:updated', {
        pollId,
        results,
        totalVotes: poll.votes.length,
      });

      callback({ success: true });

    } catch (error) {
      logger.error('Error voting in poll:', error);
      callback({ error: 'Failed to vote' });
    }
  });
};

export default roomHandler;