/**
 * Withdrawal Validators
 * Zod validation schemas for withdrawal operations
 */

import { z } from 'zod';

// Bank account details schema
const bankAccountSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  routingNumber: z.string().min(1, 'Routing number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankCountry: z.string().length(2, 'Country code must be 2 characters'),
  accountType: z.enum(['checking', 'savings']).optional(),
});

// Mobile money details schema
const mobileMoneySchema = z.object({
  provider: z.enum(['mtn', 'vodafone', 'airtel', 'tigo', 'orange']),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  accountName: z.string().min(1, 'Account name is required'),
});

// PayPal details schema
const paypalSchema = z.object({
  email: z.string().email('Valid PayPal email is required'),
});

// Request withdrawal validation
export const requestWithdrawalValidator = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive').min(10, 'Minimum withdrawal is $10').max(5000, 'Maximum withdrawal is $5,000'),
    currency: z.string().length(3).default('USD'),
    paymentMethod: z.enum(['bank', 'mobile_money', 'paypal']),
    accountDetails: z.discriminatedUnion('paymentMethod', [
      z.object({ paymentMethod: z.literal('bank'), ...bankAccountSchema.shape }),
      z.object({ paymentMethod: z.literal('mobile_money'), ...mobileMoneySchema.shape }),
      z.object({ paymentMethod: z.literal('paypal'), ...paypalSchema.shape }),
    ]),
  }),
});

// Get withdrawal history validation
export const getWithdrawalHistoryValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  }),
});

// Get single withdrawal validation
export const getWithdrawalValidator = z.object({
  params: z.object({
    withdrawalId: z.string().uuid('Invalid withdrawal ID format'),
  }),
});

// Cancel withdrawal validation
export const cancelWithdrawalValidator = z.object({
  params: z.object({
    withdrawalId: z.string().uuid('Invalid withdrawal ID format'),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

// Get withdrawal methods validation
export const getWithdrawalMethodsValidator = z.object({
  query: z.object({
    currency: z.string().length(3).optional(),
  }),
});

// Get withdrawal statistics validation
export const getWithdrawalStatsValidator = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional(),
  }),
});

// Approve withdrawal validation (admin)
export const approveWithdrawalValidator = z.object({
  params: z.object({
    withdrawalId: z.string().uuid('Invalid withdrawal ID format'),
  }),
});

// Reject withdrawal validation (admin)
export const rejectWithdrawalValidator = z.object({
  params: z.object({
    withdrawalId: z.string().uuid('Invalid withdrawal ID format'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Rejection reason is required').max(500),
  }),
});

// Complete withdrawal validation (admin)
export const completeWithdrawalValidator = z.object({
  params: z.object({
    withdrawalId: z.string().uuid('Invalid withdrawal ID format'),
  }),
  body: z.object({
    transactionId: z.string().optional(),
  }),
});