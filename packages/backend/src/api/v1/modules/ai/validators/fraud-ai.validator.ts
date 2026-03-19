/**
 * AI Fraud Validators
 * Zod validation schemas for AI fraud operations
 */

import { z } from 'zod';

// Analyze user behavior validation
export const analyzeUserBehaviorValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Detect account takeover validation
export const detectAccountTakeoverValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Detect click fraud validation
export const detectClickFraudValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
});

// Get fraud statistics validation
export const getFraudStatisticsValidator = z.object({});