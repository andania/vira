/**
 * Deposit Controller
 * Handles HTTP requests for deposit operations
 */

import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { paymentService } from '../services/payment.service';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { depositRepository } from '../repositories/deposit.repository';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class DepositController {
  /**
   * Create deposit intent
   */
  async createDepositIntent(req: Request, res: Response) {
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

      const { amount, currency = 'USD', paymentMethod = 'stripe' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Valid amount is required',
          },
        });
      }

      // Check minimum deposit
      if (amount < 5) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Minimum deposit amount is $5',
          },
        });
      }

      // Check maximum deposit
      if (amount > 10000) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Maximum deposit amount is $10,000',
          },
        });
      }

      // Check for fraud
      const fraudScore = await fraudDetectionService.analyzeTransaction(
        userId,
        amount,
        'deposit',
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceFingerprint: req.headers['x-device-fingerprint'],
        }
      );

      if (fraudScore.action === 'block') {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.FRAUD_DETECTED,
            message: 'Deposit blocked by fraud prevention',
            details: { reasons: fraudScore.reasons },
          },
        });
      }

      const paymentIntent = await paymentService.createPaymentIntent(
        userId,
        amount,
        currency,
        paymentMethod
      );

      return res.json({
        success: true,
        data: {
          paymentIntent,
          fraudScore: fraudScore.score > 30 ? {
            score: fraudScore.score,
            reasons: fraudScore.reasons,
          } : undefined,
        },
      });
    } catch (error) {
      logger.error('Error in createDepositIntent:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create deposit intent',
        },
      });
    }
  }

  /**
   * Confirm deposit
   */
  async confirmDeposit(req: Request, res: Response) {
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

      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment intent ID required',
          },
        });
      }

      const paymentIntent = await paymentService.confirmPaymentIntent(paymentIntentId);

      return res.json({
        success: true,
        data: paymentIntent,
      });
    } catch (error) {
      logger.error('Error in confirmDeposit:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to confirm deposit',
        },
      });
    }
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(req: Request, res: Response) {
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

      const [deposits, total] = await Promise.all([
        prisma.capDeposit.findMany({
          where: filters,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capDeposit.count({
          where: filters,
        }),
      ]);

      return res.json({
        success: true,
        data: {
          deposits,
          total,
          limit,
          offset,
          hasMore: offset + deposits.length < total,
        },
      });
    } catch (error) {
      logger.error('Error in getDepositHistory:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get deposit history',
        },
      });
    }
  }

  /**
   * Get single deposit
   */
  async getDeposit(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { depositId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const deposit = await prisma.capDeposit.findFirst({
        where: {
          id: depositId,
          userId,
        },
      });

      if (!deposit) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Deposit not found',
          },
        });
      }

      return res.json({
        success: true,
        data: deposit,
      });
    } catch (error) {
      logger.error('Error in getDeposit:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get deposit',
        },
      });
    }
  }

  /**
   * Get deposit methods
   */
  async getDepositMethods(req: Request, res: Response) {
    try {
      const methods = [
        {
          id: 'stripe',
          name: 'Credit/Debit Card',
          provider: 'stripe',
          supportedCurrencies: ['USD', 'EUR', 'GBP'],
          minAmount: 5,
          maxAmount: 10000,
          fee: 0,
          processingTime: 'Instant',
          icon: 'card',
        },
        {
          id: 'paypal',
          name: 'PayPal',
          provider: 'paypal',
          supportedCurrencies: ['USD', 'EUR', 'GBP'],
          minAmount: 5,
          maxAmount: 5000,
          fee: 0,
          processingTime: 'Instant',
          icon: 'paypal',
        },
        {
          id: 'mobile_money',
          name: 'Mobile Money',
          provider: 'africastalking',
          supportedCurrencies: ['GHS', 'NGN', 'KES', 'ZAR', 'XOF'],
          minAmount: 1,
          maxAmount: 1000,
          fee: 0,
          processingTime: '1-5 minutes',
          icon: 'mobile',
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          provider: 'flutterwave',
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES'],
          minAmount: 10,
          maxAmount: 10000,
          fee: 0,
          processingTime: '1-3 business days',
          icon: 'bank',
        },
      ];

      return res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Error in getDepositMethods:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get deposit methods',
        },
      });
    }
  }

  /**
   * Get deposit statistics
   */
  async getDepositStatistics(req: Request, res: Response) {
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

      const stats = await depositRepository.getDepositStats(startDate, endDate);
      const userTotal = await depositRepository.getUserTotalDeposits(userId);

      return res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate,
          global: stats,
          user: {
            totalDeposits: userTotal,
            depositCount: await prisma.capDeposit.count({
              where: { userId, status: 'COMPLETED' },
            }),
          },
        },
      });
    } catch (error) {
      logger.error('Error in getDepositStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get deposit statistics',
        },
      });
    }
  }
}

export const depositController = new DepositController();