/**
 * Sponsor Validators
 * Zod validation schemas for sponsor operations
 */

import { z } from 'zod';

// Update sponsor profile validation
export const updateSponsorProfileValidator = z.object({
  body: z.object({
    companyName: z.string().min(2).max(100).optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    businessType: z.string().optional(),
    businessCategory: z.string().optional(),
    website: z.string().url().optional(),
  }),
});

// Get sponsor stats validation
export const getSponsorStatsValidator = z.object({});

// Get sponsor brands validation
export const getSponsorBrandsValidator = z.object({});

// Create brand validation
export const createBrandValidator = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    industry: z.string().optional(),
    website: z.string().url().optional(),
  }),
});

// Update brand validation
export const updateBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    industry: z.string().optional(),
    website: z.string().url().optional(),
  }),
});

// Delete brand validation
export const deleteBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});

// Get payment methods validation
export const getPaymentMethodsValidator = z.object({});

// Add payment method validation
export const addPaymentMethodValidator = z.object({
  body: z.object({
    methodType: z.enum(['card', 'bank', 'mobile_money', 'paypal']),
    provider: z.string(),
    accountLast4: z.string().optional(),
    cardBrand: z.string().optional(),
    cardExpiryMonth: z.number().min(1).max(12).optional(),
    cardExpiryYear: z.number().min(2023).max(2050).optional(),
    isDefault: z.boolean().default(false),
  }),
});

// Remove payment method validation
export const removePaymentMethodValidator = z.object({
  params: z.object({
    methodId: z.string().uuid('Invalid method ID format'),
  }),
});

// Get transactions validation
export const getTransactionsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get invoices validation
export const getInvoicesValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get dashboard validation
export const getDashboardValidator = z.object({});