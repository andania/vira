/**
 * Wallet Controller
 * Handles HTTP requests for wallet operations
 */

import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { paymentService } from '../services/payment.service';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class WalletController {
  /**
   * Get wallet balance
   */
  async getBalance(req: Request, res: Response) {
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

      const balance = await walletService.getBalance(userId);
      
      return res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      logger.error('Error in getBalance:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get wallet balance',
        },
      });
    }
  }

  /**
   * Get wallet details
   */
  async getWallet(req: Request, res: Response) {
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

      const wallet = await walletService.getWallet(userId);
      
      return res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      logger.error('Error in getWallet:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get wallet',
        },
      });
    }
  }

  /**
   * Create payment intent for deposit
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
            message: 'Transaction blocked by fraud prevention',
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
   * Confirm deposit (for Stripe)
   */
  async confirmDeposit(req: Request, res: Response) {
    try {
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
   * Execute PayPal payment
   */
  async executePayPalPayment(req: Request, res: Response) {
    try {
      const { paymentId, payerId } = req.body;

      if (!paymentId || !payerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment ID and Payer ID required',
          },
        });
      }

      const paymentIntent = await paymentService.executePayPalPayment(paymentId, payerId);

      return res.json({
        success: true,
        data: paymentIntent,
      });
    } catch (error) {
      logger.error('Error in executePayPalPayment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to execute PayPal payment',
        },
      });
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      await paymentService.cancelPaymentIntent(paymentIntentId);

      return res.json({
        success: true,
        message: 'Payment cancelled',
      });
    } catch (error) {
      logger.error('Error in cancelPayment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to cancel payment',
        },
      });
    }
  }

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

      if (!paymentMethod || !accountDetails) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment method and account details required',
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
   * Transfer CAP to another user
   */
  async transferCap(req: Request, res: Response) {
    try {
      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const { receiverId, amount, note } = req.body;

      if (!receiverId || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Receiver ID and valid amount required',
          },
        });
      }

      // Check for fraud
      const fraudScore = await fraudDetectionService.analyzeTransaction(
        senderId,
        amount,
        'transfer',
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceFingerprint: req.headers['x-device-fingerprint'],
          receiverId,
        }
      );

      if (fraudScore.action === 'block') {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.FRAUD_DETECTED,
            message: 'Transfer blocked by fraud prevention',
            details: { reasons: fraudScore.reasons },
          },
        });
      }

      const transfer = await walletService.transfer({
        senderId,
        receiverId,
        amount,
        note,
      });

      return res.json({
        success: true,
        data: transfer,
      });
    } catch (error) {
      logger.error('Error in transferCap:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to transfer CAP',
        },
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(req: Request, res: Response) {
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

      const transactions = await walletService.getTransactions(userId, limit, offset);

      return res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get transactions',
        },
      });
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawals(req: Request, res: Response) {
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

      const withdrawals = await walletService.getWithdrawals(userId, limit, offset);

      return res.json({
        success: true,
        data: withdrawals,
      });
    } catch (error) {
      logger.error('Error in getWithdrawals:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get withdrawals',
        },
      });
    }
  }

  /**
   * Get deposit history
   */
  async getDeposits(req: Request, res: Response) {
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

      const deposits = await walletService.getDeposits(userId, limit, offset);

      return res.json({
        success: true,
        data: deposits,
      });
    } catch (error) {
      logger.error('Error in getDeposits:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get deposits',
        },
      });
    }
  }

  /**
   * Get CAP value
   */
  async getCapValue(req: Request, res: Response) {
    try {
      const capValue = await walletService.getCapValue();

      return res.json({
        success: true,
        data: capValue,
      });
    } catch (error) {
      logger.error('Error in getCapValue:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get CAP value',
        },
      });
    }
  }

  /**
   * Get user payment methods
   */
  async getPaymentMethods(req: Request, res: Response) {
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

      const methods = await paymentService.getUserPaymentMethods(userId);

      return res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Error in getPaymentMethods:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get payment methods',
        },
      });
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(req: Request, res: Response) {
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

      const { paymentMethodId, provider = 'stripe' } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment method ID required',
          },
        });
      }

      const method = await paymentService.addPaymentMethod(userId, paymentMethodId, provider);

      return res.json({
        success: true,
        data: method,
      });
    } catch (error) {
      logger.error('Error in addPaymentMethod:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to add payment method',
        },
      });
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(req: Request, res: Response) {
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

      const { methodId } = req.params;

      await paymentService.removePaymentMethod(userId, methodId);

      return res.json({
        success: true,
        message: 'Payment method removed',
      });
    } catch (error) {
      logger.error('Error in removePaymentMethod:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to remove payment method',
        },
      });
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(req: Request, res: Response) {
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

      const { methodId } = req.params;

      await paymentService.setDefaultPaymentMethod(userId, methodId);

      return res.json({
        success: true,
        message: 'Default payment method updated',
      });
    } catch (error) {
      logger.error('Error in setDefaultPaymentMethod:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to set default payment method',
        },
      });
    }
  }
}

export const walletController = new WalletController();