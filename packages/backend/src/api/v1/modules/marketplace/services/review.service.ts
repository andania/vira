/**
 * Review Service
 * Handles product reviews and ratings
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { gamificationService } from '../../gamification/services/gamification.service';

export interface ReviewData {
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
}

export class ReviewService {
  /**
   * Create a new review
   */
  async createReview(data: ReviewData) {
    try {
      const { userId, productId, orderId, rating, title, content, pros, cons, images } = data;

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if user already reviewed this product
      const existingReview = await prisma.productReview.findUnique({
        where: {
          productId_userId: {
            productId,
            userId,
          },
        },
      });

      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      // If orderId provided, verify purchase
      if (orderId) {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            userId,
            status: 'delivered',
            items: {
              some: {
                productId,
              },
            },
          },
        });

        if (!order) {
          throw new Error('Verified purchase required');
        }
      }

      // Create review
      const review = await prisma.productReview.create({
        data: {
          userId,
          productId,
          orderId,
          rating,
          title,
          content,
          pros: pros || [],
          cons: cons || [],
          images: images || [],
          isVerifiedPurchase: !!orderId,
          status: 'pending', // Needs moderation
        },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Update product rating
      await this.updateProductRating(productId);

      // Award CAP for review
      await gamificationService.processEvent({
        userId,
        type: 'review',
        value: rating,
        metadata: { productId },
      });

      // Notify brand owner
      await this.notifyBrandOwner(productId, review);

      logger.info(`Review created: ${review.id} for product ${productId}`);
      return review;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Update product rating
   */
  private async updateProductRating(productId: string) {
    const reviews = await prisma.productReview.findMany({
      where: {
        productId,
        status: 'approved',
      },
      select: { rating: true },
    });

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: avgRating,
        ratingCount: reviews.length,
      },
    });

    // Invalidate cache
    await redis.del(`product:${productId}`);
  }

  /**
   * Get product reviews
   */
  async getProductReviews(
    productId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'recent' | 'helpful' | 'rating';
    } = {}
  ) {
    try {
      const {
        status = 'approved',
        limit = 20,
        offset = 0,
        sortBy = 'recent',
      } = options;

      let orderBy: any = { createdAt: 'desc' };
      if (sortBy === 'helpful') {
        orderBy = { helpfulCount: 'desc' };
      } else if (sortBy === 'rating') {
        orderBy = { rating: 'desc' };
      }

      const [reviews, total] = await Promise.all([
        prisma.productReview.findMany({
          where: {
            productId,
            status,
          },
          include: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.productReview.count({
          where: {
            productId,
            status,
          },
        }),
      ]);

      // Get helpful votes for each review
      const reviewsWithHelpful = await Promise.all(
        reviews.map(async (review) => {
          const helpfulCount = await prisma.reviewHelpfulness.count({
            where: {
              reviewId: review.id,
              isHelpful: true,
            },
          });
          return {
            ...review,
            helpfulCount,
          };
        })
      );

      return { reviews: reviewsWithHelpful, total };
    } catch (error) {
      logger.error('Error getting product reviews:', error);
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string) {
    try {
      const review = await prisma.productReview.findUnique({
        where: { id: reviewId },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      return review;
    } catch (error) {
      logger.error('Error getting review:', error);
      throw error;
    }
  }

  /**
   * Update review
   */
  async updateReview(reviewId: string, userId: string, data: Partial<ReviewData>) {
    try {
      const review = await prisma.productReview.findFirst({
        where: {
          id: reviewId,
          userId,
        },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      const updated = await prisma.productReview.update({
        where: { id: reviewId },
        data: {
          rating: data.rating,
          title: data.title,
          content: data.content,
          pros: data.pros,
          cons: data.cons,
          images: data.images,
        },
      });

      // Update product rating
      await this.updateProductRating(review.productId);

      logger.info(`Review ${reviewId} updated`);
      return updated;
    } catch (error) {
      logger.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string) {
    try {
      const review = await prisma.productReview.findFirst({
        where: {
          id: reviewId,
          userId,
        },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      await prisma.productReview.delete({
        where: { id: reviewId },
      });

      // Update product rating
      await this.updateProductRating(review.productId);

      logger.info(`Review ${reviewId} deleted`);
    } catch (error) {
      logger.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, userId: string, helpful: boolean) {
    try {
      const review = await prisma.productReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      await prisma.reviewHelpfulness.upsert({
        where: {
          reviewId_userId: {
            reviewId,
            userId,
          },
        },
        update: { isHelpful: helpful },
        create: {
          reviewId,
          userId,
          isHelpful: helpful,
        },
      });

      // Update helpful count
      const helpfulCount = await prisma.reviewHelpfulness.count({
        where: {
          reviewId,
          isHelpful: true,
        },
      });

      await prisma.productReview.update({
        where: { id: reviewId },
        data: { helpfulCount },
      });

      logger.info(`Review ${reviewId} marked as ${helpful ? 'helpful' : 'not helpful'}`);
    } catch (error) {
      logger.error('Error marking review as helpful:', error);
      throw error;
    }
  }

  /**
   * Moderate review (admin)
   */
  async moderateReview(reviewId: string, status: 'approved' | 'rejected' | 'flagged', reason?: string) {
    try {
      const review = await prisma.productReview.update({
        where: { id: reviewId },
        data: { status },
      });

      // Update product rating if approved
      if (status === 'approved') {
        await this.updateProductRating(review.productId);
      }

      // Notify user
      await notificationService.create({
        userId: review.userId,
        type: 'SYSTEM',
        title: status === 'approved' ? '✅ Review Approved' : '❌ Review Rejected',
        body: status === 'approved'
          ? 'Your review has been approved and published'
          : `Your review was rejected: ${reason || 'Please contact support'}`,
        data: {
          screen: 'reviews',
          action: 'view',
          id: reviewId,
        },
      });

      logger.info(`Review ${reviewId} moderated: ${status}`);
    } catch (error) {
      logger.error('Error moderating review:', error);
      throw error;
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const [reviews, total] = await Promise.all([
        prisma.productReview.findMany({
          where: { userId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.productReview.count({ where: { userId } }),
      ]);

      return { reviews, total };
    } catch (error) {
      logger.error('Error getting user reviews:', error);
      throw error;
    }
  }

  /**
   * Get review statistics for product
   */
  async getReviewStats(productId: string) {
    try {
      const reviews = await prisma.productReview.findMany({
        where: {
          productId,
          status: 'approved',
        },
        select: { rating: true },
      });

      const distribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      reviews.forEach(r => {
        distribution[r.rating as keyof typeof distribution]++;
      });

      const total = reviews.length;
      const average = total > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;

      return {
        total,
        average,
        distribution,
        percentageDistribution: Object.entries(distribution).reduce((acc, [rating, count]) => {
          acc[rating] = total > 0 ? (count / total) * 100 : 0;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logger.error('Error getting review stats:', error);
      throw error;
    }
  }

  /**
   * Notify brand owner of new review
   */
  private async notifyBrandOwner(productId: string, review: any) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          brand: true,
        },
      });

      if (product?.brand?.sponsorId) {
        await notificationService.create({
          userId: product.brand.sponsorId,
          type: 'SYSTEM',
          title: '📝 New Product Review',
          body: `${review.user?.username || 'A user'} reviewed "${product.name}" with ${review.rating} stars`,
          data: {
            screen: 'sponsor',
            action: 'reviews',
            id: productId,
          },
        });
      }
    } catch (error) {
      logger.error('Error notifying brand owner:', error);
    }
  }
}

export const reviewService = new ReviewService();