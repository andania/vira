/**
 * Transaction Validators
 * Zod validation schemas for transaction operations
 */

import { z } from 'zod';

// Get transactions validation
export const getTransactionsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    type: z.enum(['EARN', 'SPEND', 'DEPOSIT', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT', 'BONUS', 'DECAY', 'REFUND']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get single transaction validation
export const getTransactionValidator = z.object({
  params: z.object({
    transactionId: z.string().uuid('Invalid transaction ID format'),
  }),
});

// Get transaction by reference validation
export const getTransactionByReferenceValidator = z.object({
  params: z.object({
    reference: z.string().min(1, 'Reference is required'),
  }),
});

// Get transaction summary validation
export const getTransactionSummaryValidator = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional(),
  }),
});

// Export transactions validation
export const exportTransactionsValidator = z.object({
  query: z.object({
    format: z.enum(['csv', 'pdf']).default('csv'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});