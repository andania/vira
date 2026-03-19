/**
 * Transaction Repository
 * Handles database operations for CAP transactions
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type TransactionCreateInput = Prisma.CapTransactionUncheckedCreateInput;

export class TransactionRepository extends BaseRepository<any, TransactionCreateInput, any> {
  protected modelName = 'capTransaction';
  protected prismaModel = prisma.capTransaction;

  /**
   * Get transactions by wallet ID with pagination
   */
  async findByWalletId(walletId: string, limit: number = 50, offset: number = 0) {
    const [transactions, total] = await Promise.all([
      prisma.capTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.capTransaction.count({
        where: { walletId },
      }),
    ]);

    return { transactions, total };
  }

  /**
   * Get transactions by user ID (through wallet)
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0) {
    const [transactions, total] = await Promise.all([
      prisma.capTransaction.findMany({
        where: {
          wallet: { userId },
        },
        include: {
          wallet: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.capTransaction.count({
        where: {
          wallet: { userId },
        },
      }),
    ]);

    return { transactions, total };
  }

  /**
   * Get transactions by type and date range
   */
  async findByTypeAndDateRange(
    type: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ) {
    return prisma.capTransaction.findMany({
      where: {
        type: type as any,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        wallet: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get daily transaction summary
   */
  async getDailySummary(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalIn, totalOut, count] = await Promise.all([
      prisma.capTransaction.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      }),
      prisma.capTransaction.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
      prisma.capTransaction.count({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    return {
      date: startOfDay,
      totalIn: Math.abs(totalIn._sum.amount || 0),
      totalOut: Math.abs(totalOut._sum.amount || 0),
      netFlow: (totalIn._sum.amount || 0) - (Math.abs(totalOut._sum.amount || 0)),
      transactionCount: count,
    };
  }

  /**
   * Get transaction volume by type
   */
  async getVolumeByType(startDate: Date, endDate: Date) {
    const transactions = await prisma.capTransaction.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return transactions.map(t => ({
      type: t.type,
      volume: Math.abs(t._sum.amount || 0),
      count: t._count,
    }));
  }

  /**
   * Get suspicious transactions (large amounts, unusual patterns)
   */
  async getSuspiciousTransactions(threshold: number = 10000, limit: number = 50) {
    return prisma.capTransaction.findMany({
      where: {
        OR: [
          { amount: { gt: threshold } },
          { amount: { lt: -threshold } },
        ],
      },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get duplicate transactions (potential fraud)
   */
  async getDuplicateTransactions(timeWindowMs: number = 60000) {
    const timeAgo = new Date(Date.now() - timeWindowMs);

    // This is a simplified check - in production, you'd want more sophisticated detection
    const transactions = await prisma.capTransaction.findMany({
      where: {
        createdAt: { gte: timeAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by wallet and amount to find duplicates
    const groups = new Map();
    const duplicates = [];

    for (const tx of transactions) {
      const key = `${tx.walletId}:${tx.amount}`;
      if (groups.has(key)) {
        duplicates.push({
          original: groups.get(key),
          duplicate: tx,
        });
      } else {
        groups.set(key, tx);
      }
    }

    return duplicates;
  }
}

export const transactionRepository = new TransactionRepository();