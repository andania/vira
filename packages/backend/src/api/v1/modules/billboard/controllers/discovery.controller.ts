/**
 * Discovery Controller
 * Handles HTTP requests for search and discovery
 */

import { Request, Response } from 'express';
import { discoveryService } from '../services/discovery.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class DiscoveryController {
  /**
   * Search across all content
   */
  async search(req: Request, res: Response) {
    try {
      const {
        q,
        type,
        category,
        limit = 20,
        offset = 0,
        sortBy = 'relevance',
      } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Search query is required',
          },
        });
      }

      const typeArray = type ? (type as string).split(',') as any[] : undefined;

      const results = await discoveryService.search({
        query: q as string,
        type: typeArray,
        category: category as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as any,
      });

      // Log search for trending
      await discoveryService.logSearch(q as string);

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in search:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to perform search',
        },
      });
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const { q, limit = 5 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Search query is required',
          },
        });
      }

      const suggestions = await discoveryService.getSuggestions(
        q as string,
        parseInt(limit as string)
      );

      return res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error('Error in getSuggestions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get suggestions',
        },
      });
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const trending = await discoveryService.getTrendingSearches(limit);

      return res.json({
        success: true,
        data: trending,
      });
    } catch (error) {
      logger.error('Error in getTrendingSearches:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get trending searches',
        },
      });
    }
  }

  /**
   * Get categories with counts
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await discoveryService.getCategories();

      return res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error in getCategories:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get categories',
        },
      });
    }
  }

  /**
   * Filter content
   */
  async filter(req: Request, res: Response) {
    try {
      const {
        type,
        category,
        minReward,
        maxReward,
        location,
        status,
        limit = 20,
        offset = 0,
      } = req.body;

      const filters: any = {};

      if (minReward) filters.minReward = parseInt(minReward);
      if (maxReward) filters.maxReward = parseInt(maxReward);
      if (location) filters.location = location;
      if (status) filters.status = status;

      const results = await discoveryService.search({
        query: '',
        type: type?.split(','),
        category,
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters,
      });

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in filter:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to filter content',
        },
      });
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(req: Request, res: Response) {
    try {
      const { type, id } = req.params;

      let content = null;

      switch (type) {
        case 'ad':
          content = await prisma.ad.findUnique({
            where: { id },
            include: {
              campaign: {
                include: {
                  brand: true,
                },
              },
              assets: true,
            },
          });
          break;
        case 'room':
          content = await prisma.room.findUnique({
            where: { id },
            include: {
              brand: true,
              hosts: {
                include: {
                  user: {
                    select: {
                      username: true,
                      profile: true,
                    },
                  },
                },
              },
            },
          });
          break;
        case 'campaign':
          content = await prisma.campaign.findUnique({
            where: { id },
            include: {
              brand: true,
              ads: {
                include: {
                  assets: true,
                },
              },
            },
          });
          break;
        case 'product':
          content = await prisma.product.findUnique({
            where: { id },
            include: {
              brand: true,
              images: true,
              category: true,
            },
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: ApiErrorCode.VALIDATION_ERROR,
              message: 'Invalid content type',
            },
          });
      }

      if (!content) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Content not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          ...content,
          type,
        },
      });
    } catch (error) {
      logger.error('Error in getContentById:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get content',
        },
      });
    }
  }

  /**
   * Get similar content
   */
  async getSimilar(req: Request, res: Response) {
    try {
      const { type, id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // Get the original item
      let sourceItem = null;
      let category = '';

      switch (type) {
        case 'ad':
          sourceItem = await prisma.ad.findUnique({
            where: { id },
            include: {
              campaign: {
                include: {
                  brand: true,
                },
              },
            },
          });
          category = sourceItem?.campaign?.brand?.industry || '';
          break;
        case 'room':
          sourceItem = await prisma.room.findUnique({
            where: { id },
            include: {
              brand: true,
            },
          });
          category = sourceItem?.brand?.industry || '';
          break;
        case 'campaign':
          sourceItem = await prisma.campaign.findUnique({
            where: { id },
            include: {
              brand: true,
            },
          });
          category = sourceItem?.brand?.industry || '';
          break;
        case 'product':
          sourceItem = await prisma.product.findUnique({
            where: { id },
            include: {
              category: true,
            },
          });
          category = sourceItem?.category?.name || '';
          break;
      }

      if (!sourceItem) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Content not found',
          },
        });
      }

      // Find similar items
      const similar = await discoveryService.search({
        query: '',
        type: [type as any],
        category,
        limit,
        sortBy: 'popularity',
      });

      // Filter out the source item
      similar.results = similar.results.filter(item => item.id !== id);

      return res.json({
        success: true,
        data: similar,
      });
    } catch (error) {
      logger.error('Error in getSimilar:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get similar content',
        },
      });
    }
  }
}

export const discoveryController = new DiscoveryController();