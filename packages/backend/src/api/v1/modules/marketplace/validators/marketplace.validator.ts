/**
 * Marketplace Validators
 * Zod validation schemas for main marketplace operations
 */

import { z } from 'zod';

// Get dashboard stats validation
export const getDashboardStatsValidator = z.object({});

// Checkout validation
export const checkoutValidator = z.object({
  body: z.object({
    shippingAddressId: z.string().uuid().optional(),
    billingAddressId: z.string().uuid().optional(),
    paymentMethod: z.string().min(1),
    notes: z.string().max(500).optional(),
    discountCode: z.string().optional(),
  }),
});

// Get user activity validation
export const getUserActivityValidator = z.object({});

// Get seller dashboard validation
export const getSellerDashboardValidator = z.object({});

// Search marketplace validation
export const searchMarketplaceValidator = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.string().regex(/^\d*\.?\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d*\.?\d+$/).transform(Number).optional(),
    brands: z.string().optional(),
    inStock: z.enum(['true', 'false']).optional(),
    sortBy: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Import products validation
export const importProductsValidator = z.object({
  body: z.object({
    products: z.array(z.any()).min(1),
  }),
});

// Export products validation
export const exportProductsValidator = z.object({
  query: z.object({
    format: z.enum(['json', 'csv']).default('json'),
  }),
});

// Get marketplace health validation
export const getMarketplaceHealthValidator = z.object({});

// Get featured products validation
export const getFeaturedValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get categories validation
export const getCategoriesValidator = z.object({});

// Get recent orders validation (admin)
export const getRecentOrdersValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get top products validation
export const getTopProductsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get marketplace summary validation
export const getMarketplaceSummaryValidator = z.object({});

// Get seller stats validation
export const getSellerStatsValidator = z.object({});

// Bulk update products validation
export const bulkUpdateProductsValidator = z.object({
  body: z.object({
    productIds: z.array(z.string().uuid()).min(1),
    status: z.enum(['draft', 'active', 'inactive', 'discontinued']),
  }),
});