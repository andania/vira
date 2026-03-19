/**
 * Transaction Controller
 * Handles HTTP requests for transaction operations
 */

import { Request, Response } from 'express';
import { transactionRepository } from '../repositories/transaction.repository';
import { walletService } from '../services/wallet.service';
import { exportService } from '../../../../services/export.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class TransactionController {
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
      const type = req.query.type as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // Build filters
      const filters: any = {};
      
      if (type) {
        filters.type = type;
      }
      
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate);
        if (endDate) filters.createdAt.lte = new Date(endDate);
      }

      const wallet = await walletService.getWallet(userId);
      
      const [transactions, total] = await Promise.all([
        prisma.capTransaction.findMany({
          where: {
            walletId: wallet.id,
            ...filters,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.capTransaction.count({
          where: {
            walletId: wallet.id,
            ...filters,
          },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          transactions,
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total,
        },
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
   * Get single transaction
   */
  async getTransaction(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { transactionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const transaction = await prisma.capTransaction.findFirst({
        where: {
          id: transactionId,
          wallet: { userId },
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
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Transaction not found',
          },
        });
      }

      return res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      logger.error('Error in getTransaction:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get transaction',
        },
      });
    }
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary(req: Request, res: Response) {
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

      const wallet = await walletService.getWallet(userId);

      const [transactions, earnings, spending] = await Promise.all([
        prisma.capTransaction.findMany({
          where: {
            walletId: wallet.id,
            createdAt: { gte: startDate, lte: endDate },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.capTransaction.aggregate({
          where: {
            walletId: wallet.id,
            createdAt: { gte: startDate, lte: endDate },
            amount: { gt: 0 },
          },
          _sum: { amount: true },
        }),
        prisma.capTransaction.aggregate({
          where: {
            walletId: wallet.id,
            createdAt: { gte: startDate, lte: endDate },
            amount: { lt: 0 },
          },
          _sum: { amount: true },
        }),
      ]);

      // Group by day for chart
      const dailyData = this.groupTransactionsByDay(transactions, startDate, endDate);

      return res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate,
          summary: {
            totalEarnings: earnings._sum.amount || 0,
            totalSpending: Math.abs(spending._sum.amount || 0),
            netChange: (earnings._sum.amount || 0) - Math.abs(spending._sum.amount || 0),
            transactionCount: transactions.length,
          },
          dailyData,
        },
      });
    } catch (error) {
      logger.error('Error in getTransactionSummary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get transaction summary',
        },
      });
    }
  }

  /**
   * Export transactions
   */
  async exportTransactions(req: Request, res: Response) {
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

      const format = req.query.format as string || 'csv';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const wallet = await walletService.getWallet(userId);

      const transactions = await prisma.capTransaction.findMany({
        where: {
          walletId: wallet.id,
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      const exportData = transactions.map(t => ({
        Date: t.createdAt.toISOString(),
        Type: t.type,
        Amount: t.amount,
        'Balance Before': t.balanceBefore,
        'Balance After': t.balanceAfter,
        Description: t.description || '',
        Status: t.status,
      }));

      let fileUrl: string;
      let contentType: string;
      let filename: string;

      if (format === 'csv') {
        const csv = this.convertToCSV(exportData);
        fileUrl = await exportService.uploadCSV(csv, `transactions-${userId}-${Date.now()}.csv`);
        contentType = 'text/csv';
        filename = `transactions-${Date.now()}.csv`;
      } else {
        const pdf = await exportService.generatePDF(exportData, 'Transaction History');
        fileUrl = await exportService.uploadPDF(pdf, `transactions-${userId}-${Date.now()}.pdf`);
        contentType = 'application/pdf';
        filename = `transactions-${Date.now()}.pdf`;
      }

      return res.json({
        success: true,
        data: {
          url: fileUrl,
          filename,
          contentType,
          count: transactions.length,
        },
      });
    } catch (error) {
      logger.error('Error in exportTransactions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to export transactions',
        },
      });
    }
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(req: Request, res: Response) {
    try {
      const { reference } = req.params;

      const transaction = await prisma.capTransaction.findFirst({
        where: {
          OR: [
            { id: reference },
            { referenceId: reference },
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
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Transaction not found',
          },
        });
      }

      return res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      logger.error('Error in getTransactionByReference:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get transaction',
        },
      });
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Group transactions by day for charting
   */
  private groupTransactionsByDay(transactions: any[], startDate: Date, endDate: Date) {
    const dailyMap = new Map();
    
    // Initialize all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        earnings: 0,
        spending: 0,
        net: 0,
        count: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate transactions
    for (const tx of transactions) {
      const dateStr = tx.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day) {
        if (tx.amount > 0) {
          day.earnings += tx.amount;
        } else {
          day.spending += Math.abs(tx.amount);
        }
        day.net += tx.amount;
        day.count++;
      }
    }

    return Array.from(dailyMap.values());
  }

  /**
   * Convert array to CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
      headers.map(header => JSON.stringify(obj[header] || '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
}

export const transactionController = new TransactionController();