/**
 * Marketplace Middleware
 * Marketplace-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if user can access product (owner check)
 */
export const canAccessProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const productId = req.params.productId;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Product not found',
        },
      });
    }

    // Public can view active products
    if (req.method === 'GET' && product.status === 'ACTIVE') {
      return next();
    }

    // Check if user is the brand owner or admin
    const isOwner = product.brand?.sponsorId === userId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'You do not have permission to access this product',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in canAccessProduct middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify product access',
      },
    });
  }
};

/**
 * Check if user can access order
 */
export const canAccessOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const orderId = req.params.orderId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Order not found',
        },
      });
    }

    // Users can view their own orders
    if (order.userId === userId) {
      return next();
    }

    // Check if user is seller (brand owner) for this order
    const isSeller = await prisma.orderItem.findFirst({
      where: {
        orderId,
        product: {
          brand: {
            sponsorId: userId,
          },
        },
      },
    });

    if (isSeller || req.user?.role === 'ADMIN') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not have permission to access this order',
      },
    });
  } catch (error) {
    logger.error('Error in canAccessOrder middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify order access',
      },
    });
  }
};

/**
 * Check if user can access review
 */
export const canAccessReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const reviewId = req.params.reviewId;

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Review not found',
        },
      });
    }

    // Review owner can edit
    if (review.userId === userId) {
      return next();
    }

    // Brand owner can respond to reviews
    if (review.product.brand?.sponsorId === userId) {
      return next();
    }

    // Admin can moderate
    if (req.user?.role === 'ADMIN') {
      return next();
    }

    // Others can only view
    if (req.method === 'GET') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not have permission to modify this review',
      },
    });
  } catch (error) {
    logger.error('Error in canAccessReview middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify review access',
      },
    });
  }
};

/**
 * Check if user can access wishlist
 */
export const canAccessWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const wishlistId = req.params.wishlistId;

    const wishlist = await prisma.wishlist.findUnique({
      where: { id: wishlistId },
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Wishlist not found',
        },
      });
    }

    // Owner can access
    if (wishlist.userId === userId) {
      return next();
    }

    // Public wishlists can be viewed
    if (wishlist.isPublic && req.method === 'GET') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not have permission to access this wishlist',
      },
    });
  } catch (error) {
    logger.error('Error in canAccessWishlist middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify wishlist access',
      },
    });
  }
};

/**
 * Validate cart before checkout
 */
export const validateCartForCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const cart = await prisma.shoppingCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Cart is empty',
        },
      });
    }

    // Validate each item
    const errors = [];
    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE') {
        errors.push(`Product ${item.product.name} is no longer available`);
      } else if (item.product.stockQuantity < item.quantity) {
        errors.push(`Insufficient stock for ${item.product.name}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Cart validation failed',
          details: errors,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in validateCartForCheckout middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate cart',
      },
    });
  }
};

/**
 * Rate limit for marketplace actions
 */
export const marketplaceRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip;
  const action = req.path + req.method;
  
  const key = `ratelimit:marketplace:${userId}:${action}`;
  const limit = 100; // 100 operations per hour
  const windowMs = 60 * 60 * 1000; // 1 hour

  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowMs / 1000);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many marketplace operations. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in marketplaceRateLimit middleware:', error);
    next();
  }
};

/**
 * Cache product data
 */
export const cacheProduct = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const productId = req.params.productId;
    const cacheKey = `product:${productId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return res.json({
          success: true,
          data,
          cached: true,
        });
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(body) {
        if (body.success && body.data) {
          redis.setex(cacheKey, ttl, JSON.stringify(body.data)).catch(console.error);
        }
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error('Error in cacheProduct middleware:', error);
      next();
    }
  };
};

/**
 * Validate product data before creation
 */
export const validateProductData = (req: Request, res: Response, next: NextFunction) => {
  const { priceCap, priceFiat, isDigital, digitalDownloadUrl } = req.body;

  // Either priceCap or priceFiat must be provided
  if (!priceCap && !priceFiat) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Either CAP price or fiat price must be provided',
      },
    });
  }

  // Digital products must have download URL
  if (isDigital && !digitalDownloadUrl) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Digital products must have a download URL',
      },
    });
  }

  next();
};

/**
 * Track product view
 */
export const trackProductView = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const productId = req.params.productId;

  if (productId) {
    // Increment view count asynchronously
    setImmediate(async () => {
      try {
        await prisma.product.update({
          where: { id: productId },
          data: { viewsCount: { increment: 1 } },
        });

        if (userId) {
          await prisma.contentView.create({
            data: {
              userId,
              targetType: 'product',
              targetId: productId,
            },
          });
        }
      } catch (error) {
        logger.error('Error tracking product view:', error);
      }
    });
  }

  next();
};

/**
 * Check stock availability
 */
export const checkStockAvailability = async (req: Request, res: Response, next: NextFunction) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return next();
  }

  try {
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: `Product ${item.productId} not found`,
          },
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_STOCK,
            message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`,
          },
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error in checkStockAvailability middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to check stock availability',
      },
    });
  }
};

/**
 * Validate review content
 */
export const validateReviewContent = (req: Request, res: Response, next: NextFunction) => {
  const { content, rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Rating must be between 1 and 5',
      },
    });
  }

  if (content && content.length > 2000) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Review content cannot exceed 2000 characters',
      },
    });
  }

  next();
};