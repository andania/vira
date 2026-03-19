/**
 * Live Controller
 * Handles HTTP requests for live streaming operations in rooms
 */

import { Request, Response } from 'express';
import { streamingService } from '../services/streaming.service';
import { roomService } from '../services/room.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class LiveController {
  /**
   * Start live stream
   */
  async startLive(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { videoQuality, audioQuality, maxBitrate, title } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if user is host
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can start live streams',
          },
        });
      }

      // Update room title if provided
      if (title) {
        await roomService.updateRoom(roomId, { name: title }, userId);
      }

      const stream = await streamingService.startStream({
        roomId,
        hostId: userId,
        videoQuality,
        audioQuality,
        maxBitrate,
      });

      // Generate streaming endpoints
      const streamingUrls = {
        hls: streamingService.getStreamingUrl(stream.streamId, 'hls'),
        dash: streamingService.getStreamingUrl(stream.streamId, 'dash'),
        webrtc: streamingService.getStreamingUrl(stream.streamId, 'webrtc'),
        thumbnail: streamingService.getThumbnailUrl(stream.streamId),
      };

      // Generate stream key for broadcasting software
      const streamKey = streamingService.generateStreamKey(roomId, userId);

      return res.status(201).json({
        success: true,
        data: {
          ...stream,
          streamingUrls,
          streamKey,
          rtmpEndpoint: streamingService.getRtmpEndpoint(),
        },
        message: 'Live stream started successfully',
      });
    } catch (error) {
      logger.error('Error in startLive:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to start live stream',
        },
      });
    }
  }

  /**
   * Stop live stream
   */
  async stopLive(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if user is host
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can stop live streams',
          },
        });
      }

      // Get active stream for room
      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      await streamingService.endStream(stream.streamId, userId);

      return res.json({
        success: true,
        message: 'Live stream stopped successfully',
      });
    } catch (error) {
      logger.error('Error in stopLive:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to stop live stream',
        },
      });
    }
  }

  /**
   * Get live stream status
   */
  async getLiveStatus(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.json({
          success: true,
          data: {
            isLive: false,
            message: 'Room is not currently live',
          },
        });
      }

      const viewerCount = await streamingService.getViewerCount(stream.streamId);
      const stats = await streamingService.getStreamStatistics(stream.streamId);

      return res.json({
        success: true,
        data: {
          isLive: true,
          streamId: stream.streamId,
          startedAt: stream.startedAt,
          viewerCount,
          quality: stream.quality,
          stats,
          streamingUrls: {
            hls: streamingService.getStreamingUrl(stream.streamId, 'hls'),
            dash: streamingService.getStreamingUrl(stream.streamId, 'dash'),
            webrtc: streamingService.getStreamingUrl(stream.streamId, 'webrtc'),
          },
        },
      });
    } catch (error) {
      logger.error('Error in getLiveStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get live status',
        },
      });
    }
  }

  /**
   * Get viewer count
   */
  async getViewerCount(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.json({
          success: true,
          data: { viewerCount: 0 },
        });
      }

      const viewerCount = await streamingService.getViewerCount(stream.streamId);

      return res.json({
        success: true,
        data: { viewerCount },
      });
    } catch (error) {
      logger.error('Error in getViewerCount:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get viewer count',
        },
      });
    }
  }

  /**
   * Generate viewer token
   */
  async generateViewerToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      const token = streamingService.generateViewerToken(stream.streamId, userId);

      return res.json({
        success: true,
        data: {
          token,
          expiresIn: 86400, // 24 hours in seconds
          streamId: stream.streamId,
        },
      });
    } catch (error) {
      logger.error('Error in generateViewerToken:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to generate viewer token',
        },
      });
    }
  }

  /**
   * Validate viewer token
   */
  async validateViewerToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const validation = streamingService.validateViewerToken(token);

      if (!validation) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Invalid or expired token',
          },
        });
      }

      return res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Error in validateViewerToken:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to validate token',
        },
      });
    }
  }

  /**
   * Update stream quality
   */
  async updateStreamQuality(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { quality } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if user is host
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can update stream quality',
          },
        });
      }

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      await streamingService.updateStreamQuality(stream.streamId, quality);

      return res.json({
        success: true,
        message: 'Stream quality updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateStreamQuality:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update stream quality',
        },
      });
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStatistics(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      const stats = await streamingService.getStreamStatistics(stream.streamId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStreamStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get stream statistics',
        },
      });
    }
  }

  /**
   * Send stream event (like, reaction, etc.)
   */
  async sendStreamEvent(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { eventType, data } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      await streamingService.sendStreamEvent(stream.streamId, userId, eventType, data);

      return res.json({
        success: true,
        message: 'Event sent successfully',
      });
    } catch (error) {
      logger.error('Error in sendStreamEvent:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to send event',
        },
      });
    }
  }

  /**
   * Get stream health
   */
  async getStreamHealth(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      const health = await streamingService.getStreamHealth(stream.streamId);

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error in getStreamHealth:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get stream health',
        },
      });
    }
  }

  /**
   * Mute/unmute stream
   */
  async toggleMute(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { muted } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if user is host
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === userId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can mute/unmute streams',
          },
        });
      }

      const stream = await streamingService.getRoomStream(roomId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No active stream found for this room',
          },
        });
      }

      await streamingService.toggleMute(stream.streamId, muted);

      return res.json({
        success: true,
        message: muted ? 'Stream muted' : 'Stream unmuted',
      });
    } catch (error) {
      logger.error('Error in toggleMute:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to toggle mute',
        },
      });
    }
  }
}

export const liveController = new LiveController();