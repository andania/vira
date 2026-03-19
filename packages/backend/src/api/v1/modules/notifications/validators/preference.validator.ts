/**
 * Notification Preference Validators
 * Zod validation schemas for notification preference operations
 */

import { z } from 'zod';

// Category preferences schema
const categoryPreferencesSchema = z.object({
  financial: z.boolean().optional(),
  engagement: z.boolean().optional(),
  campaign: z.boolean().optional(),
  room: z.boolean().optional(),
  achievement: z.boolean().optional(),
  system: z.boolean().optional(),
  ai: z.boolean().optional(),
  social: z.boolean().optional(),
}).optional();

// Update preferences validation
export const updatePreferencesValidator = z.object({
  body: z.object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
    quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
    categories: categoryPreferencesSchema,
  }),
});

// Update quiet hours validation
export const updateQuietHoursValidator = z.object({
  body: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }).refine(data => {
    if (data.enabled && (!data.start || !data.end)) {
      return false;
    }
    return true;
  }, {
    message: 'Start and end times are required when enabling quiet hours',
  }),
});

// Toggle category validation
export const toggleCategoryValidator = z.object({
  params: z.object({
    category: z.enum([
      'financial',
      'engagement',
      'campaign',
      'room',
      'achievement',
      'system',
      'ai',
      'social'
    ]),
  }),
  body: z.object({
    enabled: z.boolean(),
  }),
});

// Toggle channel validation
export const toggleChannelValidator = z.object({
  params: z.object({
    channel: z.enum(['push', 'email', 'sms']),
  }),
  body: z.object({
    enabled: z.boolean(),
  }),
});

// Reset to default validation
export const resetToDefaultValidator = z.object({});

// Register push token validation
export const registerPushTokenValidator = z.object({
  body: z.object({
    token: z.string().min(1),
    deviceInfo: z.object({
      fingerprint: z.string(),
      name: z.string().optional(),
      type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
      platform: z.enum(['ios', 'android', 'web']).optional(),
    }).optional(),
  }),
});

// Unregister push token validation
export const unregisterPushTokenValidator = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});