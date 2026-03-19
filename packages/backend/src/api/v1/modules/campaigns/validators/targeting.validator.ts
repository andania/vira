/**
 * Targeting Validators
 * Zod validation schemas for targeting operations
 */

import { z } from 'zod';

// Location target schema
const locationTargetSchema = z.object({
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

// Demographic target schema
const demographicTargetSchema = z.object({
  ageMin: z.number().min(13).max(100).optional(),
  ageMax: z.number().min(13).max(100).optional(),
  genders: z.array(z.enum(['male', 'female', 'non-binary', 'all'])).optional(),
  incomeBrackets: z.array(z.string()).optional(),
  educationLevels: z.array(z.string()).optional(),
});

// Interest target schema
const interestTargetSchema = z.object({
  categories: z.array(z.string()),
  minScore: z.number().min(0).max(1).optional(),
});

// Behavior target schema
const behaviorTargetSchema = z.object({
  type: z.enum([
    'purchase_history',
    'browsing_history',
    'engagement_history',
    'room_visits',
    'ad_clicks',
    'video_watches'
  ]),
  minFrequency: z.number().positive().optional(),
  timeFrame: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

// Device target schema
const deviceTargetSchema = z.object({
  types: z.array(z.enum(['mobile', 'tablet', 'desktop'])).optional(),
  platforms: z.array(z.enum(['ios', 'android', 'windows', 'mac'])).optional(),
  browsers: z.array(z.string()).optional(),
});

// Time target schema
const timeTargetSchema = z.object({
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
});

// Complete targeting schema
export const targetingCriteriaSchema = z.object({
  locations: z.array(locationTargetSchema).optional(),
  demographic: demographicTargetSchema.optional(),
  interests: z.array(z.string()).optional(),
  behaviors: z.array(behaviorTargetSchema).optional(),
  devices: deviceTargetSchema.optional(),
  time: timeTargetSchema.optional(),
  languages: z.array(z.string().length(2)).optional(),
  customAudiences: z.array(z.string().uuid()).optional(),
  excludedAudiences: z.array(z.string().uuid()).optional(),
});

// Estimate audience validation
export const estimateAudienceValidator = z.object({
  body: z.object({
    criteria: targetingCriteriaSchema,
  }),
});

// Validate targeting validation
export const validateTargetingValidator = z.object({
  body: z.object({
    criteria: targetingCriteriaSchema,
  }),
});

// Create audience segment validation
export const createAudienceSegmentValidator = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    criteria: targetingCriteriaSchema,
  }),
});

// Update audience segment validation
export const updateAudienceSegmentValidator = z.object({
  params: z.object({
    segmentId: z.string().uuid('Invalid segment ID format'),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    criteria: targetingCriteriaSchema.optional(),
  }),
});

// Delete audience segment validation
export const deleteAudienceSegmentValidator = z.object({
  params: z.object({
    segmentId: z.string().uuid('Invalid segment ID format'),
  }),
});

// Check user match validation
export const checkUserMatchValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    criteria: targetingCriteriaSchema,
  }),
});