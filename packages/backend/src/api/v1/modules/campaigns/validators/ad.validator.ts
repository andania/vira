/**
 * Ad Validators
 * Zod validation schemas for ad operations
 */

import { z } from 'zod';

// Ad type enum
export const AdTypeEnum = z.enum([
  'video',
  'image',
  'carousel',
  'text',
  'poll',
  'interactive'
]);

// Ad status enum
export const AdStatusEnum = z.enum([
  'draft',
  'active',
  'paused',
  'archived'
]);

// Create ad validation
export const createAdValidator = z.object({
  body: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
    name: z.string().min(3, 'Ad name must be at least 3 characters').max(100),
    type: AdTypeEnum,
    content: z.object({
      title: z.string().max(100).optional(),
      body: z.string().max(1000).optional(),
      mediaUrls: z.array(z.string().url()).optional(),
      callToAction: z.string().max(50).optional(),
      destinationUrl: z.string().url().optional(),
      pollOptions: z.array(z.string()).max(10).optional(),
    }),
    rewardWeights: z.record(z.number()).optional(),
  }),
});

// Update ad validation
export const updateAdValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    content: z.object({
      title: z.string().max(100).optional(),
      body: z.string().max(1000).optional(),
      mediaUrls: z.array(z.string().url()).optional(),
      callToAction: z.string().max(50).optional(),
      destinationUrl: z.string().url().optional(),
      pollOptions: z.array(z.string()).max(10).optional(),
    }).optional(),
    rewardWeights: z.record(z.number()).optional(),
    status: AdStatusEnum.optional(),
  }),
});

// Get ad by ID validation
export const getAdByIdValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
});

// Delete ad validation
export const deleteAdValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
});

// Upload asset validation
export const uploadAssetValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
  body: z.object({
    type: z.enum(['image', 'video', 'audio', 'document']),
  }),
});

// Delete asset validation
export const deleteAssetValidator = z.object({
  params: z.object({
    assetId: z.string().uuid('Invalid asset ID format'),
  }),
});

// Get ads by campaign validation
export const getAdsByCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

// Get ad analytics validation
export const getAdAnalyticsValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
  query: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
});

// Duplicate ad validation
export const duplicateAdValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
  body: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format').optional(),
  }),
});