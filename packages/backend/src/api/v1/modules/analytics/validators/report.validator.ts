/**
 * Report Validators
 * Zod validation schemas for report operations
 */

import { z } from 'zod';

// Report type enum
export const ReportTypeEnum = z.enum([
  'user',
  'campaign',
  'financial',
  'engagement',
  'custom'
]);

// Report format enum
export const ReportFormatEnum = z.enum([
  'pdf',
  'csv',
  'excel',
  'json'
]);

// Report schedule enum
export const ReportScheduleEnum = z.enum([
  'daily',
  'weekly',
  'monthly'
]);

// Create report validation
export const createReportValidator = z.object({
  body: z.object({
    name: z.string().min(3).max(200),
    type: ReportTypeEnum,
    format: ReportFormatEnum,
    schedule: ReportScheduleEnum.optional(),
    recipients: z.array(z.string().email()).optional(),
    filters: z.record(z.any()),
    metrics: z.array(z.string()).min(1),
  }),
});

// Get reports validation
export const getReportsValidator = z.object({
  query: z.object({
    type: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get report validation
export const getReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
});

// Delete report validation
export const deleteReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
});

// Download report validation
export const downloadReportValidator = z.object({
  params: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
  }),
});

// Schedule report validation
export const scheduleReportValidator = z.object({
  body: z.object({
    reportId: z.string().uuid('Invalid report ID format'),
    schedule: ReportScheduleEnum,
    recipients: z.array(z.string().email()).optional(),
  }),
});

// Get report templates validation
export const getReportTemplatesValidator = z.object({});