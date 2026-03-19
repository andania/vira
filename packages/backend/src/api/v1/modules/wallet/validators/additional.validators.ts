/**
 * Additional Wallet Validators
 * Zod validation schemas for payment methods
 */

import { z } from 'zod';

// Add payment method validation
export const addPaymentMethodValidator = z.object({
  body: z.object({
    paymentMethodId: z.string().min(1, 'Payment method ID is required'),
    provider: z.enum(['stripe', 'paypal']).default('stripe'),
  }),
});

// Remove payment method validation
export const removePaymentMethodValidator = z.object({
  params: z.object({
    methodId: z.string().uuid('Invalid method ID format'),
  }),
});

// Set default payment method validation
export const setDefaultPaymentMethodValidator = z.object({
  params: z.object({
    methodId: z.string().uuid('Invalid method ID format'),
  }),
});