/**
 * Deposit Validators
 * Zod validation schemas for deposit operations
 */

import { z } from 'zod';

// Create deposit intent validation
export const createDepositIntentValidator = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive').min(5, 'Minimum deposit is $5').max(10000, 'Maximum deposit is $10,000'),
    currency: z.string().length(3).default('USD'),
    paymentMethod: z.enum(['stripe', 'paypal', 'mobile_money', 'bank_transfer']).default('stripe'),
  }),
});

// Confirm deposit validation
export const confirmDepositValidator = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  }),
});

// Execute PayPal payment validation
export const executePayPalPaymentValidator = z.object({
  body: z.object({
    paymentId: z.string().min(1, 'Payment ID is required'),
    payerId: z.string().min(1, 'Payer ID is required'),
  }),
});

// Get deposit history validation
export const getDepositHistoryValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  }),
});

// Get single deposit validation
export const getDepositValidator = z.object({
  params: z.object({
    depositId: z.string().uuid('Invalid deposit ID format'),
  }),
});

// Cancel payment validation
export const cancelPaymentValidator = z.object({
  params: z.object({
    paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  }),
});

// Get deposit methods validation
export const getDepositMethodsValidator = z.object({
  query: z.object({
    currency: z.string().length(3).optional(),
  }),
});

// Get deposit statistics validation
export const getDepositStatsValidator = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional(),
  }),
});