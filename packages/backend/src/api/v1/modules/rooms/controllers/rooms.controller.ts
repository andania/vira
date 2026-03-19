/**
 * Room Controller
 * Handles HTTP requests for room operations
 */

import { Request, Response } from 'express';
import { roomService } from '../services/room.service';
import { streamingService } from '../services/streaming.service';
import { recordingService } from '../services/recording.service';
import { chatService } from '../services/chat.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class RoomController {
  /**
   * Create room
   */
  async createRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const data = {
        ...req.body,
        createdBy: userId,
      };

      const room = await roomService.createRoom(data);

      return res.status(201).json({
        success: true,
        data: room,
        message: 'Room created successfully',
      });
    } catch (error) {
      logger.error('Error in createRoom:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create room',
        },
      });
    }
  }

  /**
   * Get room by ID
   */
  async getRoom(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const room = await roomService.getRoomById(roomId);

      return res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      logger.error('Error in getRoom:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Room not found',
        },
      });
    }
  }

  /**
   * Update room
   */
  async updateRoom(req: Request, res: Response) {
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

      const room = await roomService.updateRoom(roomId, req.body, userId);

      return res.json({
        success: true,
        data: room,
        message: 'Room updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update room',
        },
      });
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(req: Request, res: Response) {
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

      await roomService.deleteRoom(roomId, userId);

      return res.json({
        success: true,
        message: 'Room deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete room',
        },
      });
    }
  }

  /**
   * Start room (go live)
   */
  async startRoom(req: Request, res: Response) {
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

      const room = await roomService.startRoom(roomId, userId);

      return res.json({
        success: true,
        data: room,
        message: 'Room started successfully',
      });
    } catch (error) {
      logger.error('Error in startRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to start room',
        },
      });
    }
  }

  /**
   * End room
   */
  async endRoom(req: Request, res: Response) {
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

      const room = await roomService.endRoom(roomId, userId);

      return res.json({
        success: true,
        data: room,
        message: 'Room ended successfully',
      });
    } catch (error) {
      logger.error('Error in endRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to end room',
        },
      });
    }
  }

  /**
   * Join room
   */
  async joinRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { metadata } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const participant = await roomService.joinRoom(roomId, userId, metadata);

      return res.json({
        success: true,
        data: participant,
        message: 'Joined room successfully',
      });
    } catch (error) {
      logger.error('Error in joinRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to join room',
        },
      });
    }
  }

  /**
   * Leave room
   */
  async leaveRoom(req: Request, res: Response) {
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

      await roomService.leaveRoom(roomId, userId);

      return res.json({
        success: true,
        message: 'Left room successfully',
      });
    } catch (error) {
      logger.error('Error in leaveRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to leave room',
        },
      });
    }
  }

  /**
   * Get room participants
   */
  async getParticipants(req: Request, res: Response) {
    try {
      const { roomId } = req.params;

      const participants = await roomService.getRoomParticipants(roomId);

      return res.json({
        success: true,
        data: participants,
      });
    } catch (error) {
      logger.error('Error in getParticipants:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get participants',
        },
      });
    }
  }

  /**
   * Get rooms by brand
   */
  async getRoomsByBrand(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const filters = req.query;

      const result = await roomService.getRoomsByBrand(brandId, filters);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getRoomsByBrand:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get rooms',
        },
      });
    }
  }

  /**
   * Get live rooms
   */
  async getLiveRooms(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const rooms = await roomService.getLiveRooms(limit);

      return res.json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      logger.error('Error in getLiveRooms:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get live rooms',
        },
      });
    }
  }

  /**
   * Get upcoming rooms
   */
  async getUpcomingRooms(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const rooms = await roomService.getUpcomingRooms(days, limit);

      return res.json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      logger.error('Error in getUpcomingRooms:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get upcoming rooms',
        },
      });
    }
  }

  /**
   * Start streaming
   */
  async startStream(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const { videoQuality, audioQuality, maxBitrate } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const stream = await streamingService.startStream({
        roomId,
        hostId: userId,
        videoQuality,
        audioQuality,
        maxBitrate,
      });

      return res.json({
        success: true,
        data: stream,
        message: 'Stream started successfully',
      });
    } catch (error) {
      logger.error('Error in startStream:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to start stream',
        },
      });
    }
  }

  /**
   * End streaming
   */
  async endStream(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await streamingService.endStream(streamId, userId);

      return res.json({
        success: true,
        message: 'Stream ended successfully',
      });
    } catch (error) {
      logger.error('Error in endStream:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to end stream',
        },
      });
    }
  }

  /**
   * Get stream info
   */
  async getStreamInfo(req: Request, res: Response) {
    try {
      const { streamId } = req.params;

      const stream = await streamingService.getStreamInfo(streamId);

      if (!stream) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Stream not found',
          },
        });
      }

      return res.json({
        success: true,
        data: stream,
      });
    } catch (error) {
      logger.error('Error in getStreamInfo:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get stream info',
        },
      });
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(req: Request, res: Response) {
    try {
      const { streamId } = req.params;

      const stats = await streamingService.getStreamStatistics(streamId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStreamStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get stream statistics',
        },
      });
    }
  }
}

export const roomController = new RoomController();