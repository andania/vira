/**
 * Admin Validators
 * Zod validation schemas for admin operations
 */

import { z } from 'zod';

// Get system health validation
export const getSystemHealthValidator = z.object({});

// Get platform stats validation
export const getPlatformStatsValidator = z.object({});

// Get dashboard summary validation
export const getDashboardSummaryValidator = z.object({});

// Get audit logs validation
export const getAuditLogsValidator = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get system config validation
export const getSystemConfigValidator = z.object({});

// Update system config validation
export const updateSystemConfigValidator = z.object({
  body: z.object({
    settings: z.record(z.any()),
  }),
});

// Get jobs status validation
export const getJobsStatusValidator = z.object({});

// Clear cache validation
export const clearCacheValidator = z.object({
  body: z.object({
    type: z.string().optional(),
  }),
});

// Run maintenance validation
export const runMaintenanceValidator = z.object({
  params: z.object({
    task: z.enum(['cleanup', 'reindex', 'optimize']),
  }),
});