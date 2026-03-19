/**
 * Cart Controller
 * Handles HTTP requests for cart operations
 */

import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class CartController {
  /**
   * Get user's cart
   */
  async getCart(req: Request, res: Response) {
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

      const cart = await cartService.getCart(userId);

      return res.json({
        success: true,
        data: cart,
      });
    } catch (error) {
      logger.error('Error in getCart:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get cart',
        },
      });
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(req: Request, res: Response) {
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

      const summary = await cartService.getCartSummary(userId);

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error in getCartSummary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get cart summary',
        },
      });
    }
  }

  /**
   * Add item to cart
   */
  async addItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId, variantId, quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Product ID and quantity are required',
          },
        });
      }

      const cart = await cartService.addItem(userId, {
        productId,
        variantId,
        quantity,
      });

      return res.json({
        success: true,
        data: cart,
        message: 'Item added to cart',
      });
    } catch (error) {
      logger.error('Error in addItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to add item to cart',
        },
      });
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Valid quantity is required',
          },
        });
      }

      const cart = await cartService.updateItemQuantity(userId, itemId, quantity);

      return res.json({
        success: true,
        data: cart,
        message: 'Cart updated',
      });
    } catch (error) {
      logger.error('Error in updateItemQuantity:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update cart',
        },
      });
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const cart = await cartService.removeItem(userId, itemId);

      return res.json({
        success: true,
        data: cart,
        message: 'Item removed from cart',
      });
    } catch (error) {
      logger.error('Error in removeItem:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove item from cart',
        },
      });
    }
  }

  /**
   * Clear cart
   */
  async clearCart(req: Request, res: Response) {
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

      await cartService.clearCart(userId);

      return res.json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      logger.error('Error in clearCart:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to clear cart',
        },
      });
    }
  }

  /**
   * Validate cart
   */
  async validateCart(req: Request, res: Response) {
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

      const issues = await cartService.validateCart(userId);

      return res.json({
        success: true,
        data: {
          isValid: issues.length === 0,
          issues,
        },
      });
    } catch (error) {
      logger.error('Error in validateCart:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to validate cart',
        },
      });
    }
  }

  /**
   * Apply discount
   */
  async applyDiscount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { discountCode } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const result = await cartService.applyDiscount(userId, discountCode);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in applyDiscount:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to apply discount',
        },
      });
    }
  }

  /**
   * Estimate shipping
   */
  async estimateShipping(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { addressId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const estimate = await cartService.estimateShipping(userId, addressId);

      return res.json({
        success: true,
        data: estimate,
      });
    } catch (error) {
      logger.error('Error in estimateShipping:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to estimate shipping',
        },
      });
    }
  }
}

export const cartController = new CartController();