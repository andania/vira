/**
 * Withdrawal Repository
 * Handles database operations for CAP withdrawals
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type WithdrawalCreateInput = Prisma.CapWithdrawalUncheckedCreateInput;
type WithdrawalUpdateInput = Prisma.CapWithdrawalUncheckedUpdateInput;

export class WithdrawalRepository extends BaseRepository<any, WithdrawalCreateInput, WithdrawalUpdateInput> {
  protected modelName = 'capWithdrawal';
  protected prismaModel = prisma.capWithdrawal;

  /**
   * Find withdrawals by user ID
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0) {
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

    return { withdrawals, total };
  }

  /**
   * Get pending withdrawals
   */
  async getPendingWithdrawals(limit: number = 100) {
    return prisma.capWithdrawal.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get withdrawals by status
   */
  async findByStatus(status: string, limit: number = 100, offset: number = 0) {
    const [withdrawals, total] = await Promise.all([
      prisma.capWithdrawal.findMany({
        where: { status: status as any },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.capWithdrawal.count({
        where: { status: status as any },
      }),
    ]);

    return { withdrawals, total };
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStats(startDate: Date, endDate: Date) {
    const [totalAmount, totalCount, byStatus] = await Promise.all([
      prisma.capWithdrawal.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _sum: { fiatAmount: true },
      }),
      prisma.capWithdrawal.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.capWithdrawal.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { fiatAmount: true },
      }),
    ]);

    return {
      totalAmount: totalAmount._sum.fiatAmount || 0,
      totalCount,
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count,
        amount: s._sum.fiatAmount || 0,
      })),
    };
  }

  /**
   * Get average processing time
   */
  async getAverageProcessingTime(startDate: Date, endDate: Date) {
    const completedWithdrawals = await prisma.capWithdrawal.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    if (completedWithdrawals.length === 0) {
      return 0;
    }

    const totalTime = completedWithdrawals.reduce((sum, w) => {
      return sum + (w.completedAt!.getTime() - w.createdAt.getTime());
    }, 0);

    return totalTime / completedWithdrawals.length / (1000 * 60 * 60); // Return in hours
  }

  /**
   * Get large withdrawals (above threshold)
   */
  async getLargeWithdrawals(threshold: number, limit: number = 50) {
    return prisma.capWithdrawal.findMany({
      where: {
        fiatAmount: { gt: threshold },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { fiatAmount: 'desc' },
      take: limit,
    });
  }

  /**
   * Update withdrawal status with admin tracking
   */
  async updateStatus(
    withdrawalId: string,
    status: string,
    adminId?: string,
    reason?: string
  ) {
    const updateData: any = { status };

    if (status === 'PROCESSING') {
      updateData.processedBy = adminId;
      updateData.processedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      updateData.failureReason = reason;
    }

    return prisma.capWithdrawal.update({
      where: { id: withdrawalId },
      data: updateData,
    });
  }
}

export const withdrawalRepository = new WithdrawalRepository();