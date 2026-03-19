/**
 * Analytics Validators
 * Zod validation schemas for analytics operations
 */

import { z } from 'zod';

// Event type enum
export const EventTypeEnum = z.enum([
  'page_view',
  'click',
  'engagement',
  'conversion',
  'login',
  'signup',
  'purchase',
  'custom'
]);

// Track event validation
export const trackEventValidator = z.object({
  body: z.object({
    eventType: EventTypeEnum,
    properties: z.record(z.any()).optional(),
  }),
});

// Track batch events validation
export const trackBatchEventsValidator = z.object({
  body: z.object({
    events: z.array(z.object({
      eventType: EventTypeEnum,
      properties: z.record(z.any()).optional(),
      timestamp: z.string().optional(),
    })).min(1).max(100),
  }),
});

// Query analytics validation
export const queryAnalyticsValidator = z.object({
  body: z.object({
    startDate: z.string(),
    endDate: z.string(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
  }),
});

// Get active users validation
export const getActiveUsersValidator = z.object({
  query: z.object({
    period: z.enum(['realtime', 'today', 'week', 'month']).default('today'),
  }),
});

// Get user analytics validation
export const getUserAnalyticsValidator = z.object({
  params: z.object({
    userId: z.string().uuid().optional(),
  }),
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get platform analytics validation
export const getPlatformAnalyticsValidator = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Export analytics validation
export const exportAnalyticsValidator = z.object({
  body: z.object({
    startDate: z.string(),
    endDate: z.string(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    format: z.enum(['json', 'csv']).default('json'),
  }),
});