/**
 * Withdrawal Controller
 * Handles HTTP requests for withdrawal operations
 */

import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { withdrawalRepository } from '../repositories/withdrawal.repository';
import { notificationService } from '../../notifications/services/notification.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class WithdrawalController {
  /**
   * Request withdrawal
   */
  async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const { amount, currency = 'USD', paymentMethod, accountDetails } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Valid amount is required',
          },
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment method is required',
          },
        });
      }

      if (!accountDetails) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Account details are required',
          },
        });
      }

      // Check minimum withdrawal
      if (amount < 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Minimum withdrawal amount is $10',
          },
        });
      }

      // Check maximum withdrawal
      if (amount > 5000) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Maximum withdrawal amount is $5,000',
          },
        });
      }

      // Check for fraud
      const fraudScore = await fraudDetectionService.analyzeTransaction(
        userId,
        amount,
        'withdrawal',
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceFingerprint: req.headers['x-device-fingerprint'],
          paymentMethod,
        }
      );

      if (fraudScore.action === 'block') {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.FRAUD_DETECTED,
            message: 'Withdrawal blocked by fraud prevention',
            details: { reasons: fraudScore.reasons },
          },
        });
      }

      const withdrawal = await walletService.withdraw({
        userId,
        amount,
        currency,
        paymentMethod,
        accountDetails,
      });

      return res.json({
        success: true,
        data: withdrawal,
        fraudScore: fraudScore.score > 30 ? {
          score: fraudScore.score,
          reasons: fraudScore.reasons,
        } : undefined,
      });
    } catch (error) {
      logger.error('Error in requestWithdrawal:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to process withdrawal',
        },
      });
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string;

      const filters: any = { userId };
      if (status) {
        filters.status = status;
      }

      const [withdrawals, total] = await Promise.all([
        prisma.capWithdrawal.findMany({
          where: filters,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capWithdrawal.count({
          where: filters,
        }),
      ]);

      return res.json({
        success: true,
        data: {
          withdrawals,
          total,
          limit,
          offset,
          hasMore: offset + withdrawals.length < total,
        },
      });
    } catch (error) {
      logger.error('Error in getWithdrawalHistory:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get withdrawal history',
        },
      });
    }
  }

  /**
   * Get single withdrawal
   */
  async getWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { withdrawalId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const withdrawal = await prisma.capWithdrawal.findFirst({
        where: {
          id: withdrawalId,
          userId,
        },
      });

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Withdrawal not found',
          },
        });
      }

      return res.json({
        success: true,
        data: withdrawal,
      });
    } catch (error) {
      logger.error('Error in getWithdrawal:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get withdrawal',
        },
      });
    }
  }

  /**
   * Cancel withdrawal
   */
  async cancelWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { withdrawalId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const withdrawal = await prisma.capWithdrawal.findFirst({
        where: {
          id: withdrawalId,
          userId,
          status: 'PENDING',
        },
      });

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Pending withdrawal not found',
          },
        });
      }

      // Update withdrawal status
      await prisma.capWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'CANCELLED',
          failureReason: reason || 'Cancelled by user',
        },
      });

      // Refund the CAP
      await walletService.deposit({
        userId,
        amount: withdrawal.capAmount / 100,
        currency: 'USD',
        paymentMethod: 'system',
        paymentProvider: 'system',
        transactionId: `refund-${withdrawalId}`,
      });

      return res.json({
        success: true,
        message: 'Withdrawal cancelled and funds returned',
      });
    } catch (error) {
      logger.error('Error in cancelWithdrawal:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to cancel withdrawal',
        },
      });
    }
  }

  /**
   * Get withdrawal methods
   */
  async getWithdrawalMethods(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Get user's saved payment methods
      const savedMethods = await prisma.paymentMethod.findMany({
        where: { userId, isActive: true },
      });

      const methods = [
        {
          id: 'bank',
          name: 'Bank Transfer',
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES'],
          minAmount: 10,
          maxAmount: 5000,
          fee: '2%',
          processingTime: '1-3 business days',
          icon: 'bank',
          savedMethods: savedMethods.filter(m => m.methodType === 'bank'),
        },
        {
          id: 'mobile_money',
          name: 'Mobile Money',
          supportedCurrencies: ['GHS', 'NGN', 'KES', 'ZAR', 'XOF'],
          minAmount: 5,
          maxAmount: 1000,
          fee: '2%',
          processingTime: 'Instant - 1 hour',
          icon: 'mobile',
          savedMethods: savedMethods.filter(m => m.methodType === 'mobile_money'),
        },
        {
          id: 'paypal',
          name: 'PayPal',
          supportedCurrencies: ['USD', 'EUR', 'GBP'],
          minAmount: 10,
          maxAmount: 5000,
          fee: '2%',
          processingTime: 'Instant',
          icon: 'paypal',
          savedMethods: savedMethods.filter(m => m.methodType === 'paypal'),
        },
      ];

      return res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Error in getWithdrawalMethods:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get withdrawal methods',
        },
      });
    }
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const period = req.query.period as string || '30d';
      const endDate = new Date();
      let startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const stats = await withdrawalRepository.getWithdrawalStats(startDate, endDate);

      const userStats = await prisma.capWithdrawal.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { fiatAmount: true },
        _count: true,
      });

      return res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate,
          global: stats,
          user: {
            totalWithdrawn: userStats._sum.fiatAmount || 0,
            withdrawalCount: userStats._count,
          },
        },
      });
    } catch (error) {
      logger.error('Error in getWithdrawalStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get withdrawal statistics',
        },
      });
    }
  }
}

export const withdrawalController = new WithdrawalController();