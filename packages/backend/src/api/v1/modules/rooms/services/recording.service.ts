/**
 * Recording Service
 * Handles room recording and playback
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { storageService } from '../../../../../lib/storage/storage.service';
import { queueService } from '../../../../../core/queue/bull.queue';
import { v4 as uuidv4 } from 'uuid';

export interface RecordingConfig {
  roomId: string;
  quality?: 'low' | 'medium' | 'high';
  recordAudio?: boolean;
  recordVideo?: boolean;
  recordScreen?: boolean;
}

export interface RecordingInfo {
  id: string;
  roomId: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  size?: number;
  url?: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  quality: string;
}

export class RecordingService {
  private activeRecordings: Map<string, RecordingInfo> = new Map();

  /**
   * Start recording a room
   */
  async startRecording(config: RecordingConfig): Promise<RecordingInfo> {
    try {
      const { roomId, quality = 'medium', recordAudio = true, recordVideo = true, recordScreen = false } = config;

      // Check if room exists and is live
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hosts: true },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.status !== 'live') {
        throw new Error('Room is not live');
      }

      // Check if already recording
      const existingRecording = Array.from(this.activeRecordings.values())
        .find(r => r.roomId === roomId && r.status === 'recording');

      if (existingRecording) {
        throw new Error('Room is already being recorded');
      }

      // Create recording record
      const recordingId = uuidv4();
      const recordingInfo: RecordingInfo = {
        id: recordingId,
        roomId,
        startedAt: new Date(),
        status: 'recording',
        quality,
      };

      // Store in memory and Redis
      this.activeRecordings.set(recordingId, recordingInfo);
      await redis.setex(
        `recording:${recordingId}`,
        86400, // 24 hours
        JSON.stringify(recordingInfo)
      );

      // Create database record
      await prisma.roomRecording.create({
        data: {
          id: recordingId,
          roomId,
          status: 'recording',
          quality,
          settings: {
            recordAudio,
            recordVideo,
            recordScreen,
          },
        },
      });

      logger.info(`Recording started: ${recordingId} for room ${roomId}`);
      return recordingInfo;
    } catch (error) {
      logger.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(recordingId: string): Promise<RecordingInfo> {
    try {
      const recordingInfo = this.activeRecordings.get(recordingId);
      
      if (!recordingInfo) {
        throw new Error('Recording not found');
      }

      recordingInfo.endedAt = new Date();
      recordingInfo.duration = Math.floor(
        (recordingInfo.endedAt.getTime() - recordingInfo.startedAt.getTime()) / 1000
      );
      recordingInfo.status = 'processing';

      // Update in memory and Redis
      this.activeRecordings.set(recordingId, recordingInfo);
      await redis.setex(
        `recording:${recordingId}`,
        86400,
        JSON.stringify(recordingInfo)
      );

      // Update database
      await prisma.roomRecording.update({
        where: { id: recordingId },
        data: {
          endedAt: recordingInfo.endedAt,
          duration: recordingInfo.duration,
          status: 'processing',
        },
      });

      // Queue for processing
      await queueService.add('recording', {
        recordingId,
        action: 'process',
      });

      logger.info(`Recording stopped: ${recordingId}`);
      return recordingInfo;
    } catch (error) {
      logger.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Process recording (transcode, generate thumbnails)
   */
  async processRecording(recordingId: string): Promise<void> {
    try {
      const recording = await prisma.roomRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Simulate processing (in production, this would use FFmpeg or a video processing service)
      logger.info(`Processing recording ${recordingId}...`);

      // Generate thumbnail
      const thumbnailUrl = await this.generateThumbnail(recordingId);

      // Generate recording URL
      const recordingUrl = await this.generateRecordingUrl(recordingId);

      // Update database
      await prisma.roomRecording.update({
        where: { id: recordingId },
        data: {
          status: 'completed',
          recordingUrl,
          thumbnailUrl,
          size: Math.floor(Math.random() * 100000000), // Simulated size
          format: 'mp4',
        },
      });

      // Update Redis
      await redis.del(`recording:${recordingId}`);

      logger.info(`Recording processed: ${recordingId}`);
    } catch (error) {
      logger.error('Error processing recording:', error);
      
      await prisma.roomRecording.update({
        where: { id: recordingId },
        data: {
          status: 'failed',
        },
      });
    }
  }

  /**
   * Get recording info
   */
  async getRecording(recordingId: string): Promise<any> {
    try {
      // Check active recordings first
      if (this.activeRecordings.has(recordingId)) {
        return this.activeRecordings.get(recordingId);
      }

      // Check database
      const recording = await prisma.roomRecording.findUnique({
        where: { id: recordingId },
      });

      return recording;
    } catch (error) {
      logger.error('Error getting recording:', error);
      throw error;
    }
  }

  /**
   * Get recordings for a room
   */
  async getRoomRecordings(roomId: string, limit: number = 50, offset: number = 0) {
    try {
      const [recordings, total] = await Promise.all([
        prisma.roomRecording.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.roomRecording.count({
          where: { roomId },
        }),
      ]);

      return { recordings, total };
    } catch (error) {
      logger.error('Error getting room recordings:', error);
      throw error;
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      const recording = await prisma.roomRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Delete from storage
      if (recording.recordingUrl) {
        await storageService.delete(recording.recordingUrl);
      }
      if (recording.thumbnailUrl) {
        await storageService.delete(recording.thumbnailUrl);
      }

      // Delete from database
      await prisma.roomRecording.delete({
        where: { id: recordingId },
      });

      logger.info(`Recording deleted: ${recordingId}`);
    } catch (error) {
      logger.error('Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail from recording
   */
  private async generateThumbnail(recordingId: string): Promise<string> {
    // In production, this would extract a frame from the video
    // For now, return a placeholder
    return `https://storage.viraz.com/recordings/${recordingId}/thumbnail.jpg`;
  }

  /**
   * Generate recording URL
   */
  private async generateRecordingUrl(recordingId: string): Promise<string> {
    // In production, this would return the actual video URL
    return `https://storage.viraz.com/recordings/${recordingId}/recording.mp4`;
  }

  /**
   * Update recording views
   */
  async incrementViews(recordingId: string): Promise<void> {
    try {
      await prisma.roomRecording.update({
        where: { id: recordingId },
        data: {
          views: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error incrementing recording views:', error);
    }
  }

  /**
   * Get recording statistics
   */
  async getRecordingStats(roomId: string) {
    try {
      const [totalRecordings, totalViews, avgDuration] = await Promise.all([
        prisma.roomRecording.count({
          where: { roomId },
        }),
        prisma.roomRecording.aggregate({
          where: { roomId },
          _sum: {
            views: true,
          },
        }),
        prisma.roomRecording.aggregate({
          where: { roomId },
          _avg: {
            duration: true,
          },
        }),
      ]);

      return {
        totalRecordings,
        totalViews: totalViews._sum.views || 0,
        averageDuration: Math.floor(avgDuration._avg.duration || 0),
      };
    } catch (error) {
      logger.error('Error getting recording stats:', error);
      throw error;
    }
  }
}

export const recordingService = new RecordingService();