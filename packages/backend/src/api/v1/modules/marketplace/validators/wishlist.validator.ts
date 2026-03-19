/**
 * Wishlist Validators
 * Zod validation schemas for wishlist operations
 */

import { z } from 'zod';

// Create wishlist validation
export const createWishlistValidator = z.object({
  body: z.object({
    name: z.string().max(100).default('My Wishlist'),
    isPublic: z.boolean().default(false),
  }),
});

// Get user wishlists validation
export const getUserWishlistsValidator = z.object({});

// Get wishlist details validation
export const getWishlistDetailsValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
  }),
});

// Update wishlist validation
export const updateWishlistValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
  }),
  body: z.object({
    name: z.string().max(100).optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Delete wishlist validation
export const deleteWishlistValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
  }),
});

// Add item to wishlist validation
export const addItemToWishlistValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
  }),
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Remove item from wishlist validation
export const removeWishlistItemValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
    itemId: z.string().uuid('Invalid wishlist item ID format'),
  }),
});

// Move item validation
export const moveWishlistItemValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid wishlist item ID format'),
  }),
  body: z.object({
    targetWishlistId: z.string().uuid('Invalid target wishlist ID format'),
  }),
});

// Copy item validation
export const copyWishlistItemValidator = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid wishlist item ID format'),
  }),
  body: z.object({
    targetWishlistId: z.string().uuid('Invalid target wishlist ID format'),
  }),
});

// Check if product in wishlist validation
export const checkInWishlistValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Get wishlist suggestions validation
export const getWishlistSuggestionsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Share wishlist validation
export const shareWishlistValidator = z.object({
  params: z.object({
    wishlistId: z.string().uuid('Invalid wishlist ID format'),
  }),
  body: z.object({
    email: z.string().email().optional(),
  }),
});

// Get shared wishlist validation
export const getSharedWishlistValidator = z.object({
  params: z.object({
    token: z.string().min(1),
  }),
});

// Get public wishlists validation
export const getPublicWishlistsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});