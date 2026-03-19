/**
 * Product Validators
 * Zod validation schemas for product operations
 */

import { z } from 'zod';

// Product status enum
export const ProductStatusEnum = z.enum([
  'draft',
  'active',
  'inactive',
  'discontinued'
]);

// Create product validation
export const createProductValidator = z.object({
  body: z.object({
    name: z.string().min(3).max(200),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(200).optional(),
    priceCap: z.number().positive().optional(),
    priceFiat: z.number().positive().optional(),
    currency: z.string().length(3).default('USD'),
    stockQuantity: z.number().int().min(0).default(0),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    weight: z.number().positive().optional(),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      unit: z.enum(['cm', 'in']),
    }).optional(),
    isDigital: z.boolean().default(false),
    digitalDownloadUrl: z.string().url().optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
  }).refine(data => data.priceCap || data.priceFiat, {
    message: 'Either CAP price or fiat price is required',
  }),
});

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
    currency: z.string().length(3).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    status: ProductStatusEnum.optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    isFeatured: z.boolean().optional(),
  }),
});

// Get product by ID validation
export const getProductByIdValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Delete product validation
export const deleteProductValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Add product images validation
export const addProductImagesValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Remove product image validation
export const removeProductImageValidator = z.object({
  params: z.object({
    imageId: z.string().uuid('Invalid image ID format'),
  }),
});

// Create variant validation
export const createVariantValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    name: z.string().min(1).max(100),
    sku: z.string().optional(),
    attributes: z.record(z.string()),
    priceCap: z.number().positive().optional(),
    priceFiat: z.number().positive().optional(),
    stockQuantity: z.number().int().min(0).default(0),
  }),
});

// Update variant validation
export const updateVariantValidator = z.object({
  params: z.object({
    variantId: z.string().uuid('Invalid variant ID format'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    sku: z.string().optional(),
    attributes: z.record(z.string()).optional(),
    priceCap: z.number().positive().optional(),
    priceFiat: z.number().positive().optional(),
    stockQuantity: z.number().int().min(0).optional(),
  }),
});

// Delete variant validation
export const deleteVariantValidator = z.object({
  params: z.object({
    variantId: z.string().uuid('Invalid variant ID format'),
  }),
});

// Update inventory validation
export const updateInventoryValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    quantity: z.number().int().min(0),
  }),
});

// Search products validation
export const searchProductsValidator = z.object({
  query: z.object({
    q: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    minPrice: z.string().regex(/^\d*\.?\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d*\.?\d+$/).transform(Number).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    tags: z.string().optional(),
    sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'popular', 'rating']).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get products by brand validation
export const getProductsByBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    status: z.string().optional(),
  }),
});

// Get categories validation
export const getCategoriesValidator = z.object({});

// Get featured products validation
export const getFeaturedProductsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get related products validation
export const getRelatedProductsValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});