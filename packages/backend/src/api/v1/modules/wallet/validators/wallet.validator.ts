/**
 * Wallet Validators
 * Zod validation schemas for wallet operations
 */

import { z } from 'zod';

// Transfer validation
export const transferValidator = z.object({
  body: z.object({
    receiverId: z.string().uuid('Invalid receiver ID format'),
    amount: z.number().int().positive('Amount must be a positive integer'),
    note: z.string().max(255).optional(),
  }),
});

// Get wallet by user ID validation
export const getWalletValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format').optional(),
  }),
});

// Get balance validation
export const getBalanceValidator = z.object({
  query: z.object({
    userId: z.string().uuid('Invalid user ID format').optional(),
  }),
});

// Freeze wallet validation (admin)
export const freezeWalletValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Reason is required').max(500),
  }),
});

// Unfreeze wallet validation (admin)
export const unfreezeWalletValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get wallet statistics validation (admin)
export const getWalletStatsValidator = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get CAP value validation
export const getCapValueValidator = z.object({
  query: z.object({
    currency: z.string().length(3).optional(),
  }),
});