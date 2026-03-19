/**
 * Streaming Service
 * Main streaming orchestration service
 */

import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { redis } from '../../../core/cache/redis.client';
import { muxService } from './mux.service';
import { webrtcService } from './webrtc.service';
import { v4 as uuidv4 } from 'uuid';

export interface StreamConfig {
  roomId: string;
  hostId: string;
  title?: string;
  description?: string;
  quality?: 'low' | 'medium' | 'high' | 'uhd';
  audioQuality?: 'low' | 'medium' | 'high';
  record?: boolean;
  maxParticipants?: number;
  isPrivate?: boolean;
  password?: string;
}

export interface StreamInfo {
  streamId: string;
  roomId: string;
  hostId: string;
  title?: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'idle' | 'connecting' | 'live' | 'ended' | 'error';
  viewers: number;
  peakViewers: number;
  quality: string;
  duration?: number;
  recordingUrl?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
}

export interface StreamToken {
  token: string;
  streamId: string;
  userId: string;
  role: 'host' | 'viewer';
  expiresAt: Date;
}

export type StreamingProvider = 'mux' | 'webrtc' | 'custom';

export class StreamingService {
  private provider: StreamingProvider;
  private activeStreams: Map<string, StreamInfo> = new Map();
  private tokens: Map<string, StreamToken> = new Map();

  constructor() {
    this.provider = (process.env.STREAMING_PROVIDER as StreamingProvider) || 'webrtc';
    logger.info(`✅ Streaming service initialized with provider: ${this.provider}`);
  }

  /**
   * Create a new stream
   */
  async createStream(config: StreamConfig): Promise<StreamInfo> {
    try {
      const streamId = uuidv4();
      const streamInfo: StreamInfo = {
        streamId,
        roomId: config.roomId,
        hostId: config.hostId,
        title: config.title,
        startedAt: new Date(),
        status: 'idle',
        viewers: 0,
        peakViewers: 0,
        quality: config.quality || 'medium',
      };

      // Initialize with provider
      switch (this.provider) {
        case 'mux':
          const muxStream = await muxService.createStream({
            title: config.title,
            quality: config.quality,
            record: config.record,
          });
          streamInfo.playbackUrl = muxStream.playbackUrl;
          break;
        case 'webrtc':
          await webrtcService.createRoom(streamId, {
            maxParticipants: config.maxParticipants,
            isPrivate: config.isPrivate,
            password: config.password,
          });
          break;
      }

      // Store in memory and Redis
      this.activeStreams.set(streamId, streamInfo);
      await this.cacheStream(streamInfo);

      logger.info(`Stream created: ${streamId} for room ${config.roomId}`);
      return streamInfo;
    } catch (error) {
      logger.error('Error creating stream:', error);
      throw error;
    }
  }

  /**
   * Start a stream
   */
  async startStream(streamId: string, hostId: string): Promise<StreamInfo> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      if (stream.hostId !== hostId) {
        throw new Error('Only host can start the stream');
      }

      stream.status = 'connecting';
      stream.startedAt = new Date();

      // Provider-specific start
      switch (this.provider) {
        case 'mux':
          await muxService.startStream(streamId);
          break;
        case 'webrtc':
          // WebRTC handles start via signaling
          break;
      }

      stream.status = 'live';
      await this.cacheStream(stream);

      logger.info(`Stream started: ${streamId}`);
      return stream;
    } catch (error) {
      logger.error('Error starting stream:', error);
      throw error;
    }
  }

  /**
   * End a stream
   */
  async endStream(streamId: string, hostId: string): Promise<StreamInfo> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      if (stream.hostId !== hostId) {
        throw new Error('Only host can end the stream');
      }

      stream.status = 'ended';
      stream.endedAt = new Date();
      stream.duration = Math.floor(
        (stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000
      );

      // Provider-specific end
      switch (this.provider) {
        case 'mux':
          const recording = await muxService.endStream(streamId);
          stream.recordingUrl = recording?.recordingUrl;
          break;
        case 'webrtc':
          await webrtcService.closeRoom(streamId);
          break;
      }

      await this.cacheStream(stream);

      logger.info(`Stream ended: ${streamId}`);
      return stream;
    } catch (error) {
      logger.error('Error ending stream:', error);
      throw error;
    }
  }

  /**
   * Get stream info
   */
  async getStreamInfo(streamId: string): Promise<StreamInfo | null> {
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
  }

  /**
   * Get room stream
   */
  async getRoomStream(roomId: string): Promise<StreamInfo | null> {
    for (const stream of this.activeStreams.values()) {
      if (stream.roomId === roomId && stream.status === 'live') {
        return stream;
      }
    }
    return null;
  }

  /**
   * Generate viewer token
   */
  generateViewerToken(streamId: string, userId: string, role: 'host' | 'viewer' = 'viewer'): StreamToken {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const streamToken: StreamToken = {
      token,
      streamId,
      userId,
      role,
      expiresAt,
    };

    this.tokens.set(token, streamToken);
    redis.setex(`stream:token:${token}`, 24 * 60 * 60, JSON.stringify(streamToken));

    return streamToken;
  }

  /**
   * Validate viewer token
   */
  validateViewerToken(token: string): StreamToken | null {
    // Check memory first
    if (this.tokens.has(token)) {
      const streamToken = this.tokens.get(token)!;
      if (streamToken.expiresAt > new Date()) {
        return streamToken;
      }
      this.tokens.delete(token);
    }

    // Check Redis
    return null; // Simplified
  }

  /**
   * Add viewer to stream
   */
  async addViewer(streamId: string, userId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.viewers++;
      if (stream.viewers > stream.peakViewers) {
        stream.peakViewers = stream.viewers;
      }
      await this.cacheStream(stream);
    }

    await redis.sadd(`stream:${streamId}:viewers`, userId);
    await redis.expire(`stream:${streamId}:viewers`, 3600);
  }

  /**
   * Remove viewer from stream
   */
  async removeViewer(streamId: string, userId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.viewers = Math.max(0, stream.viewers - 1);
      await this.cacheStream(stream);
    }

    await redis.srem(`stream:${streamId}:viewers`, userId);
  }

  /**
   * Get viewer count
   */
  async getViewerCount(streamId: string): Promise<number> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      return stream.viewers;
    }

    const count = await redis.scard(`stream:${streamId}:viewers`);
    return count;
  }

  /**
   * Cache stream in Redis
   */
  private async cacheStream(stream: StreamInfo): Promise<void> {
    await redis.setex(`stream:${stream.streamId}`, 86400, JSON.stringify(stream));
  }

  /**
   * Get streaming URL
   */
  getStreamingUrl(streamId: string, quality?: string): string {
    switch (this.provider) {
      case 'mux':
        return muxService.getPlaybackUrl(streamId, quality);
      case 'webrtc':
        return webrtcService.getStreamingUrl(streamId);
      default:
        return `${process.env.STREAMING_URL}/live/${streamId}/${quality || 'medium'}/index.m3u8`;
    }
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(streamId: string): string {
    return `${process.env.STREAMING_URL}/thumbnails/${streamId}.jpg`;
  }

  /**
   * Get RTMP endpoint
   */
  getRtmpEndpoint(): string {
    return process.env.RTMP_ENDPOINT || 'rtmp://ingest.viraz.com/live';
  }

  /**
   * Generate stream key
   */
  generateStreamKey(roomId: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${roomId}_${userId}_${timestamp}_${random}`;
  }

  /**
   * Update stream quality
   */
  async updateStreamQuality(streamId: string, quality: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.quality = quality;
      await this.cacheStream(stream);
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStatistics(streamId: string): Promise<any> {
    const stream = await this.getStreamInfo(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    const viewerCount = await this.getViewerCount(streamId);
    const peakViewers = stream.peakViewers;

    // Get provider-specific stats
    let providerStats = {};
    if (this.provider === 'mux') {
      providerStats = await muxService.getStreamMetrics(streamId);
    }

    return {
      ...stream,
      currentViewers: viewerCount,
      peakViewers,
      ...providerStats,
    };
  }

  /**
   * Send stream event
   */
  async sendStreamEvent(streamId: string, userId: string, eventType: string, data?: any): Promise<void> {
    // This would be handled by WebSocket
    logger.debug(`Stream event: ${streamId} - ${userId} - ${eventType}`);
  }

  /**
   * Get stream health
   */
  async getStreamHealth(streamId: string): Promise<any> {
    const stream = await this.getStreamInfo(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    return {
      streamId,
      status: stream.status,
      isHealthy: stream.status === 'live',
      viewerCount: await this.getViewerCount(streamId),
      bitrate: Math.floor(Math.random() * 2000) + 1000, // Mock data
      fps: 30,
      frameDrop: Math.floor(Math.random() * 5),
    };
  }

  /**
   * Toggle mute
   */
  async toggleMute(streamId: string, muted: boolean): Promise<void> {
    logger.info(`Stream ${streamId} ${muted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Get active streams
   */
  async getActiveStreams(limit: number = 100): Promise<StreamInfo[]> {
    const streams = Array.from(this.activeStreams.values())
      .filter(s => s.status === 'live')
      .slice(0, limit);
    return streams;
  }

  /**
   * Clean up inactive streams
   */
  async cleanupInactiveStreams(): Promise<number> {
    let cleaned = 0;
    for (const [streamId, stream] of this.activeStreams.entries()) {
      if (stream.status === 'ended' && stream.endedAt) {
        const age = (Date.now() - stream.endedAt.getTime()) / (1000 * 60 * 60);
        if (age > 24) { // Older than 24 hours
          this.activeStreams.delete(streamId);
          cleaned++;
        }
      }
    }
    return cleaned;
  }
}

export const streamingService = new StreamingService();