/**
 * User Validators
 * Zod validation schemas for user operations
 */

import { z } from 'zod';
import { Gender } from '@viraz/shared';

// Update profile validation
export const updateProfileValidator = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    displayName: z.string().min(1).max(30).optional(),
    gender: z.enum([Gender.MALE, Gender.FEMALE, Gender.NON_BINARY, Gender.PREFER_NOT_TO_SAY]).optional(),
    birthDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    bio: z.string().max(500).optional(),
    website: z.string().url().optional().nullable(),
    occupation: z.string().max(100).optional(),
    company: z.string().max(100).optional(),
    education: z.string().max(500).optional(),
  }),
});

// Update preferences validation
export const updatePreferencesValidator = z.object({
  body: z.object({
    notificationPush: z.boolean().optional(),
    notificationEmail: z.boolean().optional(),
    notificationSms: z.boolean().optional(),
    notificationMarketing: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    contentLanguage: z.array(z.string().length(2)).optional(),
    contentCategories: z.array(z.string()).optional(),
    contentSensitivity: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    autoplayVideos: z.boolean().optional(),
    dataSaverMode: z.boolean().optional(),
  }),
});

// Update interests validation
export const updateInterestsValidator = z.object({
  body: z.object({
    interests: z.array(z.string()).max(20),
  }),
});

// Get user by ID validation
export const getUserByIdValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get user by username validation
export const getUserByUsernameValidator = z.object({
  params: z.object({
    username: z.string().min(3).max(20),
  }),
});

// Search users validation
export const searchUsersValidator = z.object({
  query: z.object({
    q: z.string().min(1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Check username validation
export const checkUsernameValidator = z.object({
  params: z.object({
    username: z.string().min(3).max(20),
  }),
});

// Check email validation
export const checkEmailValidator = z.object({
  params: z.object({
    email: z.string().email(),
  }),
});

// Deactivate account validation
export const deactivateAccountValidator = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

// Delete account validation
export const deleteAccountValidator = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

// Follow user validation
export const followUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get followers validation
export const getFollowersValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get following validation
export const getFollowingValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Check following validation
export const checkFollowingValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});