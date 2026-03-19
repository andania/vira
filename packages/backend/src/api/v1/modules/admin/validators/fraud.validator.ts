/**
 * Fraud Validators
 * Zod validation schemas for fraud detection operations
 */

import { z } from 'zod';

// Get fraud alerts validation
export const getFraudAlertsValidator = z.object({
  query: z.object({
    status: z.enum(['new', 'investigating', 'confirmed', 'false_positive']).optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get fraud alert validation
export const getFraudAlertValidator = z.object({
  params: z.object({
    alertId: z.string().uuid('Invalid alert ID format'),
  }),
});

// Update fraud alert status validation
export const updateFraudAlertStatusValidator = z.object({
  params: z.object({
    alertId: z.string().uuid('Invalid alert ID format'),
  }),
  body: z.object({
    status: z.enum(['investigating', 'confirmed', 'false_positive']),
    notes: z.string().max(1000).optional(),
  }),
});

// Get fraud statistics validation
export const getFraudStatisticsValidator = z.object({});

// Analyze transaction validation
export const analyzeTransactionValidator = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    amount: z.number().positive(),
    type: z.string(),
    metadata: z.record(z.any()).optional(),
  }),
});

// Get blacklisted items validation
export const getBlacklistedItemsValidator = z.object({});

// Add to blacklist validation
export const addToBlacklistValidator = z.object({
  body: z.object({
    type: z.enum(['user', 'device', 'ip']),
    value: z.string().min(1),
    reason: z.string().min(1).max(500),
  }),
});

// Remove from blacklist validation
export const removeFromBlacklistValidator = z.object({
  body: z.object({
    type: z.enum(['user', 'device', 'ip']),
    value: z.string().min(1),
  }),
});

// Create fraud alert validation (test)
export const createFraudAlertValidator = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
    alertType: z.string(),
    score: z.number().min(0).max(100),
    details: z.record(z.any()),
    ipAddress: z.string().ip().optional(),
    deviceFingerprint: z.string().optional(),
  }),
});