/**
 * Marketplace and e-commerce validators using Zod
 */

import { z } from 'zod';
import { ProductStatus } from '../types/marketplace.types';

// Product validation
const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(['cm', 'in']),
}).optional();

export const createProductValidator = z.object({
  body: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    categoryId: z.string().uuid().optional(),
    name: z.string().min(3, 'Product name must be at least 3 characters').max(200),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(200).optional(),
    priceCap: z.number().positive().optional(),
    priceFiat: z.number().positive().optional(),
    currency: z.string().length(3).default('USD'),
    stockQuantity: z.number().int().min(0).default(0),
    sku: z.string().max(50).optional(),
    barcode: z.string().max(50).optional(),
    weight: z.number().positive().optional(),
    dimensions: dimensionsSchema,
    isDigital: z.boolean().default(false),
    digitalDownloadUrl: z.string().url().optional(),
    images: z.array(z.object({
      url: z.string().url(),
      isPrimary: z.boolean().default(false),
    })).optional(),
  }).refine(data => data.priceCap || data.priceFiat, {
    message: 'Either CAP price or fiat price is required',
  }),
});

export type CreateProductRequest = z.infer<typeof createProductValidator>['body'];

// Update product validation
export const updateProductValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(200).optional(),
    priceCap: z.number().positive().optional(),
    priceFiat: z.number().positive().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    status: z.enum([ProductStatus.DRAFT, ProductStatus.ACTIVE, ProductStatus.INACTIVE]).optional(),
    isFeatured: z.boolean().optional(),
    categoryId: z.string().uuid().optional(),
  }),
});

export type UpdateProductParams = z.infer<typeof updateProductValidator>['params'];
export type UpdateProductRequest = z.infer<typeof updateProductValidator>['body'];

// Get product by ID validation
export const getProductByIdValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

export type GetProductByIdParams = z.infer<typeof getProductByIdValidator>['params'];

// List products validation
export const listProductsValidator = z.object({
  query: z.object({
    brandId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type ListProductsQuery = z.infer<typeof listProductsValidator>['query'];

// Cart validation
export const addToCartValidator = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().positive().default(1),
  }),
});

export type AddToCartRequest = z.infer<typeof addToCartValidator>['body'];

export const updateCartItemValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format'),
  }),
  body: z.object({
    quantity: z.number().int().positive(),
  }),
});

export type UpdateCartItemParams = z.infer<typeof updateCartItemValidator>['params'];
export type UpdateCartItemRequest = z.infer<typeof updateCartItemValidator>['body'];

export const removeFromCartValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format'),
  }),
});

export type RemoveFromCartParams = z.infer<typeof removeFromCartValidator>['params'];

// Order validation
export const createOrderValidator = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
      quantity: z.number().int().positive(),
    })).min(1, 'Order must have at least one item'),
    shippingAddressId: z.string().uuid().optional(),
    billingAddressId: z.string().uuid().optional(),
    paymentMethod: z.string().min(1),
    notes: z.string().max(500).optional(),
  }),
});

export type CreateOrderRequest = z.infer<typeof createOrderValidator>['body'];

export const getOrderByIdValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
});

export type GetOrderByIdParams = z.infer<typeof getOrderByIdValidator>['params'];

export const listOrdersValidator = z.object({
  query: z.object({
    status: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export type ListOrdersQuery = z.infer<typeof listOrdersValidator>['query'];

export const cancelOrderValidator = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export type CancelOrderParams = z.infer<typeof cancelOrderValidator>['params'];
export type CancelOrderRequest = z.infer<typeof cancelOrderValidator>['body'];

// Review validation
export const createReviewValidator = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    orderId: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(100).optional(),
    content: z.string().max(2000).optional(),
    pros: z.array(z.string().max(100)).max(10).optional(),
    cons: z.array(z.string().max(100)).max(10).optional(),
    images: z.array(z.string().url()).max(10).optional(),
  }),
});

export type CreateReviewRequest = z.infer<typeof createReviewValidator>['body'];

export const updateReviewValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(100).optional(),
    content: z.string().max(2000).optional(),
    pros: z.array(z.string().max(100)).max(10).optional(),
    cons: z.array(z.string().max(100)).max(10).optional(),
  }),
});

export type UpdateReviewParams = z.infer<typeof updateReviewValidator>['params'];
export type UpdateReviewRequest = z.infer<typeof updateReviewValidator>['body'];

export const deleteReviewValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
});

export type DeleteReviewParams = z.infer<typeof deleteReviewValidator>['params'];

export const markReviewHelpfulValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
  body: z.object({
    helpful: z.boolean(),
  }),
});

export type MarkReviewHelpfulParams = z.infer<typeof markReviewHelpfulValidator>['params'];
export type MarkReviewHelpfulRequest = z.infer<typeof markReviewHelpfulValidator>['body'];

// Wishlist validation
export const addToWishlistValidator = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

export type AddToWishlistRequest = z.infer<typeof addToWishlistValidator>['body'];

export const removeFromWishlistValidator = z.object({
  params: z.object({
    wishlistItemId: z.string().uuid('Invalid wishlist item ID format'),
  }),
});

export type RemoveFromWishlistParams = z.infer<typeof removeFromWishlistValidator>['params'];