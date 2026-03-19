/**
 * Campaign and advertising validators using Zod
 */

import { z } from 'zod';
import { CampaignObjective, AdType, CampaignStatus } from '../types/campaign.types';

// Targeting schemas
const geoLocationSchema = z.object({
  type: z.enum(['country', 'region', 'city', 'radius']),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  radius: z.number().positive().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

const demographicTargetSchema = z.object({
  ageMin: z.number().min(13).max(100).optional(),
  ageMax: z.number().min(13).max(100).optional(),
  genders: z.array(z.enum(['male', 'female', 'non-binary', 'all'])).optional(),
  incomeBrackets: z.array(z.string()).optional(),
  educationLevels: z.array(z.string()).optional(),
});

const interestTargetSchema = z.object({
  categories: z.array(z.string()),
  minScore: z.number().min(0).max(1).optional(),
});

const behavioralTargetSchema = z.object({
  type: z.enum(['purchase_history', 'browsing_history', 'engagement_history', 'room_visits', 'ad_clicks', 'video_watches']),
  minFrequency: z.number().positive().optional(),
  timeFrame: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

const timeTargetSchema = z.object({
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
});

const deviceTargetSchema = z.object({
  deviceTypes: z.array(z.enum(['mobile', 'tablet', 'desktop'])).optional(),
  platforms: z.array(z.enum(['ios', 'android', 'windows', 'mac'])).optional(),
  browsers: z.array(z.string()).optional(),
});

const campaignTargetingSchema = z.object({
  locations: z.array(geoLocationSchema).optional(),
  demographic: demographicTargetSchema.optional(),
  interests: z.array(interestTargetSchema).optional(),
  behavioral: z.array(behavioralTargetSchema).optional(),
  time: timeTargetSchema.optional(),
  devices: deviceTargetSchema.optional(),
  languages: z.array(z.string().length(2)).optional(),
  customAudiences: z.array(z.string().uuid()).optional(),
  excludedAudiences: z.array(z.string().uuid()).optional(),
});

// Campaign validation
export const createCampaignValidator = z.object({
  body: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    name: z.string().min(3, 'Campaign name must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    objective: z.enum([
      CampaignObjective.AWARENESS,
      CampaignObjective.ENGAGEMENT,
      CampaignObjective.CONVERSION,
      CampaignObjective.TRAFFIC,
      CampaignObjective.SALES,
    ]),
    startDate: z.string().or(z.date()).transform(val => new Date(val)),
    endDate: z.string().or(z.date()).transform(val => new Date(val)),
    timezone: z.string().default('UTC'),
    totalBudget: z.number().positive('Budget must be positive'),
    dailyBudget: z.number().positive().optional(),
    currency: z.string().length(3).default('USD'),
    capConversionRate: z.number().positive().default(100),
    targeting: campaignTargetingSchema.optional(),
  }).refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
});

export type CreateCampaignRequest = z.infer<typeof createCampaignValidator>['body'];

// Update campaign validation
export const updateCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    objective: z.enum([
      CampaignObjective.AWARENESS,
      CampaignObjective.ENGAGEMENT,
      CampaignObjective.CONVERSION,
      CampaignObjective.TRAFFIC,
      CampaignObjective.SALES,
    ]).optional(),
    status: z.enum([
      CampaignStatus.DRAFT,
      CampaignStatus.PENDING,
      CampaignStatus.ACTIVE,
      CampaignStatus.PAUSED,
      CampaignStatus.COMPLETED,
    ]).optional(),
    startDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    endDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    totalBudget: z.number().positive().optional(),
    dailyBudget: z.number().positive().optional(),
    targeting: campaignTargetingSchema.optional(),
  }),
});

export type UpdateCampaignParams = z.infer<typeof updateCampaignValidator>['params'];
export type UpdateCampaignRequest = z.infer<typeof updateCampaignValidator>['body'];

// Ad validation
const adContentSchema = z.object({
  title: z.string().max(100).optional(),
  body: z.string().max(1000).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  callToAction: z.string().max(50).optional(),
  destinationUrl: z.string().url().optional(),
  pollOptions: z.array(z.string()).max(10).optional(),
});

export const createAdValidator = z.object({
  body: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
    name: z.string().min(3).max(100),
    type: z.enum([
      AdType.VIDEO,
      AdType.IMAGE,
      AdType.CAROUSEL,
      AdType.TEXT,
      AdType.POLL,
      AdType.INTERACTIVE,
    ]),
    content: adContentSchema,
    rewardWeights: z.record(z.number()).optional(),
  }),
});

export type CreateAdRequest = z.infer<typeof createAdValidator>['body'];

// Update ad validation
export const updateAdValidator = z.object({
  params: z.object({
    adId: z.string().uuid('Invalid ad ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    content: adContentSchema.optional(),
    rewardWeights: z.record(z.number()).optional(),
    status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  }),
});

export type UpdateAdParams = z.infer<typeof updateAdValidator>['params'];
export type UpdateAdRequest = z.infer<typeof updateAdValidator>['body'];

// Get campaign by ID validation
export const getCampaignByIdValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

export type GetCampaignByIdParams = z.infer<typeof getCampaignByIdValidator>['params'];

// List campaigns validation
export const listCampaignsValidator = z.object({
  query: z.object({
    brandId: z.string().uuid().optional(),
    status: z.string().optional(),
    objective: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type ListCampaignsQuery = z.infer<typeof listCampaignsValidator>['query'];

// Launch campaign validation
export const launchCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

export type LaunchCampaignParams = z.infer<typeof launchCampaignValidator>['params'];

// Pause campaign validation
export const pauseCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

export type PauseCampaignParams = z.infer<typeof pauseCampaignValidator>['params'];

// End campaign validation
export const endCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
});

export type EndCampaignParams = z.infer<typeof endCampaignValidator>['params'];

// Duplicate campaign validation
export const duplicateCampaignValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
  }).optional(),
});

export type DuplicateCampaignParams = z.infer<typeof duplicateCampaignValidator>['params'];
export type DuplicateCampaignRequest = z.infer<typeof duplicateCampaignValidator>['body'];

// Campaign analytics validation
export const campaignAnalyticsValidator = z.object({
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID format'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
  }),
});

export type CampaignAnalyticsParams = z.infer<typeof campaignAnalyticsValidator>['params'];
export type CampaignAnalyticsQuery = z.infer<typeof campaignAnalyticsValidator>['query'];