/**
 * Order Validators
 * Zod validation schemas for order operations
 */

import { z } from 'zod';

// Order status enum
export const OrderStatusEnum = z.enum([
  'pending',
  'processing',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]);

// Order item schema
const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
});

// Create order validation
export const createOrderValidator = z.object({
  body: z.object({
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    shippingAddressId: z.string().uuid().optional(),
    billingAddressId: z.string().uuid().optional(),
    paymentMethod: z.string().min(1),
    notes: z.string().max(500).optional(),
  }),
});

// Get user orders validation
export const getUserOrdersValidator = z.object({
  query: z.object({
    status: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get order by ID validation
export const getOrderByIdValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
});

// Cancel order validation
export const cancelOrderValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

// Get order stats validation
export const getOrderStatsValidator = z.object({});

// Track order validation
export const trackOrderValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
});

// Request return validation
export const requestReturnValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
  body: z.object({
    reason: z.string().min(1).max(500),
    items: z.array(z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      reason: z.string().optional(),
    })),
  }),
});

// Get seller orders validation
export const getSellerOrdersValidator = z.object({
  query: z.object({
    status: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Update order status validation (seller)
export const updateOrderStatusValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
  body: z.object({
    status: OrderStatusEnum,
    notes: z.string().max(500).optional(),
  }),
});