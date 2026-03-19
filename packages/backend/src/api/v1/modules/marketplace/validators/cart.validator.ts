/**
 * Cart Validators
 * Zod validation schemas for cart operations
 */

import { z } from 'zod';

// Get cart validation
export const getCartValidator = z.object({});

// Get cart summary validation
export const getCartSummaryValidator = z.object({});

// Add item to cart validation
export const addItemToCartValidator = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().positive().default(1),
  }),
});

// Update cart item quantity validation
export const updateCartItemValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format'),
  }),
  body: z.object({
    quantity: z.number().int().positive(),
  }),
});

// Remove item from cart validation
export const removeCartItemValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format'),
  }),
});

// Clear cart validation
export const clearCartValidator = z.object({});

// Validate cart validation
export const validateCartValidator = z.object({});

// Apply discount validation
export const applyDiscountValidator = z.object({
  body: z.object({
    discountCode: z.string().min(1).max(50),
  }),
});

// Estimate shipping validation
export const estimateShippingValidator = z.object({
  body: z.object({
    addressId: z.string().uuid('Invalid address ID format'),
  }),
});

// Merge carts validation
export const mergeCartsValidator = z.object({
  body: z.object({
    guestCartId: z.string().uuid('Invalid cart ID format'),
  }),
});