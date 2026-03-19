/**
 * Review Repository
 * Handles database operations for product reviews
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type ReviewCreateInput = Prisma.ProductReviewUncheckedCreateInput;
type ReviewUpdateInput = Prisma.ProductReviewUncheckedUpdateInput;

export class ReviewRepository extends BaseRepository<any, ReviewCreateInput, ReviewUpdateInput> {
  protected modelName = 'productReview';
  protected prismaModel = prisma.productReview;

  /**
   * Get reviews for product
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

    return { reviews, total };
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string, limit: number = 20, offset: number = 0) {
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
  }

  /**
   * Get review statistics
   */
  async getReviewStats(productId: string) {
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
    };
  }

  /**
   * Check if user has reviewed product
   */
  async hasUserReviewed(userId: string, productId: string): Promise<boolean> {
    const count = await prisma.productReview.count({
      where: {
        userId,
        productId,
      },
    });

    return count > 0;
  }

  /**
   * Get review by ID with details
   */
  async getReviewWithDetails(reviewId: string) {
    return prisma.productReview.findUnique({
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
  }

  /**
   * Update review helpful count
   */
  async updateHelpfulCount(reviewId: string) {
    const helpfulCount = await prisma.reviewHelpfulness.count({
      where: {
        reviewId,
        isHelpful: true,
      },
    });

    return prisma.productReview.update({
      where: { id: reviewId },
      data: { helpfulCount },
    });
  }

  /**
   * Get helpful status for user
   */
  async getUserHelpfulStatus(reviewId: string, userId: string) {
    const helpful = await prisma.reviewHelpfulness.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    return helpful?.isHelpful || false;
  }

  /**
   * Toggle helpful
   */
  async toggleHelpful(reviewId: string, userId: string, isHelpful: boolean) {
    await prisma.reviewHelpfulness.upsert({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
      update: { isHelpful },
      create: {
        reviewId,
        userId,
        isHelpful,
      },
    });

    return this.updateHelpfulCount(reviewId);
  }

  /**
   * Get pending reviews (for moderation)
   */
  async getPendingReviews(limit: number = 50, offset: number = 0) {
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { status: 'pending' },
        include: {
          user: {
            select: {
              username: true,
              email: true,
            },
          },
          product: {
            select: {
              name: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.productReview.count({ where: { status: 'pending' } }),
    ]);

    return { reviews, total };
  }

  /**
   * Moderate review
   */
  async moderateReview(reviewId: string, status: string, moderatorId?: string, reason?: string) {
    return prisma.productReview.update({
      where: { id: reviewId },
      data: {
        status,
      },
    });
  }

  /**
   * Get seller reviews
   */
  async getSellerReviews(sponsorId: string, limit: number = 20, offset: number = 0) {
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          product: {
            brand: {
              sponsorId,
            },
          },
          status: 'approved',
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
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.productReview.count({
        where: {
          product: {
            brand: {
              sponsorId,
            },
          },
          status: 'approved',
        },
      }),
    ]);

    return { reviews, total };
  }

  /**
   * Get average rating for seller
   */
  async getSellerAverageRating(sponsorId: string) {
    const result = await prisma.productReview.aggregate({
      where: {
        product: {
          brand: {
            sponsorId,
          },
        },
        status: 'approved',
      },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    return {
      average: result._avg.rating || 0,
      total: result._count,
    };
  }

  /**
   * Delete reviews by product
   */
  async deleteByProduct(productId: string) {
    return prisma.productReview.deleteMany({
      where: { productId },
    });
  }

  /**
   * Get recent reviews
   */
  async getRecentReviews(limit: number = 10) {
    return prisma.productReview.findMany({
      where: { status: 'approved' },
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
    });
  }
}

export const reviewRepository = new ReviewRepository();