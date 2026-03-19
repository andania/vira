/**
 * Campaign Analytics Validators
 * Zod validation schemas for analytics operations
 */

import { z } from 'zod';

// Get campaign metrics validation
export const getCampaignMetricsValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
  }),
});

// Get campaign ROI validation
export const getCampaignROIValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Get audience insights validation
export const getAudienceInsightsValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Compare campaigns validation
export const compareCampaignsValidator = z.object({
  body: z.object({
    campaignIds: z.array(z.string().uuid('Invalid campaign ID format')).min(2).max(10),
  }),
});

// Export campaign report validation
export const exportCampaignReportValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  query: z.object({
    format: z.enum(['pdf', 'csv']).default('pdf'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get realtime stats validation
export const getRealtimeStatsValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});