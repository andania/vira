/**
 * Review Validators
 * Zod validation schemas for review operations
 */

import { z } from 'zod';

// Create review validation
export const createReviewValidator = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    orderId: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(100).optional(),
    content: z.string().max(2000).optional(),
    pros: z.array(z.string().max(100)).max(10).optional(),
    cons: z.array(z.string().max(100)).max(10).optional(),
  }),
});

// Get product reviews validation
export const getProductReviewsValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['recent', 'helpful', 'rating']).optional(),
  }),
});

// Get review by ID validation
export const getReviewByIdValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
});

// Update review validation
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

// Delete review validation
export const deleteReviewValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
});

// Mark review as helpful validation
export const markHelpfulValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
  body: z.object({
    helpful: z.boolean(),
  }),
});

// Get user reviews validation
export const getUserReviewsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get review statistics validation
export const getReviewStatsValidator = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
});

// Moderate review validation (admin)
export const moderateReviewValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'flagged']),
    reason: z.string().max(500).optional(),
  }),
});

// Report review validation
export const reportReviewValidator = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID format'),
  }),
  body: z.object({
    reason: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
  }),
});