/**
 * CAP Decay Job
 * Applies decay to inactive CAP balances
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { queueService } from '../bull.queue';
import { addDays, applyCapDecay } from '@viraz/shared';

export interface CapDecayJobData {
  batchSize?: number;
  dryRun?: boolean;
}

export class CapDecayJob {
  static async process(job: Job<CapDecayJobData>) {
    const { batchSize = 100, dryRun = false } = job.data;
    
    logger.info(`🔄 Starting CAP decay job (batch: ${batchSize}, dryRun: ${dryRun})`);

    try {
      // Find inactive users (no activity for 12+ months)
      const twelveMonthsAgo = addDays(new Date(), -365);
      
      const inactiveWallets = await prisma.capWallet.findMany({
        where: {
          updatedAt: {
            lt: twelveMonthsAgo,
          },
          balance: {
            gt: 0,
          },
        },
        take: batchSize,
        include: {
          user: true,
        },
      });

      logger.info(`Found ${inactiveWallets.length} inactive wallets`);

      let totalDecayed = 0;
      let totalAmount = 0;

      for (const wallet of inactiveWallets) {
        const monthsInactive = Math.floor(
          (Date.now() - new Date(wallet.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const { newBalance, decayAmount, decayRate } = applyCapDecay(
          wallet.balance,
          monthsInactive
        );

        if (decayAmount > 0) {
          if (!dryRun) {
            // Create decay transaction
            await prisma.$transaction(async (tx) => {
              // Update wallet balance
              await tx.capWallet.update({
                where: { id: wallet.id },
                data: {
                  balance: newBalance,
                },
              });

              // Create transaction record
              await tx.capTransaction.create({
                data: {
                  walletId: wallet.id,
                  type: 'DECAY',
                  amount: -decayAmount,
                  balanceBefore: wallet.balance,
                  balanceAfter: newBalance,
                  description: `CAP decay after ${monthsInactive} months of inactivity`,
                },
              });

              // Log decay
              await tx.capDecayLog.create({
                data: {
                  userId: wallet.userId,
                  walletId: wallet.id,
                  originalBalance: wallet.balance,
                  decayRate,
                  decayAmount,
                  newBalance,
                  decayReason: monthsInactive >= 36 ? 'inactivity_36m' :
                               monthsInactive >= 24 ? 'inactivity_24m' : 'inactivity_12m',
                },
              });

              // Create notification
              await tx.notification.create({
                data: {
                  userId: wallet.userId,
                  type: 'FINANCIAL',
                  title: '⚠️ CAP Decay Applied',
                  body: `${decayAmount} CAP has been removed from your wallet due to ${monthsInactive} months of inactivity.`,
                  data: {
                    screen: 'wallet',
                    action: 'view_transactions',
                  },
                },
              });
            });

            logger.info(`Applied decay to wallet ${wallet.id}: -${decayAmount} CAP`);
          } else {
            logger.info(`[DRY RUN] Would decay wallet ${wallet.id}: -${decayAmount} CAP`);
          }

          totalDecayed++;
          totalAmount += decayAmount;
        }
      }

      logger.info(`✅ CAP decay job completed`, {
        processed: inactiveWallets.length,
        decayed: totalDecayed,
        totalAmount,
        dryRun,
      });

      return {
        processed: inactiveWallets.length,
        decayed: totalDecayed,
        totalAmount,
        dryRun,
      };

    } catch (error) {
      logger.error('❌ CAP decay job failed:', error);
      throw error;
    }
  }
}

export default CapDecayJob;