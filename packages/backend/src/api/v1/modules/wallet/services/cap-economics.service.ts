/**
 * CAP Economics Service
 * Handles CAP value calculations, decay, and economic adjustments
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { 
  CAP_ECONOMICS,
  CAP_DECAY_RATES,
  applyCapDecay,
  calculateCapValue
} from '@viraz/shared';

export class CapEconomicsService {
  /**
   * Calculate current CAP value based on market conditions
   */
  async calculateCurrentCapValue() {
    try {
      const [totalCap, totalReserve, activeUsers] = await Promise.all([
        prisma.capWallet.aggregate({
          _sum: { balance: true },
        }),
        prisma.capDeposit.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { fiatAmount: true },
        }),
        prisma.user.count({
          where: {
            status: 'ACTIVE',
            lastActiveAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      const totalCapInCirculation = totalCap._sum.balance || 0;
      const totalFiatReserve = totalReserve._sum.fiatAmount || 0;

      // Apply economic model
      const baseValue = calculateCapValue(
        totalCapInCirculation,
        totalFiatReserve,
        CAP_ECONOMICS.STABILITY_RESERVE_RATIO
      );

      // Adjust for user activity (more active users = higher demand = higher value)
      const activityMultiplier = 1 + (activeUsers / 1000000); // 1M users = 2x multiplier
      const adjustedValue = baseValue * activityMultiplier;

      // Calculate 24h change
      const yesterdayValue = await this.getHistoricalCapValue(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      const change24h = yesterdayValue 
        ? ((adjustedValue - yesterdayValue) / yesterdayValue) * 100 
        : 0;

      return {
        value: adjustedValue,
        baseValue,
        totalCapInCirculation,
        totalFiatReserve,
        activeUsers,
        change24h,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error calculating CAP value:', error);
      throw error;
    }
  }

  /**
   * Get historical CAP value for a specific date
   */
  async getHistoricalCapValue(date: Date) {
    try {
      const capRate = await prisma.capRate.findUnique({
        where: { rateDate: date },
      });
      return capRate?.capToFiat || null;
    } catch (error) {
      logger.error('Error getting historical CAP value:', error);
      return null;
    }
  }

  /**
   * Apply CAP decay to inactive wallets
   */
  async applyCapDecay(dryRun: boolean = false) {
    try {
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const twentyFourMonthsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
      const thirtySixMonthsAgo = new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000);

      // Find inactive wallets
      const inactiveWallets = await prisma.capWallet.findMany({
        where: {
          OR: [
            { lastTransactionAt: { lt: twelveMonthsAgo } },
            { updatedAt: { lt: twelveMonthsAgo } },
          ],
          balance: { gt: 0 },
          isFrozen: false,
        },
        include: {
          user: true,
        },
      });

      const results = {
        processed: 0,
        decayed: 0,
        totalAmount: 0,
        skipped: 0,
      };

      for (const wallet of inactiveWallets) {
        const lastActive = wallet.lastTransactionAt || wallet.updatedAt;
        const monthsInactive = Math.floor(
          (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        // Determine decay rate
        let decayRate = 0;
        let decayReason: 'inactivity_12m' | 'inactivity_24m' | 'inactivity_36m' | null = null;

        if (monthsInactive >= 36) {
          decayRate = CAP_DECAY_RATES.INACTIVE_36_MONTHS / 100;
          decayReason = 'inactivity_36m';
        } else if (monthsInactive >= 24) {
          decayRate = CAP_DECAY_RATES.INACTIVE_24_MONTHS / 100;
          decayReason = 'inactivity_24m';
        } else if (monthsInactive >= 12) {
          decayRate = CAP_DECAY_RATES.INACTIVE_12_MONTHS / 100;
          decayReason = 'inactivity_12m';
        }

        if (decayRate > 0 && decayReason) {
          results.processed++;

          if (!dryRun) {
            const decayAmount = Math.floor(wallet.balance * decayRate);
            const newBalance = wallet.balance - decayAmount;

            await prisma.$transaction(async (tx) => {
              // Update wallet
              await tx.capWallet.update({
                where: { id: wallet.id },
                data: {
                  balance: newBalance,
                },
              });

              // Create decay transaction
              await tx.capTransaction.create({
                data: {
                  walletId: wallet.id,
                  type: 'DECAY',
                  amount: -decayAmount,
                  balanceBefore: wallet.balance,
                  balanceAfter: newBalance,
                  description: `CAP decay after ${monthsInactive} months of inactivity`,
                  status: 'COMPLETED',
                },
              });

              // Log decay
              await tx.capDecayLog.create({
                data: {
                  userId: wallet.userId,
                  walletId: wallet.id,
                  originalBalance: wallet.balance,
                  decayRate: decayRate * 100,
                  decayAmount,
                  newBalance,
                  decayReason,
                },
              });
            });

            results.decayed++;
            results.totalAmount += decayAmount;
          }
        } else {
          results.skipped++;
        }
      }

      logger.info('CAP decay applied', { ...results, dryRun });
      return results;
    } catch (error) {
      logger.error('Error applying CAP decay:', error);
      throw error;
    }
  }

  /**
   * Get CAP economic indicators
   */
  async getEconomicIndicators() {
    try {
      const [
        currentValue,
        totalSupply,
        totalReserve,
        activeUsers,
        transactions24h,
        deposits24h,
        withdrawals24h,
      ] = await Promise.all([
        this.calculateCurrentCapValue(),
        prisma.capWallet.aggregate({
          _sum: { balance: true },
        }),
        prisma.capDeposit.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { fiatAmount: true },
        }),
        prisma.user.count({
          where: {
            status: 'ACTIVE',
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.capTransaction.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.capDeposit.aggregate({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            status: 'COMPLETED',
          },
          _sum: { fiatAmount: true },
        }),
        prisma.capWithdrawal.aggregate({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            status: 'COMPLETED',
          },
          _sum: { fiatAmount: true },
        }),
      ]);

      return {
        currentValue: currentValue.value,
        totalSupply: totalSupply._sum.balance || 0,
        totalReserve: totalReserve._sum.fiatAmount || 0,
        reserveRatio: totalReserve._sum.fiatAmount && totalSupply._sum.balance
          ? (totalReserve._sum.fiatAmount / totalSupply._sum.balance) * 100
          : 0,
        activeUsers,
        transactions24h,
        deposits24h: deposits24h._sum.fiatAmount || 0,
        withdrawals24h: withdrawals24h._sum.fiatAmount || 0,
        netFlow24h: (deposits24h._sum.fiatAmount || 0) - (withdrawals24h._sum.fiatAmount || 0),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting economic indicators:', error);
      throw error;
    }
  }

  /**
   * Adjust CAP reward weights based on economic conditions
   */
  async adjustRewardWeights() {
    try {
      const indicators = await this.getEconomicIndicators();
      const adjustments: Record<string, number> = {};

      // If supply is growing too fast, reduce rewards
      if (indicators.netFlow24h < -10000) { // More withdrawals than deposits
        adjustments.view = -0.1;
        adjustments.like = -0.1;
        adjustments.comment = -0.1;
      }

      // If active users are low, increase rewards to attract engagement
      if (indicators.activeUsers < 1000) {
        adjustments.view = 0.2;
        adjustments.like = 0.2;
        adjustments.comment = 0.2;
        adjustments.share = 0.3;
      }

      // If reserve ratio is low, reduce rewards to preserve value
      if (indicators.reserveRatio < 5) { // Less than 5% reserve
        adjustments.view = -0.2;
        adjustments.like = -0.2;
        adjustments.comment = -0.2;
        adjustments.share = -0.2;
      }

      logger.info('Reward weights adjusted', adjustments);
      return adjustments;
    } catch (error) {
      logger.error('Error adjusting reward weights:', error);
      throw error;
    }
  }

  /**
   * Schedule CAP decay job
   */
  async scheduleCapDecay() {
    try {
      await queueService.add('cap-decay', {
        type: 'daily-decay',
        batchSize: 100,
      });

      logger.info('CAP decay job scheduled');
    } catch (error) {
      logger.error('Error scheduling CAP decay:', error);
      throw error;
    }
  }
}

export const capEconomicsService = new CapEconomicsService();