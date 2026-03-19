/**
 * User Management Validators
 * Zod validation schemas for user management operations
 */

import { z } from 'zod';

// Get users validation
export const getUsersValidator = z.object({
  query: z.object({
    status: z.string().optional(),
    accountType: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get user details validation
export const getUserDetailsValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Update user status validation
export const updateUserStatusValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING']),
    reason: z.string().max(500).optional(),
  }),
});

// Update user role validation
export const updateUserRoleValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    role: z.enum(['USER', 'SPONSOR', 'MODERATOR', 'ADMIN']),
  }),
});

// Verify user validation
export const verifyUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    type: z.enum(['email', 'phone', 'identity']),
  }),
});

// Suspend user validation
export const suspendUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    reason: z.string().min(1).max(500),
    duration: z.number().positive().optional(),
  }),
});

// Unsuspend user validation
export const unsuspendUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Ban user validation
export const banUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    reason: z.string().min(1).max(500),
    permanent: z.boolean().default(true),
  }),
});

// Delete user validation
export const deleteUserValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get user reports validation
export const getUserReportsValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get user growth validation
export const getUserGrowthValidator = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Export user data validation
export const exportUserDataValidator = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get user stats summary validation
export const getUserStatsSummaryValidator = z.object({});