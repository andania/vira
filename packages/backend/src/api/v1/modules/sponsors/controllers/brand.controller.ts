/**
 * Brand Controller
 * Handles HTTP requests for brand operations
 */

import { Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class BrandController {
  /**
   * Get brand details
   */
  async getBrandDetails(req: Request, res: Response) {
    try {
      const { brandId } = req.params;

      const brand = await brandService.getBrandDetails(brandId);

      return res.json({
        success: true,
        data: brand,
      });
    } catch (error) {
      logger.error('Error in getBrandDetails:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Brand not found',
        },
      });
    }
  }

  /**
   * Update brand
   */
  async updateBrand(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const brand = await brandService.updateBrand(brandId, sponsorId, req.body);

      return res.json({
        success: true,
        data: brand,
        message: 'Brand updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update brand',
        },
      });
    }
  }

  /**
   * Delete brand
   */
  async deleteBrand(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await brandService.deleteBrand(brandId, sponsorId);

      return res.json({
        success: true,
        message: 'Brand deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete brand',
        },
      });
    }
  }

  /**
   * Get brand followers
   */
  async getFollowers(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const followers = await brandService.getBrandFollowers(brandId, limit, offset);

      return res.json({
        success: true,
        data: followers,
      });
    } catch (error) {
      logger.error('Error in getFollowers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brand followers',
        },
      });
    }
  }

  /**
   * Get brand campaigns
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const status = req.query.status as string;

      const campaigns = await brandService.getBrandCampaigns(brandId, status);

      return res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      logger.error('Error in getCampaigns:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brand campaigns',
        },
      });
    }
  }

  /**
   * Get brand rooms
   */
  async getRooms(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const status = req.query.status as string;

      const rooms = await brandService.getBrandRooms(brandId, status);

      return res.json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      logger.error('Error in getRooms:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brand rooms',
        },
      });
    }
  }

  /**
   * Get brand analytics
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const analytics = await brandService.getBrandAnalytics(brandId, days);

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error in getAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brand analytics',
        },
      });
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(req: Request, res: Response) {
    try {
      const { brandId } = req.params;

      const members = await brandService.getTeamMembers(brandId);

      return res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      logger.error('Error in getTeamMembers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get team members',
        },
      });
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId } = req.params;
      const { userId, role } = req.body;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const member = await brandService.addTeamMember(brandId, userId, role);

      return res.status(201).json({
        success: true,
        data: member,
        message: 'Team member added successfully',
      });
    } catch (error) {
      logger.error('Error in addTeamMember:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to add team member',
        },
      });
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId, userId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await brandService.removeTeamMember(brandId, userId);

      return res.json({
        success: true,
        message: 'Team member removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeTeamMember:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove team member',
        },
      });
    }
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId, userId } = req.params;
      const { role } = req.body;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const member = await brandService.updateTeamMemberRole(brandId, userId, role);

      return res.json({
        success: true,
        data: member,
        message: 'Team member role updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateTeamMemberRole:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update team member role',
        },
      });
    }
  }

  /**
   * Search brands
   */
  async searchBrands(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Search query is required',
          },
        });
      }

      const results = await brandService.searchBrands(q as string, limit, offset);

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in searchBrands:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to search brands',
        },
      });
    }
  }

  /**
   * Follow brand
   */
  async followBrand(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { brandId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await prisma.brandFollower.create({
        data: {
          brandId,
          userId,
        },
      });

      return res.json({
        success: true,
        message: 'Brand followed successfully',
      });
    } catch (error) {
      logger.error('Error in followBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to follow brand',
        },
      });
    }
  }

  /**
   * Unfollow brand
   */
  async unfollowBrand(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { brandId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await prisma.brandFollower.delete({
        where: {
          brandId_userId: {
            brandId,
            userId,
          },
        },
      });

      return res.json({
        success: true,
        message: 'Brand unfollowed successfully',
      });
    } catch (error) {
      logger.error('Error in unfollowBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to unfollow brand',
        },
      });
    }
  }
}

export const brandController = new BrandController();