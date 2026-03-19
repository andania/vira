/**
 * Sponsor Repository
 * Handles database operations for sponsors
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class SponsorRepository extends BaseRepository<any, any, any> {
  protected modelName = 'sponsor';
  protected prismaModel = prisma.sponsor;

  /**
   * Find sponsor by user ID
   */
  async findByUserId(userId: string) {
    return prisma.sponsor.findUnique({
      where: { id: userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            profile: true,
          },
        },
      },
    });
  }

  /**
   * Get sponsor with brands
   */
  async getSponsorWithBrands(sponsorId: string) {
    return prisma.sponsor.findUnique({
      where: { id: sponsorId },
      include: {
        brands: {
          include: {
            _count: {
              select: {
                campaigns: true,
                followers: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get sponsors by verification status
   */
  async getByVerificationStatus(status: string, limit: number = 50, offset: number = 0) {
    const [sponsors, total] = await Promise.all([
      prisma.sponsor.findMany({
        where: { verificationStatus: status as any },
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sponsor.count({ where: { verificationStatus: status as any } }),
    ]);

    return { sponsors, total };
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(sponsorId: string, tier: string, expiresAt?: Date) {
    return prisma.sponsor.update({
      where: { id: sponsorId },
      data: {
        subscriptionTier: tier,
        subscriptionExpires: expiresAt,
      },
    });
  }

  /**
   * Update credit limit
   */
  async updateCreditLimit(sponsorId: string, limit: number) {
    return prisma.sponsor.update({
      where: { id: sponsorId },
      data: { creditLimit: limit },
    });
  }

  /**
   * Get sponsor payment methods
   */
  async getPaymentMethods(sponsorId: string) {
    return prisma.paymentMethod.findMany({
      where: {
        userId: sponsorId,
        isActive: true,
      },
    });
  }

  /**
   * Get sponsor transactions
   */
  async getTransactions(sponsorId: string, limit: number = 50, offset: number = 0) {
    return prisma.paymentTransaction.findMany({
      where: { userId: sponsorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get sponsor statistics
   */
  async getSponsorStats(sponsorId: string) {
    const [totalCampaigns, activeCampaigns, totalSpend, totalRevenue] = await Promise.all([
      prisma.campaign.count({
        where: { brand: { sponsorId } },
      }),
      prisma.campaign.count({
        where: {
          brand: { sponsorId },
          status: 'ACTIVE',
        },
      }),
      prisma.paymentTransaction.aggregate({
        where: {
          userId: sponsorId,
          type: 'payment',
        },
        _sum: { amount: true },
      }),
      this.calculateSponsorRevenue(sponsorId),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalSpend: totalSpend._sum.amount || 0,
      totalRevenue,
    };
  }

  /**
   * Calculate sponsor revenue
   */
  private async calculateSponsorRevenue(sponsorId: string): Promise<number> {
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              brand: {
                sponsorId,
              },
            },
          },
        },
        status: 'COMPLETED',
      },
      select: { totalFiat: true },
    });

    return orders.reduce((sum, order) => sum + order.totalFiat, 0);
  }

  /**
   * Get sponsors with expiring subscriptions
   */
  async getExpiringSubscriptions(days: number = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.sponsor.findMany({
      where: {
        subscriptionExpires: {
          lte: endDate,
          gte: new Date(),
        },
      },
    });
  }
}

export const sponsorRepository = new SponsorRepository();