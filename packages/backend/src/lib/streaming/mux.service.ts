/**
 * Mux Streaming Service
 * Professional video streaming with Mux
 */

import Mux from '@mux/mux-node';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { v4 as uuidv4 } from 'uuid';

export interface MuxStreamConfig {
  title?: string;
  quality?: 'low' | 'medium' | 'high' | 'uhd';
  record?: boolean;
  mp4Support?: boolean;
}

export interface MuxStream {
  id: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  status: string;
  createdAt: Date;
}

export interface MuxRecording {
  id: string;
  streamId: string;
  recordingUrl: string;
  duration: number;
  size: number;
  status: string;
}

export class MuxService {
  private mux: any;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Mux client
   */
  private initialize() {
    try {
      const tokenId = process.env.MUX_TOKEN_ID;
      const tokenSecret = process.env.MUX_TOKEN_SECRET;

      if (tokenId && tokenSecret) {
        this.mux = new Mux(tokenId, tokenSecret);
        this.initialized = true;
        logger.info('✅ Mux client initialized');
      } else {
        logger.warn('⚠️ Mux credentials not configured');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Mux:', error);
    }
  }

  /**
   * Create a new live stream
   */
  async createStream(config: MuxStreamConfig = {}): Promise<MuxStream> {
    if (!this.initialized) {
      return this.mockCreateStream(config);
    }

    try {
      const stream = await this.mux.video.liveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
        },
        reconnect_window: 60,
        max_continuous_duration: 86400, // 24 hours
        ...this.getQualitySettings(config.quality),
      });

      return {
        id: stream.id,
        streamKey: stream.stream_key,
        playbackId: stream.playback_ids[0].id,
        playbackUrl: `https://stream.mux.com/${stream.playback_ids[0].id}.m3u8`,
        status: stream.status,
        createdAt: new Date(stream.created_at),
      };
    } catch (error) {
      logger.error('Error creating Mux stream:', error);
      throw error;
    }
  }

  /**
   * Get quality settings
   */
  private getQualitySettings(quality?: string): any {
    switch (quality) {
      case 'low':
        return {
          max_resolution_tier: '480p',
          max_frame_rate: 24,
        };
      case 'medium':
        return {
          max_resolution_tier: '720p',
          max_frame_rate: 30,
        };
      case 'high':
        return {
          max_resolution_tier: '1080p',
          max_frame_rate: 60,
        };
      case 'uhd':
        return {
          max_resolution_tier: '2160p',
          max_frame_rate: 60,
        };
      default:
        return {
          max_resolution_tier: '720p',
          max_frame_rate: 30,
        };
    }
  }

  /**
   * Start a stream
   */
  async startStream(streamId: string): Promise<void> {
    if (!this.initialized) {
      logger.debug(`[MOCK] Started stream: ${streamId}`);
      return;
    }

    try {
      await this.mux.video.liveStreams.resetStreamKey(streamId);
      logger.info(`Mux stream started: ${streamId}`);
    } catch (error) {
      logger.error('Error starting Mux stream:', error);
      throw error;
    }
  }

  /**
   * End a stream and create recording
   */
  async endStream(streamId: string): Promise<MuxRecording | null> {
    if (!this.initialized) {
      return this.mockEndStream(streamId);
    }

    try {
      const stream = await this.mux.video.liveStreams.get(streamId);

      if (stream.active_asset_id) {
        const asset = await this.mux.video.assets.get(stream.active_asset_id);

        return {
          id: asset.id,
          streamId,
          recordingUrl: asset.playback_ids?.[0]?.id
            ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`
            : '',
          duration: asset.duration || 0,
          size: 0, // Not provided by Mux
          status: asset.status,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error ending Mux stream:', error);
      throw error;
    }
  }

  /**
   * Get stream metrics
   */
  async getStreamMetrics(streamId: string): Promise<any> {
    if (!this.initialized) {
      return this.mockGetMetrics(streamId);
    }

    try {
      const metrics = await this.mux.video.liveStreams.listMetrics(streamId);
      return metrics;
    } catch (error) {
      logger.error('Error getting Mux metrics:', error);
      return {};
    }
  }

  /**
   * Get playback URL
   */
  getPlaybackUrl(playbackId: string, quality?: string): string {
    const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    
    if (quality) {
      return `${baseUrl}?video_quality=${quality}`;
    }
    
    return baseUrl;
  }

  /**
   * Create a clip
   */
  async createClip(streamId: string, startTime: number, endTime: number): Promise<string> {
    if (!this.initialized) {
      return `https://stream.mux.com/mock-clip-${uuidv4()}.mp4`;
    }

    try {
      const clip = await this.mux.video.assets.create({
        input: [
          {
            url: `mux://assets/${streamId}`,
            start_time: startTime,
            end_time: endTime,
          },
        ],
        playback_policy: ['public'],
      });

      return `https://stream.mux.com/${clip.playback_ids[0].id}.mp4`;
    } catch (error) {
      logger.error('Error creating Mux clip:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail
   */
  getThumbnailUrl(playbackId: string, time: number = 1): string {
    return `https://image.mux.com/${playbackId}/thumbnail.png?time=${time}`;
  }

  /**
   * Create animated GIF
   */
  getGifUrl(playbackId: string, start: number = 0, end: number = 3): string {
    return `https://image.mux.com/${playbackId}/animated.gif?start=${start}&end=${end}&width=400`;
  }

  /**
   * Get stream status
   */
  async getStreamStatus(streamId: string): Promise<string> {
    if (!this.initialized) {
      return 'active';
    }

    try {
      const stream = await this.mux.video.liveStreams.get(streamId);
      return stream.status;
    } catch (error) {
      logger.error('Error getting Mux stream status:', error);
      return 'error';
    }
  }

  /**
   * Delete stream
   */
  async deleteStream(streamId: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.mux.video.liveStreams.delete(streamId);
      logger.info(`Mux stream deleted: ${streamId}`);
    } catch (error) {
      logger.error('Error deleting Mux stream:', error);
      throw error;
    }
  }

  /**
   * Mock create stream for development
   */
  private mockCreateStream(config: MuxStreamConfig): MuxStream {
    const playbackId = uuidv4();
    const streamKey = uuidv4();

    logger.debug('[MOCK] Creating Mux stream:', config);

    return {
      id: uuidv4(),
      streamKey,
      playbackId,
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      status: 'idle',
      createdAt: new Date(),
    };
  }

  /**
   * Mock end stream for development
   */
  private mockEndStream(streamId: string): MuxRecording {
    logger.debug(`[MOCK] Ending Mux stream: ${streamId}`);

    return {
      id: uuidv4(),
      streamId,
      recordingUrl: `https://stream.mux.com/${uuidv4()}.mp4`,
      duration: 3600,
      size: 1024 * 1024 * 100,
      status: 'ready',
    };
  }

  /**
   * Mock get metrics for development
   */
  private mockGetMetrics(streamId: string): any {
    return {
      averageBitrate: 2500,
      peakBitrate: 5000,
      totalViews: Math.floor(Math.random() * 1000),
      totalWatchTime: Math.floor(Math.random() * 3600),
    };
  }
}

export const muxService = new MuxService();