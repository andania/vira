/**
 * Wishlist Controller
 * Handles HTTP requests for wishlist operations
 */

import { Request, Response } from 'express';
import { wishlistService } from '../services/wishlist.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class WishlistController {
  /**
   * Get user's wishlists
   */
  async getUserWishlists(req: Request, res: Response) {
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

      const wishlists = await wishlistService.getUserWishlists(userId);

      return res.json({
        success: true,
        data: wishlists,
      });
    } catch (error) {
      logger.error('Error in getUserWishlists:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get wishlists',
        },
      });
    }
  }

  /**
   * Create wishlist
   */
  async createWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, isPublic } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const wishlist = await wishlistService.createWishlist({
        userId,
        name,
        isPublic,
      });

      return res.status(201).json({
        success: true,
        data: wishlist,
        message: 'Wishlist created successfully',
      });
    } catch (error) {
      logger.error('Error in createWishlist:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create wishlist',
        },
      });
    }
  }

  /**
   * Get wishlist details
   */
  async getWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const wishlist = await wishlistService.getWishlistDetails(wishlistId, userId);

      return res.json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      logger.error('Error in getWishlist:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Wishlist not found',
        },
      });
    }
  }

  /**
   * Update wishlist
   */
  async updateWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId } = req.params;
      const { name, isPublic } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const wishlist = await wishlistService.updateWishlist(wishlistId, userId, {
        name,
        isPublic,
      });

      return res.json({
        success: true,
        data: wishlist,
        message: 'Wishlist updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateWishlist:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update wishlist',
        },
      });
    }
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await wishlistService.deleteWishlist(wishlistId, userId);

      return res.json({
        success: true,
        message: 'Wishlist deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteWishlist:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete wishlist',
        },
      });
    }
  }

  /**
   * Add item to wishlist
   */
  async addItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId } = req.params;
      const { productId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const item = await wishlistService.addItem(wishlistId, userId, productId);

      return res.json({
        success: true,
        data: item,
        message: 'Item added to wishlist',
      });
    } catch (error) {
      logger.error('Error in addItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to add item to wishlist',
        },
      });
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId, itemId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await wishlistService.removeItem(wishlistId, userId, itemId);

      return res.json({
        success: true,
        message: 'Item removed from wishlist',
      });
    } catch (error) {
      logger.error('Error in removeItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove item from wishlist',
        },
      });
    }
  }

  /**
   * Move item to another wishlist
   */
  async moveItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { targetWishlistId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await wishlistService.moveItem(itemId, userId, targetWishlistId);

      return res.json({
        success: true,
        message: 'Item moved successfully',
      });
    } catch (error) {
      logger.error('Error in moveItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to move item',
        },
      });
    }
  }

  /**
   * Copy item to another wishlist
   */
  async copyItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { targetWishlistId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await wishlistService.copyItem(itemId, userId, targetWishlistId);

      return res.json({
        success: true,
        message: 'Item copied successfully',
      });
    } catch (error) {
      logger.error('Error in copyItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to copy item',
        },
      });
    }
  }

  /**
   * Check if product is in wishlist
   */
  async checkInWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const isInWishlist = await wishlistService.isInWishlist(userId, productId);

      return res.json({
        success: true,
        data: { isInWishlist },
      });
    } catch (error) {
      logger.error('Error in checkInWishlist:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check wishlist',
        },
      });
    }
  }

  /**
   * Get wishlist suggestions
   */
  async getSuggestions(req: Request, res: Response) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const suggestions = await wishlistService.getWishlistSuggestions(userId, limit);

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
   * Share wishlist
   */
  async shareWishlist(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { wishlistId } = req.params;
      const { email } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const shareInfo = await wishlistService.shareWishlist(wishlistId, userId, email);

      return res.json({
        success: true,
        data: shareInfo,
        message: 'Wishlist shared successfully',
      });
    } catch (error) {
      logger.error('Error in shareWishlist:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to share wishlist',
        },
      });
    }
  }

  /**
   * Get shared wishlist by token
   */
  async getSharedWishlist(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const wishlist = await wishlistService.getSharedWishlist(token);

      return res.json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      logger.error('Error in getSharedWishlist:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Shared wishlist not found',
        },
      });
    }
  }

  /**
   * Get public wishlists
   */
  async getPublicWishlists(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const wishlists = await wishlistService.getPublicWishlists(limit, offset);

      return res.json({
        success: true,
        data: wishlists,
      });
    } catch (error) {
      logger.error('Error in getPublicWishlists:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get public wishlists',
        },
      });
    }
  }
}

export const wishlistController = new WishlistController();