/**
 * Deposit Repository
 * Handles database operations for CAP deposits
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type DepositCreateInput = Prisma.CapDepositUncheckedCreateInput;
type DepositUpdateInput = Prisma.CapDepositUncheckedUpdateInput;

export class DepositRepository extends BaseRepository<any, DepositCreateInput, DepositUpdateInput> {
  protected modelName = 'capDeposit';
  protected prismaModel = prisma.capDeposit;

  /**
   * Find deposits by user ID
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0) {
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

    return { deposits, total };
  }

  /**
   * Get deposits by payment method
   */
  async findByPaymentMethod(paymentMethod: string, startDate: Date, endDate: Date) {
    return prisma.capDeposit.findMany({
      where: {
        paymentMethod,
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get deposit statistics
   */
  async getDepositStats(startDate: Date, endDate: Date) {
    const [totalAmount, totalCount, byMethod] = await Promise.all([
      prisma.capDeposit.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _sum: { fiatAmount: true },
      }),
      prisma.capDeposit.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
      }),
      prisma.capDeposit.groupBy({
        by: ['paymentMethod'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _sum: { fiatAmount: true },
        _count: true,
      }),
    ]);

    return {
      totalAmount: totalAmount._sum.fiatAmount || 0,
      totalCount,
      byMethod: byMethod.map(m => ({
        method: m.paymentMethod,
        amount: m._sum.fiatAmount || 0,
        count: m._count,
      })),
    };
  }

  /**
   * Get user's total deposits
   */
  async getUserTotalDeposits(userId: string) {
    const result = await prisma.capDeposit.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
      },
      _sum: { fiatAmount: true },
    });

    return result._sum.fiatAmount || 0;
  }

  /**
   * Get first-time depositors
   */
  async getFirstTimeDepositors(startDate: Date, endDate: Date, limit: number = 100) {
    // Find users who made their first deposit in the period
    const firstDeposits = await prisma.capDeposit.groupBy({
      by: ['userId'],
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _min: {
        createdAt: true,
      },
      having: {
        userId: {
          _count: {
            equals: 1, // Only one deposit total means it's their first
          },
        },
      },
      take: limit,
    });

    const userIds = firstDeposits.map(f => f.userId);
    
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get deposit conversion rate (users who deposit after registration)
   */
  async getDepositConversionRate(startDate: Date, endDate: Date) {
    const [totalUsers, usersWithDeposits] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.capDeposit.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      totalUsers,
      usersWithDeposits: usersWithDeposits.length,
      conversionRate: totalUsers > 0 
        ? (usersWithDeposits.length / totalUsers) * 100 
        : 0,
    };
  }
}

export const depositRepository = new DepositRepository();