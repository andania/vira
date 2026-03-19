/**
 * Budget Service
 * Handles campaign budget management and tracking
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { queueService } from '../../../../../core/queue/bull.queue';

export interface BudgetAlert {
  campaignId: string;
  type: 'daily_limit' | 'total_limit' | 'low_balance';
  threshold: number;
  current: number;
  message: string;
}

export class BudgetService {
  /**
   * Check campaign budget
   */
  async checkCampaignBudget(campaignId: string): Promise<BudgetAlert[]> {
    try {
      const alerts: BudgetAlert[] = [];

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          budgets: true,
          capAllocations: true,
        },
      });

      if (!campaign || !campaign.budgets) {
        return alerts;
      }

      const budget = campaign.budgets[0];
      const capAllocation = campaign.capAllocations[0];

      // Check total budget
      const totalSpentPercentage = (budget.spentBudget / budget.totalBudget) * 100;

      if (totalSpentPercentage >= 100) {
        alerts.push({
          campaignId,
          type: 'total_limit',
          threshold: 100,
          current: totalSpentPercentage,
          message: 'Campaign budget exhausted',
        });

        // Auto-pause campaign if budget exhausted
        await this.pauseCampaignDueToBudget(campaignId, 'Budget exhausted');
      } else if (totalSpentPercentage >= 90) {
        alerts.push({
          campaignId,
          type: 'total_limit',
          threshold: 90,
          current: totalSpentPercentage,
          message: 'Campaign budget is at 90%',
        });
      } else if (totalSpentPercentage >= 80) {
        alerts.push({
          campaignId,
          type: 'total_limit',
          threshold: 80,
          current: totalSpentPercentage,
          message: 'Campaign budget is at 80%',
        });
      }

      // Check daily budget
      if (budget.dailyBudget && budget.dailyBudget > 0) {
        const dailySpentPercentage = (budget.dailySpent / budget.dailyBudget) * 100;

        if (dailySpentPercentage >= 100) {
          alerts.push({
            campaignId,
            type: 'daily_limit',
            threshold: 100,
            current: dailySpentPercentage,
            message: 'Daily budget exhausted',
          });

          // Pause campaign for the day
          await this.pauseCampaignForDay(campaignId);
        } else if (dailySpentPercentage >= 90) {
          alerts.push({
            campaignId,
            type: 'daily_limit',
            threshold: 90,
            current: dailySpentPercentage,
            message: 'Daily budget is at 90%',
          });
        } else if (dailySpentPercentage >= 80) {
          alerts.push({
            campaignId,
            type: 'daily_limit',
            threshold: 80,
            current: dailySpentPercentage,
            message: 'Daily budget is at 80%',
          });
        }
      }

      // Check CAP allocation
      if (capAllocation) {
        const capSpentPercentage = (capAllocation.capSpent / capAllocation.totalCapAllocated) * 100;

        if (capSpentPercentage >= 100) {
          alerts.push({
            campaignId,
            type: 'total_limit',
            threshold: 100,
            current: capSpentPercentage,
            message: 'CAP allocation exhausted',
          });
        }
      }

      // Send notifications for alerts
      for (const alert of alerts) {
        await this.sendBudgetAlert(alert);
      }

      return alerts;
    } catch (error) {
      logger.error('Error checking campaign budget:', error);
      throw error;
    }
  }

  /**
   * Send budget alert notification
   */
  private async sendBudgetAlert(alert: BudgetAlert) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: alert.campaignId },
        include: {
          brand: {
            include: {
              sponsor: true,
            },
          },
        },
      });

      if (!campaign) return;

      let title = '';
      let body = '';
      let priority: 'high' | 'medium' = 'medium';

      switch (alert.type) {
        case 'total_limit':
          if (alert.threshold === 100) {
            title = '⚠️ Campaign Budget Exhausted';
            body = `Your campaign "${campaign.name}" has reached its budget limit and has been paused.`;
            priority = 'high';
          } else {
            title = '📊 Campaign Budget Alert';
            body = `Your campaign "${campaign.name}" has used ${alert.current.toFixed(1)}% of its budget.`;
          }
          break;

        case 'daily_limit':
          if (alert.threshold === 100) {
            title = '⚠️ Daily Budget Exhausted';
            body = `Your campaign "${campaign.name}" has reached its daily budget limit. It will resume tomorrow.`;
            priority = 'high';
          } else {
            title = '📊 Daily Budget Alert';
            body = `Your campaign "${campaign.name}" has used ${alert.current.toFixed(1)}% of its daily budget.`;
          }
          break;

        case 'low_balance':
          title = '💰 Low Campaign Balance';
          body = alert.message;
          break;
      }

      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        priority,
        title,
        body,
        data: {
          screen: 'campaign',
          action: 'view',
          id: campaign.id,
        },
      });
    } catch (error) {
      logger.error('Error sending budget alert:', error);
    }
  }

  /**
   * Pause campaign due to budget
   */
  private async pauseCampaignDueToBudget(campaignId: string, reason: string) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'PAUSED',
        },
      });

      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'PAUSED' },
      });

      logger.info(`Campaign ${campaignId} paused due to budget: ${reason}`);
    } catch (error) {
      logger.error('Error pausing campaign due to budget:', error);
    }
  }

  /**
   * Pause campaign for the day
   */
  private async pauseCampaignForDay(campaignId: string) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'PAUSED',
        },
      });

      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'PAUSED' },
      });

      // Schedule resume for next day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await queueService.add('campaign', {
        campaignId,
        action: 'resume',
      }, { delay: tomorrow.getTime() - Date.now() });

      logger.info(`Campaign ${campaignId} paused for the day, will resume tomorrow`);
    } catch (error) {
      logger.error('Error pausing campaign for the day:', error);
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { budgets: true },
      });

      if (!campaign) return;

      // Check if campaign still has budget
      const budget = campaign.budgets?.[0];
      if (budget && budget.spentBudget >= budget.totalBudget) {
        logger.info(`Campaign ${campaignId} cannot resume - budget exhausted`);
        return;
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'ACTIVE',
        },
      });

      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'ACTIVE' },
      });

      logger.info(`Campaign ${campaignId} resumed`);
    } catch (error) {
      logger.error('Error resuming campaign:', error);
    }
  }

  /**
   * Deduct from campaign budget
   */
  async deductFromBudget(campaignId: string, amount: number, type: 'cap' | 'fiat' = 'cap') {
    try {
      await prisma.$transaction(async (tx) => {
        // Update campaign budget
        const budget = await tx.campaignBudget.findUnique({
          where: { campaignId },
        });

        if (!budget) {
          throw new Error('Campaign budget not found');
        }

        const fiatAmount = type === 'cap' ? amount / 100 : amount;

        if (budget.spentBudget + fiatAmount > budget.totalBudget) {
          throw new Error('Campaign budget exceeded');
        }

        await tx.campaignBudget.update({
          where: { campaignId },
          data: {
            spentBudget: budget.spentBudget + fiatAmount,
            dailySpent: budget.dailySpent + fiatAmount,
          },
        });

        // Update CAP allocation if applicable
        if (type === 'cap') {
          const capAllocation = await tx.campaignCapAllocation.findUnique({
            where: { campaignId },
          });

          if (capAllocation) {
            await tx.campaignCapAllocation.update({
              where: { campaignId },
              data: {
                capSpent: capAllocation.capSpent + amount,
              },
            });
          }
        }

        // Check budget after deduction
        await this.checkCampaignBudget(campaignId);
      });
    } catch (error) {
      logger.error('Error deducting from budget:', error);
      throw error;
    }
  }

  /**
   * Reset daily budget
   */
  async resetDailyBudget(campaignId: string) {
    try {
      await prisma.campaignBudget.update({
        where: { campaignId },
        data: {
          dailySpent: 0,
          dailyResetDate: new Date(),
        },
      });

      // Resume campaign if it was paused due to daily limit
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (campaign?.status === 'PAUSED') {
        const budget = await prisma.campaignBudget.findUnique({
          where: { campaignId },
        });

        if (budget && budget.spentBudget < budget.totalBudget) {
          await this.resumeCampaign(campaignId);
        }
      }

      logger.info(`Daily budget reset for campaign ${campaignId}`);
    } catch (error) {
      logger.error('Error resetting daily budget:', error);
    }
  }

  /**
   * Get budget utilization report
   */
  async getBudgetReport(campaignId: string, days: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          budgets: true,
          capAllocations: true,
          metrics: {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
            orderBy: { date: 'asc' },
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const budget = campaign.budgets?.[0];
      const capAllocation = campaign.capAllocations?.[0];

      // Calculate daily spend
      const dailySpend = campaign.metrics.map(m => ({
        date: m.date,
        spend: m.capSpent / 100, // Convert to fiat
      }));

      // Project remaining budget
      const avgDailySpend = dailySpend.reduce((sum, d) => sum + d.spend, 0) / dailySpend.length || 0;
      const remainingDays = budget ? (budget.totalBudget - budget.spentBudget) / avgDailySpend : 0;

      return {
        campaignId,
        campaignName: campaign.name,
        period: {
          startDate,
          endDate,
          days,
        },
        budget: budget ? {
          total: budget.totalBudget,
          spent: budget.spentBudget,
          remaining: budget.totalBudget - budget.spentBudget,
          spentPercentage: (budget.spentBudget / budget.totalBudget) * 100,
          dailyBudget: budget.dailyBudget,
          avgDailySpend,
          estimatedDaysRemaining: remainingDays,
        } : null,
        capAllocation: capAllocation ? {
          total: capAllocation.totalCapAllocated,
          spent: capAllocation.capSpent,
          remaining: capAllocation.totalCapAllocated - capAllocation.capSpent,
          spentPercentage: (capAllocation.capSpent / capAllocation.totalCapAllocated) * 100,
        } : null,
        dailySpend,
      };
    } catch (error) {
      logger.error('Error getting budget report:', error);
      throw error;
    }
  }

  /**
   * Get campaigns with low budget
   */
  async getLowBudgetCampaigns(threshold: number = 20) {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          budgets: {
            some: {
              spentBudget: {
                gte: 0, // Will filter in memory
              },
            },
          },
        },
        include: {
          budgets: true,
        },
      });

      const lowBudgetCampaigns = campaigns.filter(c => {
        const budget = c.budgets?.[0];
        if (!budget) return false;
        const remainingPercentage = ((budget.totalBudget - budget.spentBudget) / budget.totalBudget) * 100;
        return remainingPercentage <= threshold;
      });

      return lowBudgetCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        budget: c.budgets?.[0],
        remainingPercentage: c.budgets?.[0] 
          ? ((c.budgets[0].totalBudget - c.budgets[0].spentBudget) / c.budgets[0].totalBudget) * 100
          : 0,
      }));
    } catch (error) {
      logger.error('Error getting low budget campaigns:', error);
      throw error;
    }
  }

  /**
   * Allocate budget to campaign
   */
  async allocateBudget(campaignId: string, amount: number, currency: string = 'USD') {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { budgets: true },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const budget = campaign.budgets?.[0];

      await prisma.$transaction(async (tx) => {
        // Update budget
        if (budget) {
          await tx.campaignBudget.update({
            where: { campaignId },
            data: {
              totalBudget: budget.totalBudget + amount,
            },
          });
        } else {
          await tx.campaignBudget.create({
            data: {
              campaignId,
              totalBudget: amount,
              spentBudget: 0,
              reservedBudget: 0,
              dailySpent: 0,
              currency,
            },
          });
        }

        // Update CAP allocation
        const capAllocation = await tx.campaignCapAllocation.findUnique({
          where: { campaignId },
        });

        if (capAllocation) {
          await tx.campaignCapAllocation.update({
            where: { campaignId },
            data: {
              totalCapAllocated: capAllocation.totalCapAllocated + amount * 100,
            },
          });
        } else {
          await tx.campaignCapAllocation.create({
            data: {
              campaignId,
              totalCapAllocated: amount * 100,
              capSpent: 0,
            },
          });
        }
      });

      logger.info(`Budget allocated to campaign ${campaignId}: ${amount} ${currency}`);

      // Send notification
      await notificationService.create({
        userId: campaign.createdBy,
        type: 'FINANCIAL',
        title: '💰 Campaign Funded',
        body: `$${amount} added to campaign "${campaign.name}"`,
        data: {
          screen: 'campaign',
          action: 'view',
          id: campaignId,
        },
      });
    } catch (error) {
      logger.error('Error allocating budget:', error);
      throw error;
    }
  }
}

export const budgetService = new BudgetService();