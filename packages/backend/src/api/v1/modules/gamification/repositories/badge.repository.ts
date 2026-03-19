/**
 * Badge Repository
 * Handles database operations for badges
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class BadgeRepository extends BaseRepository<any, any, any> {
  protected modelName = 'badge';
  protected prismaModel = prisma.badge;

  /**
   * Get all badges
   */
  async getAllBadges() {
    return prisma.badge.findMany({
      orderBy: { rarity: 'asc' },
    });
  }

  /**
   * Get badges by rarity
   */
  async getBadgesByRarity(rarity: string) {
    return prisma.badge.findMany({
      where: { rarity },
    });
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: { earnedAt: 'desc' },
    });
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeId: string) {
    return prisma.userBadge.create({
      data: {
        userId,
        badgeId,
      },
    });
  }

  /**
   * Check if user has badge
   */
  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const count = await prisma.userBadge.count({
      where: {
        userId,
        badgeId,
      },
    });
    return count > 0;
  }

  /**
   * Get user's featured badge
   */
  async getFeaturedBadge(userId: string) {
    return prisma.userBadge.findFirst({
      where: {
        userId,
        isFeatured: true,
      },
      include: {
        badge: true,
      },
    });
  }

  /**
   * Set featured badge
   */
  async setFeaturedBadge(userId: string, badgeId: string) {
    return prisma.$transaction(async (tx) => {
      // Remove current featured
      await tx.userBadge.updateMany({
        where: {
          userId,
          isFeatured: true,
        },
        data: { isFeatured: false },
      });

      // Set new featured
      return tx.userBadge.update({
        where: {
          userId_badgeId: {
            userId,
            badgeId,
          },
        },
        data: { isFeatured: true },
      });
    });
  }

  /**
   * Get badge statistics
   */
  async getBadgeStats() {
    const [total, byRarity, mostEarned] = await Promise.all([
      prisma.badge.count(),
      prisma.badge.groupBy({
        by: ['rarity'],
        _count: true,
      }),
      prisma.userBadge.groupBy({
        by: ['badgeId'],
        _count: true,
        orderBy: {
          _count: {
            badgeId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      total,
      byRarity: byRarity.reduce((acc, curr) => {
        acc[curr.rarity] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      mostEarned: mostEarned.map(m => ({
        badgeId: m.badgeId,
        count: m._count,
      })),
    };
  }

  /**
   * Get users with most badges
   */
  async getTopBadgeHolders(limit: number = 10) {
    const holders = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    const userIds = holders.map(h => h.userId);
    
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            badges: true,
          },
        },
      },
    });
  }

  /**
   * Create badge
   */
  async createBadge(data: any) {
    return prisma.badge.create({
      data,
    });
  }

  /**
   * Update badge
   */
  async updateBadge(id: string, data: any) {
    return prisma.badge.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete badge
   */
  async deleteBadge(id: string) {
    return prisma.badge.delete({
      where: { id },
    });
  }
}

export const badgeRepository = new BadgeRepository();