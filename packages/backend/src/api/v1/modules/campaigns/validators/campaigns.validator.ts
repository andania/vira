/**
 * Campaign Validators
 * Zod validation schemas for campaign operations
 */

import { z } from 'zod';

// Campaign objective enum
export const CampaignObjectiveEnum = z.enum([
  'awareness',
  'engagement',
  'conversion',
  'traffic',
  'sales'
]);

// Campaign status enum
export const CampaignStatusEnum = z.enum([
  'draft',
  'pending',
  'approved',
  'active',
  'paused',
  'completed',
  'cancelled',
  'rejected'
]);

// Create campaign validation
export const createCampaignValidator = z.object({
  body: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    name: z.string().min(3, 'Campaign name must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    objective: CampaignObjectiveEnum,
    startDate: z.string().or(z.date()).transform(val => new Date(val)),
    endDate: z.string().or(z.date()).transform(val => new Date(val)),
    timezone: z.string().default('UTC'),
    totalBudget: z.number().positive('Budget must be positive'),
    dailyBudget: z.number().positive().optional(),
    currency: z.string().length(3).default('USD'),
    targeting: z.any().optional(),
  }).refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
});

// Update campaign validation
export const updateCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    objective: CampaignObjectiveEnum.optional(),
    status: CampaignStatusEnum.optional(),
    startDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    endDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    totalBudget: z.number().positive().optional(),
    dailyBudget: z.number().positive().optional(),
    targeting: z.any().optional(),
  }),
});

// Get campaign by ID validation
export const getCampaignByIdValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Delete campaign validation
export const deleteCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Launch campaign validation
export const launchCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Pause campaign validation
export const pauseCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// End campaign validation
export const endCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Duplicate campaign validation
export const duplicateCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
  }),
});

// Get campaigns by brand validation
export const getCampaignsByBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    status: z.string().optional(),
    objective: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Allocate budget validation
export const allocateBudgetValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3).default('USD'),
  }),
});

// Get budget report validation
export const getBudgetReportValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});