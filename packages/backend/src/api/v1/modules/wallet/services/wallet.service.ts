/**
 * Wallet Service
 * Handles CAP wallet operations, transactions, and balance management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { notificationService } from '../../notifications/services/notification.service';
import { gamificationService } from '../../gamification/services/gamification.service';
import { 
  ApiErrorCode, 
  RANK_CAP_LIMITS,
  CAP_ECONOMICS,
  calculateCapValue,
  canAfford,
  calculateWithdrawalFee
} from '@viraz/shared';

export interface DepositData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string;
}

export interface WithdrawalData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  accountDetails: any;
}

export interface TransferData {
  senderId: string;
  receiverId: string;
  amount: number;
  note?: string;
}

export class WalletService {
  /**
   * Get user wallet
   */
  async getWallet(userId: string) {
    try {
      let wallet = await prisma.capWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await this.createWallet(userId);
      }

      return wallet;
    } catch (error) {
      logger.error('Error getting wallet:', error);
      throw error;
    }
  }

  /**
   * Create wallet for user
   */
  async createWallet(userId: string) {
    try {
      const wallet = await prisma.capWallet.create({
        data: {
          userId,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      });

      logger.info(`Wallet created for user ${userId}`);
      return wallet;
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string) {
    try {
      const wallet = await this.getWallet(userId);
      return {
        balance: wallet.balance,
        lifetimeEarned: wallet.lifetimeEarned,
        lifetimeSpent: wallet.lifetimeSpent,
        isFrozen: wallet.isFrozen,
      };
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Process deposit
   */
  async deposit(data: DepositData) {
    try {
      const { userId, amount, currency, paymentMethod, paymentProvider, transactionId } = data;

      // Get user's rank for limits
      const userLevel = await prisma.userLevel.findUnique({
        where: { userId },
        include: { currentLevel: true },
      });

      const rank = userLevel?.currentLevel?.name?.toLowerCase() || 'explorer';
      const limits = RANK_CAP_LIMITS[rank];

      // Check deposit limits
      if (amount > limits.dailySpend) {
        throw new Error(`Daily deposit limit of ${limits.dailySpend} CAP exceeded`);
      }

      // Convert fiat to CAP
      const capAmount = Math.floor(amount * CAP_ECONOMICS.INITIAL_CAP_VALUE);

      // Process in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get or create wallet
        let wallet = await tx.capWallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await tx.capWallet.create({
            data: {
              userId,
              balance: 0,
              lifetimeEarned: 0,
              lifetimeSpent: 0,
            },
          });
        }

        // Check if wallet is frozen
        if (wallet.isFrozen) {
          throw new Error('Wallet is frozen. Contact support.');
        }

        // Update wallet balance
        const updatedWallet = await tx.capWallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance + capAmount,
            lifetimeEarned: wallet.lifetimeEarned + capAmount,
            lastTransactionAt: new Date(),
          },
        });

        // Create transaction record
        const transaction = await tx.capTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount: capAmount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            referenceId: transactionId,
            referenceType: 'payment',
            description: `Deposit of ${amount} ${currency}`,
            metadata: {
              fiatAmount: amount,
              currency,
              paymentMethod,
              paymentProvider,
            },
            status: 'COMPLETED',
          },
        });

        // Create deposit record
        const deposit = await tx.capDeposit.create({
          data: {
            userId,
            walletId: wallet.id,
            fiatAmount: amount,
            capAmount,
            exchangeRate: CAP_ECONOMICS.INITIAL_CAP_VALUE,
            feeAmount: 0,
            paymentMethod,
            paymentProvider,
            transactionId: transactionId || transaction.id,
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        return { wallet: updatedWallet, transaction, deposit };
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '✅ Deposit Successful',
        body: `$${amount} deposited. ${capAmount} CAP added to your wallet.`,
        data: {
          screen: 'wallet',
          action: 'view_transactions',
        },
      });

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Deposit processed for user ${userId}: ${amount} ${currency} -> ${capAmount} CAP`);
      return result;
    } catch (error) {
      logger.error('Error processing deposit:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal
   */
  async withdraw(data: WithdrawalData) {
    try {
      const { userId, amount, currency, paymentMethod, accountDetails } = data;

      // Get user's rank for limits
      const userLevel = await prisma.userLevel.findUnique({
        where: { userId },
        include: { currentLevel: true },
      });

      const rank = userLevel?.currentLevel?.name?.toLowerCase() || 'explorer';
      const limits = RANK_CAP_LIMITS[rank];

      // Check minimum withdrawal
      if (amount < 10) {
        throw new Error('Minimum withdrawal amount is $10');
      }

      // Check withdrawal limit
      if (amount > limits.withdrawal) {
        throw new Error(`Maximum withdrawal limit of $${limits.withdrawal} exceeded`);
      }

      // Calculate CAP required
      const capRequired = Math.ceil(amount * CAP_ECONOMICS.INITIAL_CAP_VALUE);
      const fee = calculateWithdrawalFee(amount);
      const netAmount = amount - fee;

      // Process in transaction
      const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.capWallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        if (wallet.isFrozen) {
          throw new Error('Wallet is frozen. Contact support.');
        }

        // Check sufficient balance
        if (!canAfford(wallet.balance, capRequired)) {
          throw new Error('Insufficient CAP balance');
        }

        // Update wallet balance
        const updatedWallet = await tx.capWallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance - capRequired,
            lifetimeSpent: wallet.lifetimeSpent + capRequired,
            lastTransactionAt: new Date(),
          },
        });

        // Create transaction record
        const transaction = await tx.capTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'WITHDRAW',
            amount: -capRequired,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description: `Withdrawal of ${amount} ${currency}`,
            metadata: {
              fiatAmount: amount,
              currency,
              paymentMethod,
              fee,
              netAmount,
            },
            status: 'PENDING',
          },
        });

        // Create withdrawal request
        const withdrawal = await tx.capWithdrawal.create({
          data: {
            userId,
            walletId: wallet.id,
            capAmount: capRequired,
            fiatAmount: amount,
            exchangeRate: CAP_ECONOMICS.INITIAL_CAP_VALUE,
            feeAmount: fee,
            netAmount,
            paymentMethod,
            accountDetails,
            status: 'PENDING',
          },
        });

        return { wallet: updatedWallet, transaction, withdrawal };
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '💰 Withdrawal Initiated',
        body: `Your withdrawal of $${amount} is being processed. You will receive $${netAmount.toFixed(2)} after fees.`,
        data: {
          screen: 'wallet',
          action: 'view_withdrawals',
        },
      });

      logger.info(`Withdrawal initiated for user ${userId}: ${amount} ${currency}`);
      return result;
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process transfer between users
   */
  async transfer(data: TransferData) {
    try {
      const { senderId, receiverId, amount, note } = data;

      if (senderId === receiverId) {
        throw new Error('Cannot transfer to yourself');
      }

      // Get sender's rank for limits
      const senderLevel = await prisma.userLevel.findUnique({
        where: { userId: senderId },
        include: { currentLevel: true },
      });

      const rank = senderLevel?.currentLevel?.name?.toLowerCase() || 'explorer';
      const limits = RANK_CAP_LIMITS[rank];

      // Check transfer limit
      if (amount > limits.dailySpend) {
        throw new Error(`Daily transfer limit of ${limits.dailySpend} CAP exceeded`);
      }

      // Process in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get sender wallet
        const senderWallet = await tx.capWallet.findUnique({
          where: { userId: senderId },
        });

        if (!senderWallet) {
          throw new Error('Sender wallet not found');
        }

        if (senderWallet.isFrozen) {
          throw new Error('Sender wallet is frozen');
        }

        // Check sender balance
        if (!canAfford(senderWallet.balance, amount)) {
          throw new Error('Insufficient CAP balance');
        }

        // Get or create receiver wallet
        let receiverWallet = await tx.capWallet.findUnique({
          where: { userId: receiverId },
        });

        if (!receiverWallet) {
          receiverWallet = await tx.capWallet.create({
            data: {
              userId: receiverId,
              balance: 0,
              lifetimeEarned: 0,
              lifetimeSpent: 0,
            },
          });
        }

        if (receiverWallet.isFrozen) {
          throw new Error('Receiver wallet is frozen');
        }

        // Update sender wallet
        const updatedSenderWallet = await tx.capWallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: senderWallet.balance - amount,
            lifetimeSpent: senderWallet.lifetimeSpent + amount,
            lastTransactionAt: new Date(),
          },
        });

        // Update receiver wallet
        const updatedReceiverWallet = await tx.capWallet.update({
          where: { id: receiverWallet.id },
          data: {
            balance: receiverWallet.balance + amount,
            lifetimeEarned: receiverWallet.lifetimeEarned + amount,
            lastTransactionAt: new Date(),
          },
        });

        // Create sender transaction
        const senderTransaction = await tx.capTransaction.create({
          data: {
            walletId: senderWallet.id,
            type: 'TRANSFER_OUT',
            amount: -amount,
            balanceBefore: senderWallet.balance,
            balanceAfter: updatedSenderWallet.balance,
            referenceId: receiverId,
            referenceType: 'user',
            description: note || `Transfer to user ${receiverId}`,
            status: 'COMPLETED',
          },
        });

        // Create receiver transaction
        const receiverTransaction = await tx.capTransaction.create({
          data: {
            walletId: receiverWallet.id,
            type: 'TRANSFER_IN',
            amount,
            balanceBefore: receiverWallet.balance,
            balanceAfter: updatedReceiverWallet.balance,
            referenceId: senderId,
            referenceType: 'user',
            description: note || `Transfer from user ${senderId}`,
            status: 'COMPLETED',
          },
        });

        // Create transfer record
        const transfer = await tx.capTransfer.create({
          data: {
            senderId,
            receiverId,
            amount,
            feeAmount: 0,
            netAmount: amount,
            note,
            status: 'COMPLETED',
            senderTransactionId: senderTransaction.id,
            receiverTransactionId: receiverTransaction.id,
            completedAt: new Date(),
          },
        });

        return {
          transfer,
          senderTransaction,
          receiverTransaction,
        };
      });

      // Send notifications
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true },
      });

      await notificationService.create({
        userId: receiverId,
        type: 'FINANCIAL',
        title: '📥 CAP Received',
        body: `${sender?.username} sent you ${amount} CAP${note ? ': ' + note : ''}`,
        data: {
          screen: 'wallet',
          action: 'view_transactions',
        },
      });

      await notificationService.create({
        userId: senderId,
        type: 'FINANCIAL',
        title: '📤 CAP Sent',
        body: `You sent ${amount} CAP to ${sender?.username}`,
        data: {
          screen: 'wallet',
          action: 'view_transactions',
        },
      });

      // Invalidate caches
      await cacheService.invalidateUser(senderId);
      await cacheService.invalidateUser(receiverId);

      logger.info(`Transfer completed: ${amount} CAP from ${senderId} to ${receiverId}`);
      return result;
    } catch (error) {
      logger.error('Error processing transfer:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const wallet = await this.getWallet(userId);

      const [transactions, total] = await Promise.all([
        prisma.capTransaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capTransaction.count({
          where: { walletId: wallet.id },
        }),
      ]);

      return {
        transactions,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawals(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const [withdrawals, total] = await Promise.all([
        prisma.capWithdrawal.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capWithdrawal.count({
          where: { userId },
        }),
      ]);

      return {
        withdrawals,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting withdrawals:', error);
      throw error;
    }
  }

  /**
   * Get deposit history
   */
  async getDeposits(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const [deposits, total] = await Promise.all([
        prisma.capDeposit.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capDeposit.count({
          where: { userId },
        }),
      ]);

      return {
        deposits,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting deposits:', error);
      throw error;
    }
  }

  /**
   * Get CAP value (dynamic pricing)
   */
  async getCapValue() {
    try {
      // Try cache first
      const cached = await redis.get('cap:current-value');
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate based on economics
      const [totalCap, totalReserve] = await Promise.all([
        prisma.capWallet.aggregate({
          _sum: { balance: true },
        }),
        prisma.capDeposit.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { fiatAmount: true },
        }),
      ]);

      const totalCapInCirculation = totalCap._sum.balance || 0;
      const totalFiatReserve = totalReserve._sum.fiatAmount || 0;

      const value = calculateCapValue(
        totalCapInCirculation,
        totalFiatReserve,
        CAP_ECONOMICS.STABILITY_RESERVE_RATIO
      );

      const result = {
        value,
        totalCapInCirculation,
        totalFiatReserve,
        updatedAt: new Date().toISOString(),
      };

      // Cache for 1 hour
      await redis.setex('cap:current-value', 3600, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Error getting CAP value:', error);
      throw error;
    }
  }

  /**
   * Freeze wallet (admin)
   */
  async freezeWallet(userId: string, reason: string) {
    try {
      const wallet = await prisma.capWallet.update({
        where: { userId },
        data: {
          isFrozen: true,
          freezeReason: reason,
        },
      });

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        priority: 'HIGH',
        title: '🔒 Wallet Frozen',
        body: `Your wallet has been frozen. Reason: ${reason}`,
        data: {
          screen: 'wallet',
          action: 'contact_support',
        },
      });

      logger.info(`Wallet frozen for user ${userId}: ${reason}`);
      return wallet;
    } catch (error) {
      logger.error('Error freezing wallet:', error);
      throw error;
    }
  }

  /**
   * Unfreeze wallet (admin)
   */
  async unfreezeWallet(userId: string) {
    try {
      const wallet = await prisma.capWallet.update({
        where: { userId },
        data: {
          isFrozen: false,
          freezeReason: null,
        },
      });

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '🔓 Wallet Unfrozen',
        body: 'Your wallet has been unfrozen. You can now use it normally.',
        data: {
          screen: 'wallet',
          action: 'view',
        },
      });

      logger.info(`Wallet unfrozen for user ${userId}`);
      return wallet;
    } catch (error) {
      logger.error('Error unfreezing wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet statistics (admin)
   */
  async getWalletStatistics() {
    try {
      const [
        totalWallets,
        totalBalance,
        totalFrozen,
        transactionsToday,
        depositsToday,
        withdrawalsToday,
      ] = await Promise.all([
        prisma.capWallet.count(),
        prisma.capWallet.aggregate({
          _sum: { balance: true },
        }),
        prisma.capWallet.count({
          where: { isFrozen: true },
        }),
        prisma.capTransaction.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.capDeposit.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            status: 'COMPLETED',
          },
        }),
        prisma.capWithdrawal.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            status: 'COMPLETED',
          },
        }),
      ]);

      return {
        totalWallets,
        totalBalance: totalBalance._sum.balance || 0,
        totalFrozen,
        transactionsToday,
        depositsToday,
        withdrawalsToday,
      };
    } catch (error) {
      logger.error('Error getting wallet statistics:', error);
      throw error;
    }
  }
}

export const walletService = new WalletService();