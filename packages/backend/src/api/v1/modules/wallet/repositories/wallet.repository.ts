/**
 * Wallet Repository
 * Handles database operations for CAP wallets
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type WalletCreateInput = Prisma.CapWalletUncheckedCreateInput;
type WalletUpdateInput = Prisma.CapWalletUncheckedUpdateInput;

export class WalletRepository extends BaseRepository<any, WalletCreateInput, WalletUpdateInput> {
  protected modelName = 'capWallet';
  protected prismaModel = prisma.capWallet;

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: string) {
    return prisma.capWallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Get or create wallet for user
   */
  async getOrCreate(userId: string) {
    let wallet = await this.findByUserId(userId);
    
    if (!wallet) {
      wallet = await prisma.capWallet.create({
        data: {
          userId,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      });
    }

    return wallet;
  }

  /**
   * Update wallet balance with transaction
   */
  async updateBalance(walletId: string, amount: number, tx?: any) {
    const client = tx || prisma;
    
    const wallet = await client.capWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return client.capWallet.update({
      where: { id: walletId },
      data: {
        balance: wallet.balance + amount,
        lastTransactionAt: new Date(),
        ...(amount > 0 
          ? { lifetimeEarned: wallet.lifetimeEarned + amount }
          : { lifetimeSpent: wallet.lifetimeSpent + Math.abs(amount) }
        ),
      },
    });
  }

  /**
   * Get wallets with low balance
   */
  async getLowBalanceWallets(threshold: number, limit: number = 100) {
    return prisma.capWallet.findMany({
      where: {
        balance: { lt: threshold },
        isFrozen: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      take: limit,
      orderBy: { balance: 'asc' },
    });
  }

  /**
   * Get wallets with high balance (for monitoring)
   */
  async getHighBalanceWallets(threshold: number, limit: number = 100) {
    return prisma.capWallet.findMany({
      where: {
        balance: { gt: threshold },
        isFrozen: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      take: limit,
      orderBy: { balance: 'desc' },
    });
  }

  /**
   * Get total balance statistics
   */
  async getBalanceStats() {
    const [total, average, min, max] = await Promise.all([
      prisma.capWallet.aggregate({
        _sum: { balance: true },
      }),
      prisma.capWallet.aggregate({
        _avg: { balance: true },
      }),
      prisma.capWallet.aggregate({
        _min: { balance: true },
      }),
      prisma.capWallet.aggregate({
        _max: { balance: true },
      }),
    ]);

    return {
      total: total._sum.balance || 0,
      average: average._avg.balance || 0,
      min: min._min.balance || 0,
      max: max._max.balance || 0,
    };
  }

  /**
   * Get inactive wallets (no transactions)
   */
  async getInactiveWallets(days: number, limit: number = 100) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return prisma.capWallet.findMany({
      where: {
        OR: [
          { lastTransactionAt: { lt: cutoffDate } },
          { lastTransactionAt: null, updatedAt: { lt: cutoffDate } },
        ],
        balance: { gt: 0 },
        isFrozen: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
  }

  /**
   * Freeze multiple wallets
   */
  async freezeWallets(userIds: string[], reason: string) {
    return prisma.capWallet.updateMany({
      where: {
        userId: { in: userIds },
      },
      data: {
        isFrozen: true,
        freezeReason: reason,
      },
    });
  }

  /**
   * Unfreeze multiple wallets
   */
  async unfreezeWallets(userIds: string[]) {
    return prisma.capWallet.updateMany({
      where: {
        userId: { in: userIds },
      },
      data: {
        isFrozen: false,
        freezeReason: null,
      },
    });
  }
}

export const walletRepository = new WalletRepository();