/**
 * Admin Wallet Controller
 * Handles admin operations for wallet management
 */

import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { capEconomicsService } from '../services/cap-economics.service';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AdminWalletController {
  /**
   * Get wallet statistics
   */
  async getWalletStatistics(req: Request, res: Response) {
    try {
      const stats = await walletService.getWalletStatistics();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getWalletStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get wallet statistics',
        },
      });
    }
  }

  /**
   * Get economic indicators
   */
  async getEconomicIndicators(req: Request, res: Response) {
    try {
      const indicators = await capEconomicsService.getEconomicIndicators();

      return res.json({
        success: true,
        data: indicators,
      });
    } catch (error) {
      logger.error('Error in getEconomicIndicators:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get economic indicators',
        },
      });
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(req: Request, res: Response) {
    try {
      const stats = await fraudDetectionService.getFraudStatistics();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getFraudStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get fraud statistics',
        },
      });
    }
  }

  /**
   * Freeze user wallet
   */
  async freezeWallet(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Reason required',
          },
        });
      }

      const wallet = await walletService.freezeWallet(userId, reason);

      return res.json({
        success: true,
        data: wallet,
        message: 'Wallet frozen successfully',
      });
    } catch (error) {
      logger.error('Error in freezeWallet:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to freeze wallet',
        },
      });
    }
  }

  /**
   * Unfreeze user wallet
   */
  async unfreezeWallet(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const wallet = await walletService.unfreezeWallet(userId);

      return res.json({
        success: true,
        data: wallet,
        message: 'Wallet unfrozen successfully',
      });
    } catch (error) {
      logger.error('Error in unfreezeWallet:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to unfreeze wallet',
        },
      });
    }
  }

  /**
   * Get user wallet (admin view)
   */
  async getUserWallet(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const wallet = await walletService.getWallet(userId);
      const transactions = await walletService.getTransactions(userId, 100, 0);

      return res.json({
        success: true,
        data: {
          wallet,
          recentTransactions: transactions.transactions,
        },
      });
    } catch (error) {
      logger.error('Error in getUserWallet:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get user wallet',
        },
      });
    }
  }

  /**
   * Get all pending withdrawals
   */
  async getPendingWithdrawals(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const withdrawals = await prisma.capWithdrawal.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.capWithdrawal.count({
        where: { status: 'PENDING' },
      });

      return res.json({
        success: true,
        data: {
          withdrawals,
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Error in getPendingWithdrawals:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get pending withdrawals',
        },
      });
    }
  }

  /**
   * Approve withdrawal
   */
  async approveWithdrawal(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;
      const adminId = req.user?.id;

      const withdrawal = await prisma.capWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'PROCESSING',
          processedBy: adminId,
        },
      });

      // Notify user
      await notificationService.create({
        userId: withdrawal.userId,
        type: 'FINANCIAL',
        title: '💰 Withdrawal Processing',
        body: 'Your withdrawal is now being processed and will be completed soon.',
        data: {
          screen: 'wallet',
          action: 'view_withdrawals',
        },
      });

      return res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal approved',
      });
    } catch (error) {
      logger.error('Error in approveWithdrawal:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to approve withdrawal',
        },
      });
    }
  }

  /**
   * Reject withdrawal
   */
  async rejectWithdrawal(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Rejection reason required',
          },
        });
      }

      const withdrawal = await prisma.capWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'CANCELLED',
          failureReason: reason,
        },
      });

      // Refund CAP to user
      await walletService.deposit({
        userId: withdrawal.userId,
        amount: withdrawal.capAmount / 100, // Convert back to fiat equivalent
        currency: 'USD',
        paymentMethod: 'system',
        paymentProvider: 'system',
        transactionId: `refund-${withdrawalId}`,
      });

      // Notify user
      await notificationService.create({
        userId: withdrawal.userId,
        type: 'FINANCIAL',
        title: '❌ Withdrawal Rejected',
        body: `Your withdrawal was rejected. Reason: ${reason}`,
        data: {
          screen: 'wallet',
          action: 'view_withdrawals',
        },
      });

      return res.json({
        success: true,
        message: 'Withdrawal rejected and funds returned',
      });
    } catch (error) {
      logger.error('Error in rejectWithdrawal:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to reject withdrawal',
        },
      });
    }
  }

  /**
   * Mark withdrawal as completed
   */
  async completeWithdrawal(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;
      const { transactionId } = req.body;

      const withdrawal = await prisma.capWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionId,
        },
      });

      // Notify user
      await notificationService.create({
        userId: withdrawal.userId,
        type: 'FINANCIAL',
        title: '✅ Withdrawal Completed',
        body: `Your withdrawal of $${withdrawal.fiatAmount} has been sent to your account.`,
        data: {
          screen: 'wallet',
          action: 'view_withdrawals',
        },
      });

      return res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal completed',
      });
    } catch (error) {
      logger.error('Error in completeWithdrawal:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to complete withdrawal',
        },
      });
    }
  }

  /**
   * Adjust CAP economics manually
   */
  async adjustCapEconomics(req: Request, res: Response) {
    try {
      const { adjustments } = req.body;

      // Log the adjustment
      await prisma.systemLog.create({
        data: {
          level: 'info',
          component: 'cap-economics',
          message: 'Manual CAP economics adjustment',
          details: { adjustments, adminId: req.user?.id },
        },
      });

      // Trigger recalculation
      await capEconomicsService.adjustRewardWeights();

      return res.json({
        success: true,
        message: 'CAP economics adjusted',
      });
    } catch (error) {
      logger.error('Error in adjustCapEconomics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to adjust CAP economics',
        },
      });
    }
  }
}

export const adminWalletController = new AdminWalletController();