/**
 * Admin Wallet Validators
 * Zod validation schemas for admin wallet operations
 */

import { z } from 'zod';

// Get pending withdrawals validation (admin)
export const getPendingWithdrawalsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Adjust CAP economics validation (admin)
export const adjustCapEconomicsValidator = z.object({
  body: z.object({
    adjustments: z.record(z.number()).refine(data => Object.keys(data).length > 0, {
      message: 'At least one adjustment is required',
    }),
  }),
});

// Get economic indicators validation (admin)
export const getEconomicIndicatorsValidator = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get fraud statistics validation (admin)
export const getFraudStatisticsValidator = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get user wallet (admin view) validation
export const getUserWalletValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});