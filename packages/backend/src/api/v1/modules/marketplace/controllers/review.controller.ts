/**
 * Review Controller
 * Handles HTTP requests for review operations
 */

import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ReviewController {
  /**
   * Create review
   */
  async createReview(req: Request, res: Response) {
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

      const { productId, orderId, rating, title, content, pros, cons } = req.body;

      if (!productId || !rating) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Product ID and rating are required',
          },
        });
      }

      const review = await reviewService.createReview({
        userId,
        productId,
        orderId,
        rating,
        title,
        content,
        pros,
        cons,
      });

      return res.status(201).json({
        success: true,
        data: review,
        message: 'Review submitted successfully',
      });
    } catch (error) {
      logger.error('Error in createReview:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create review',
        },
      });
    }
  }

  /**
   * Get product reviews
   */
  async getProductReviews(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const sortBy = req.query.sortBy as 'recent' | 'helpful' | 'rating' || 'recent';

      const reviews = await reviewService.getProductReviews(productId, {
        limit,
        offset,
        sortBy,
      });

      return res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      logger.error('Error in getProductReviews:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get reviews',
        },
      });
    }
  }

  /**
   * Get review by ID
   */
  async getReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;

      const review = await reviewService.getReviewById(reviewId);

      return res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error('Error in getReview:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Review not found',
        },
      });
    }
  }

  /**
   * Update review
   */
  async updateReview(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const review = await reviewService.updateReview(reviewId, userId, req.body);

      return res.json({
        success: true,
        data: review,
        message: 'Review updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateReview:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update review',
        },
      });
    }
  }

  /**
   * Delete review
   */
  async deleteReview(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await reviewService.deleteReview(reviewId, userId);

      return res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteReview:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete review',
        },
      });
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;
      const { helpful } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await reviewService.markHelpful(reviewId, userId, helpful);

      return res.json({
        success: true,
        message: helpful ? 'Marked as helpful' : 'Removed helpful mark',
      });
    } catch (error) {
      logger.error('Error in markHelpful:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to mark review',
        },
      });
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(req: Request, res: Response) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const reviews = await reviewService.getUserReviews(userId, limit, offset);

      return res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      logger.error('Error in getUserReviews:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user reviews',
        },
      });
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      const stats = await reviewService.getReviewStats(productId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getReviewStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get review statistics',
        },
      });
    }
  }

  /**
   * Moderate review (admin only)
   */
  async moderateReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const { status, reason } = req.body;

      await reviewService.moderateReview(reviewId, status, reason);

      return res.json({
        success: true,
        message: `Review ${status} successfully`,
      });
    } catch (error) {
      logger.error('Error in moderateReview:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to moderate review',
        },
      });
    }
  }

  /**
   * Report review
   */
  async reportReview(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;
      const { reason, description } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Create report
      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedContentType: 'review',
          reportedContentId: reviewId,
          reportType: reason,
          description,
          status: 'pending',
        },
      });

      return res.status(201).json({
        success: true,
        data: report,
        message: 'Review reported successfully',
      });
    } catch (error) {
      logger.error('Error in reportReview:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to report review',
        },
      });
    }
  }
}

export const reviewController = new ReviewController();