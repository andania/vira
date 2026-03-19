/**
 * Streaming Service
 * Handles live video streaming and WebRTC connections
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import { v4 as uuidv4 } from 'uuid';

export interface StreamConfig {
  roomId: string;
  hostId: string;
  videoQuality?: 'low' | 'medium' | 'high';
  audioQuality?: 'low' | 'medium' | 'high';
  maxBitrate?: number;
}

export interface StreamInfo {
  streamId: string;
  roomId: string;
  hostId: string;
  startedAt: Date;
  viewers: number;
  quality: string;
  status: 'live' | 'ended' | 'paused';
}

export class StreamingService {
  private activeStreams: Map<string, StreamInfo> = new Map();

  /**
   * Initialize streaming for a room
   */
  async startStream(config: StreamConfig): Promise<StreamInfo> {
    try {
      const { roomId, hostId, videoQuality = 'medium', audioQuality = 'medium', maxBitrate } = config;

      // Check if room exists and user is host
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hosts: true },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      const isHost = room.hosts.some(h => h.userId === hostId);
      if (!isHost) {
        throw new Error('Only hosts can start streaming');
      }

      // Generate stream ID
      const streamId = uuidv4();

      // Create stream info
      const streamInfo: StreamInfo = {
        streamId,
        roomId,
        hostId,
        startedAt: new Date(),
        viewers: 0,
        quality: videoQuality,
        status: 'live',
      };

      // Store in memory and Redis
      this.activeStreams.set(streamId, streamInfo);
      await redis.setex(
        `stream:${streamId}`,
        86400, // 24 hours
        JSON.stringify(streamInfo)
      );

      // Update room status
      await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'live',
          actualStart: new Date(),
        },
      });

      logger.info(`Stream started: ${streamId} for room ${roomId}`);
      return streamInfo;
    } catch (error) {
      logger.error('Error starting stream:', error);
      throw error;
    }
  }

  /**
   * End streaming for a room
   */
  async endStream(streamId: string, hostId: string): Promise<void> {
    try {
      const streamInfo = this.activeStreams.get(streamId);
      
      if (!streamInfo) {
        throw new Error('Stream not found');
      }

      if (streamInfo.hostId !== hostId) {
        throw new Error('Only host can end stream');
      }

      // Update status
      streamInfo.status = 'ended';
      this.activeStreams.delete(streamId);
      await redis.setex(
        `stream:${streamId}`,
        86400,
        JSON.stringify(streamInfo)
      );

      // Update room status
      await prisma.room.update({
        where: { id: streamInfo.roomId },
        data: {
          status: 'ended',
          actualEnd: new Date(),
        },
      });

      logger.info(`Stream ended: ${streamId}`);
    } catch (error) {
      logger.error('Error ending stream:', error);
      throw error;
    }
  }

  /**
   * Get stream info
   */
  async getStreamInfo(streamId: string): Promise<StreamInfo | null> {
    try {
      // Check memory first
      if (this.activeStreams.has(streamId)) {
        return this.activeStreams.get(streamId)!;
      }

      // Check Redis
      const cached = await redis.get(`stream:${streamId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error('Error getting stream info:', error);
      return null;
    }
  }

  /**
   * Get active stream for room
   */
  async getRoomStream(roomId: string): Promise<StreamInfo | null> {
    try {
      // Find active stream for room
      for (const stream of this.activeStreams.values()) {
        if (stream.roomId === roomId && stream.status === 'live') {
          return stream;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting room stream:', error);
      return null;
    }
  }

  /**
   * Add viewer to stream
   */
  async addViewer(streamId: string, userId: string): Promise<void> {
    try {
      const streamInfo = this.activeStreams.get(streamId);
      
      if (!streamInfo) {
        throw new Error('Stream not found');
      }

      streamInfo.viewers++;
      
      // Track viewer in Redis
      await redis.sadd(`stream:${streamId}:viewers`, userId);
      await redis.expire(`stream:${streamId}:viewers`, 3600); // 1 hour

      logger.debug(`Viewer ${userId} added to stream ${streamId}`);
    } catch (error) {
      logger.error('Error adding viewer:', error);
    }
  }

  /**
   * Remove viewer from stream
   */
  async removeViewer(streamId: string, userId: string): Promise<void> {
    try {
      const streamInfo = this.activeStreams.get(streamId);
      
      if (streamInfo) {
        streamInfo.viewers = Math.max(0, streamInfo.viewers - 1);
      }

      await redis.srem(`stream:${streamId}:viewers`, userId);
    } catch (error) {
      logger.error('Error removing viewer:', error);
    }
  }

  /**
   * Get viewer count
   */
  async getViewerCount(streamId: string): Promise<number> {
    try {
      // Check memory first
      if (this.activeStreams.has(streamId)) {
        return this.activeStreams.get(streamId)!.viewers;
      }

      // Check Redis
      const count = await redis.scard(`stream:${streamId}:viewers`);
      return count;
    } catch (error) {
      logger.error('Error getting viewer count:', error);
      return 0;
    }
  }

  /**
   * Generate streaming token for viewer
   */
  generateViewerToken(streamId: string, userId: string): string {
    const token = Buffer.from(`${streamId}:${userId}:${Date.now()}`).toString('base64');
    return token;
  }

  /**
   * Validate viewer token
   */
  validateViewerToken(token: string): { streamId: string; userId: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [streamId, userId, timestamp] = decoded.split(':');
      
      // Check if token is expired (24 hours)
      if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
        return null;
      }

      return { streamId, userId };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStatistics(streamId: string): Promise<any> {
    try {
      const streamInfo = await this.getStreamInfo(streamId);
      
      if (!streamInfo) {
        throw new Error('Stream not found');
      }

      const viewerCount = await this.getViewerCount(streamId);
      const duration = streamInfo.status === 'live' 
        ? Math.floor((Date.now() - streamInfo.startedAt.getTime()) / 1000)
        : 0;

      // Get peak viewers from Redis
      const peakViewers = await redis.get(`stream:${streamId}:peak`) || '0';

      return {
        ...streamInfo,
        currentViewers: viewerCount,
        peakViewers: parseInt(peakViewers),
        duration,
        status: streamInfo.status,
      };
    } catch (error) {
      logger.error('Error getting stream statistics:', error);
      throw error;
    }
  }

  /**
   * Update peak viewers
   */
  async updatePeakViewers(streamId: string): Promise<void> {
    try {
      const currentViewers = await this.getViewerCount(streamId);
      const peak = await redis.get(`stream:${streamId}:peak`) || '0';
      
      if (currentViewers > parseInt(peak)) {
        await redis.set(`stream:${streamId}:peak`, currentViewers.toString());
      }
    } catch (error) {
      logger.error('Error updating peak viewers:', error);
    }
  }

  /**
   * Generate streaming URL based on quality
   */
  getStreamingUrl(streamId: string, quality: string = 'medium'): string {
    const baseUrl = config.streamingUrl || 'https://stream.viraz.com';
    return `${baseUrl}/live/${streamId}/${quality}/index.m3u8`;
  }

  /**
   * Generate recording URL after stream ends
   */
  async getRecordingUrl(roomId: string): Promise<string | null> {
    try {
      const recording = await prisma.roomRecording.findFirst({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
      });

      return recording?.recordingUrl || null;
    } catch (error) {
      logger.error('Error getting recording URL:', error);
      return null;
    }
  }
}

export const streamingService = new StreamingService();