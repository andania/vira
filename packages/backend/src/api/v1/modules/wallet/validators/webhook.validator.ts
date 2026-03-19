/**
 * Webhook Validators
 * Zod validation schemas for webhook operations
 */

import { z } from 'zod';

// Stripe webhook validation
export const stripeWebhookValidator = z.object({
  headers: z.object({
    'stripe-signature': z.string().min(1, 'Stripe signature is required'),
  }),
  body: z.any(), // Raw body needed for signature verification
});

// PayPal webhook validation
export const paypalWebhookValidator = z.object({
  headers: z.object({
    'paypal-auth-algo': z.string().optional(),
    'paypal-cert-url': z.string().optional(),
    'paypal-transmission-id': z.string().optional(),
    'paypal-transmission-sig': z.string().optional(),
    'paypal-transmission-time': z.string().optional(),
  }),
  body: z.any(),
});

// Flutterwave webhook validation
export const flutterwaveWebhookValidator = z.object({
  headers: z.object({
    'verif-hash': z.string().min(1, 'Verification hash is required'),
  }),
  body: z.object({
    event: z.string(),
    data: z.any(),
  }),
});

// Paystack webhook validation
export const paystackWebhookValidator = z.object({
  headers: z.object({
    'x-paystack-signature': z.string().min(1, 'Paystack signature is required'),
  }),
  body: z.any(),
});

// Mobile money webhook validation
export const mobileMoneyWebhookValidator = z.object({
  body: z.object({
    type: z.enum(['payment.success', 'payment.failed']),
    data: z.object({
      externalReference: z.string(),
      amount: z.string().or(z.number()),
      currency: z.string(),
      transactionId: z.string(),
      provider: z.string().optional(),
      reason: z.string().optional(),
    }),
  }),
});