/**
 * Sponsor Service
 * Handles sponsor account management and operations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { walletService } from '../../wallet/services/wallet.service';

export interface SponsorProfile {
  id: string;
  companyName: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
  businessCategory?: string;
  website?: string;
  verificationStatus: string;
  subscriptionTier: string;
  subscriptionExpires?: Date;
  creditLimit: number;
}

export interface SponsorStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalEngagements: number;
  averageCTR: number;
  averageEngagementRate: number;
  roi: number;
}

export class SponsorService {
  /**
   * Get sponsor profile
   */
  async getSponsorProfile(sponsorId: string): Promise<SponsorProfile> {
    try {
      const sponsor = await prisma.sponsor.findUnique({
        where: { id: sponsorId },
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

      if (!sponsor) {
        throw new Error('Sponsor not found');
      }

      return {
        id: sponsor.id,
        companyName: sponsor.companyName,
        registrationNumber: sponsor.registrationNumber || undefined,
        taxId: sponsor.taxId || undefined,
        businessType: sponsor.businessType || undefined,
        businessCategory: sponsor.businessCategory || undefined,
        website: sponsor.website || undefined,
        verificationStatus: sponsor.verificationStatus,
        subscriptionTier: sponsor.subscriptionTier,
        subscriptionExpires: sponsor.subscriptionExpires || undefined,
        creditLimit: sponsor.creditLimit,
      };
    } catch (error) {
      logger.error('Error getting sponsor profile:', error);
      throw error;
    }
  }

  /**
   * Update sponsor profile
   */
  async updateSponsorProfile(sponsorId: string, data: Partial<SponsorProfile>) {
    try {
      const sponsor = await prisma.sponsor.update({
        where: { id: sponsorId },
        data: {
          companyName: data.companyName,
          registrationNumber: data.registrationNumber,
          taxId: data.taxId,
          businessType: data.businessType,
          businessCategory: data.businessCategory,
          website: data.website,
        },
      });

      logger.info(`Sponsor profile updated: ${sponsorId}`);
      return sponsor;
    } catch (error) {
      logger.error('Error updating sponsor profile:', error);
      throw error;
    }
  }

  /**
   * Get sponsor statistics
   */
  async getSponsorStats(sponsorId: string): Promise<SponsorStats> {
    try {
      const [campaigns, metrics] = await Promise.all([
        prisma.campaign.findMany({
          where: {
            brand: {
              sponsorId,
            },
          },
          include: {
            metrics: true,
          },
        }),
        prisma.campaignMetric.aggregate({
          where: {
            campaign: {
              brand: {
                sponsorId,
              },
            },
          },
          _sum: {
            impressions: true,
            clicks: true,
            engagements: true,
            capSpent: true,
          },
        }),
      ]);

      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
      const totalSpend = metrics._sum.capSpent || 0;
      const totalImpressions = metrics._sum.impressions || 0;
      const totalClicks = metrics._sum.clicks || 0;
      const totalEngagements = metrics._sum.engagements || 0;

      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const averageEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
      
      // Calculate ROI (simplified)
      const totalRevenue = await this.calculateSponsorRevenue(sponsorId);
      const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

      return {
        totalCampaigns,
        activeCampaigns,
        totalSpend,
        totalImpressions,
        totalClicks,
        totalEngagements,
        averageCTR,
        averageEngagementRate,
        roi,
      };
    } catch (error) {
      logger.error('Error getting sponsor stats:', error);
      throw error;
    }
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
      select: {
        totalFiat: true,
      },
    });

    return orders.reduce((sum, order) => sum + order.totalFiat, 0);
  }

  /**
   * Get sponsor brands
   */
  async getSponsorBrands(sponsorId: string) {
    try {
      const brands = await prisma.brand.findMany({
        where: { sponsorId },
        include: {
          _count: {
            select: {
              campaigns: true,
              followers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return brands;
    } catch (error) {
      logger.error('Error getting sponsor brands:', error);
      throw error;
    }
  }

  /**
   * Create brand for sponsor
   */
  async createBrand(sponsorId: string, data: any) {
    try {
      const brand = await prisma.brand.create({
        data: {
          sponsorId,
          name: data.name,
          description: data.description,
          industry: data.industry,
          logoUrl: data.logoUrl,
          website: data.website,
        },
      });

      logger.info(`Brand created: ${brand.id} for sponsor ${sponsorId}`);
      return brand;
    } catch (error) {
      logger.error('Error creating brand:', error);
      throw error;
    }
  }

  /**
   * Update brand
   */
  async updateBrand(brandId: string, sponsorId: string, data: any) {
    try {
      const brand = await prisma.brand.update({
        where: {
          id: brandId,
          sponsorId,
        },
        data,
      });

      logger.info(`Brand updated: ${brandId}`);
      return brand;
    } catch (error) {
      logger.error('Error updating brand:', error);
      throw error;
    }
  }

  /**
   * Delete brand
   */
  async deleteBrand(brandId: string, sponsorId: string) {
    try {
      await prisma.brand.delete({
        where: {
          id: brandId,
          sponsorId,
        },
      });

      logger.info(`Brand deleted: ${brandId}`);
    } catch (error) {
      logger.error('Error deleting brand:', error);
      throw error;
    }
  }

  /**
   * Get sponsor payment methods
   */
  async getPaymentMethods(sponsorId: string) {
    try {
      const methods = await prisma.paymentMethod.findMany({
        where: {
          userId: sponsorId,
          isActive: true,
        },
      });

      return methods;
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(sponsorId: string, data: any) {
    try {
      const method = await prisma.paymentMethod.create({
        data: {
          userId: sponsorId,
          ...data,
        },
      });

      logger.info(`Payment method added for sponsor ${sponsorId}`);
      return method;
    } catch (error) {
      logger.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(methodId: string, sponsorId: string) {
    try {
      await prisma.paymentMethod.delete({
        where: {
          id: methodId,
          userId: sponsorId,
        },
      });

      logger.info(`Payment method ${methodId} removed`);
    } catch (error) {
      logger.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Get sponsor transactions
   */
  async getTransactions(sponsorId: string, limit: number = 50, offset: number = 0) {
    try {
      const [transactions, total] = await Promise.all([
        prisma.paymentTransaction.findMany({
          where: { userId: sponsorId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.paymentTransaction.count({ where: { userId: sponsorId } }),
      ]);

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting sponsor transactions:', error);
      throw error;
    }
  }

  /**
   * Get sponsor invoices
   */
  async getInvoices(sponsorId: string, limit: number = 50, offset: number = 0) {
    try {
      const [invoices, total] = await Promise.all([
        prisma.paymentInvoice.findMany({
          where: { transaction: { userId: sponsorId } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            transaction: true,
          },
        }),
        prisma.paymentInvoice.count({
          where: { transaction: { userId: sponsorId } },
        }),
      ]);

      return { invoices, total };
    } catch (error) {
      logger.error('Error getting sponsor invoices:', error);
      throw error;
    }
  }

  /**
   * Verify sponsor
   */
  async verifySponsor(sponsorId: string, verifiedBy: string) {
    try {
      const sponsor = await prisma.sponsor.update({
        where: { id: sponsorId },
        data: {
          verificationStatus: 'verified',
          verifiedBy,
          verifiedAt: new Date(),
        },
      });

      // Send notification
      await notificationService.create({
        userId: sponsorId,
        type: 'SYSTEM',
        title: '✅ Account Verified',
        body: 'Your sponsor account has been verified. You can now create campaigns.',
        data: {
          screen: 'sponsor',
          action: 'dashboard',
        },
      });

      logger.info(`Sponsor ${sponsorId} verified by ${verifiedBy}`);
      return sponsor;
    } catch (error) {
      logger.error('Error verifying sponsor:', error);
      throw error;
    }
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(sponsorId: string, tier: string, expiresAt?: Date) {
    try {
      const sponsor = await prisma.sponsor.update({
        where: { id: sponsorId },
        data: {
          subscriptionTier: tier,
          subscriptionExpires: expiresAt,
        },
      });

      logger.info(`Sponsor ${sponsorId} subscription updated to ${tier}`);
      return sponsor;
    } catch (error) {
      logger.error('Error updating subscription tier:', error);
      throw error;
    }
  }

  /**
   * Get sponsor dashboard data
   */
  async getDashboardData(sponsorId: string) {
    try {
      const [profile, stats, brands, recentTransactions] = await Promise.all([
        this.getSponsorProfile(sponsorId),
        this.getSponsorStats(sponsorId),
        this.getSponsorBrands(sponsorId),
        this.getTransactions(sponsorId, 10),
      ]);

      return {
        profile,
        stats,
        brands,
        recentTransactions: recentTransactions.transactions,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }
}

export const sponsorService = new SponsorService();