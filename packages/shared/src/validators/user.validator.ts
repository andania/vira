/**
 * User profile and settings validators using Zod
 */

import { z } from 'zod';
import { Gender } from '../types/user.types';

// Profile validation
const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens and apostrophes')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens and apostrophes')
    .optional(),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(30, 'Display name must not exceed 30 characters')
    .optional(),
  gender: z.enum([Gender.MALE, Gender.FEMALE, Gender.NON_BINARY, Gender.PREFER_NOT_TO_SAY]).optional(),
  birthDate: z
    .string()
    .or(z.date())
    .transform(val => new Date(val))
    .refine(date => !isNaN(date.getTime()), 'Invalid date format')
    .optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  coverUrl: z.string().url('Invalid cover URL').optional().nullable(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  occupation: z.string().max(100, 'Occupation must not exceed 100 characters').optional(),
  company: z.string().max(100, 'Company name must not exceed 100 characters').optional(),
  education: z.string().max(500, 'Education must not exceed 500 characters').optional(),
  interests: z.array(z.string()).max(20, 'Cannot have more than 20 interests').optional(),
  languagePreference: z.string().length(2, 'Language code must be 2 characters').optional(),
  timezone: z.string().optional(),
});

// Update profile validation
export const updateProfileValidator = z.object({
  body: profileSchema.partial(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileValidator>['body'];

// Preferences validation
const preferencesSchema = z.object({
  notificationPush: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  notificationSms: z.boolean().optional(),
  notificationMarketing: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional(),
  contentLanguage: z.array(z.string().length(2)).optional(),
  contentCategories: z.array(z.string()).optional(),
  contentSensitivity: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  autoplayVideos: z.boolean().optional(),
  dataSaverMode: z.boolean().optional(),
});

// Update preferences validation
export const updatePreferencesValidator = z.object({
  body: preferencesSchema,
});

export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesValidator>['body'];

// Location validation
const locationSchema = z.object({
  locationType: z.enum(['home', 'work', 'billing', 'shipping', 'other']),
  addressLine1: z.string().min(1, 'Address is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(1, 'Country is required').max(100),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  isDefault: z.boolean().default(false),
});

// Create location validation
export const createLocationValidator = z.object({
  body: locationSchema,
});

export type CreateLocationRequest = z.infer<typeof createLocationValidator>['body'];

// Update location validation
export const updateLocationValidator = z.object({
  params: z.object({
    locationId: z.string().uuid('Invalid location ID format'),
  }),
  body: locationSchema.partial(),
});

export type UpdateLocationParams = z.infer<typeof updateLocationValidator>['params'];
export type UpdateLocationRequest = z.infer<typeof updateLocationValidator>['body'];

// Delete location validation
export const deleteLocationValidator = z.object({
  params: z.object({
    locationId: z.string().uuid('Invalid location ID format'),
  }),
});

export type DeleteLocationParams = z.infer<typeof deleteLocationValidator>['params'];

// Follow/Unfollow validation
export const followUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export type FollowUserParams = z.infer<typeof followUserValidator>['params'];

// Get user by ID validation
export const getUserByIdValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export type GetUserByIdParams = z.infer<typeof getUserByIdValidator>['params'];

// Get user by username validation
export const getUserByUsernameValidator = z.object({
  params: z.object({
    username: z.string().min(3).max(20),
  }),
});

export type GetUserByUsernameParams = z.infer<typeof getUserByUsernameValidator>['params'];

// Search users validation
export const searchUsersValidator = z.object({
  query: z.object({
    q: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export type SearchUsersQuery = z.infer<typeof searchUsersValidator>['query'];

// Report user validation
export const reportUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    reportType: z.enum(['spam', 'harassment', 'fake', 'inappropriate', 'other']),
    description: z.string().max(1000).optional(),
    evidenceUrls: z.array(z.string().url()).optional(),
  }),
});

export type ReportUserParams = z.infer<typeof reportUserValidator>['params'];
export type ReportUserRequest = z.infer<typeof reportUserValidator>['body'];

// Block/Unblock user validation
export const blockUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    reason: z.string().max(255).optional(),
  }).optional(),
});

export type BlockUserParams = z.infer<typeof blockUserValidator>['params'];
export type BlockUserRequest = z.infer<typeof blockUserValidator>['body'];