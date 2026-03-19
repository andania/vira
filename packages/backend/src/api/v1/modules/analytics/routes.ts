/**
 * Analytics Routes
 * Defines all analytics-related API endpoints
 */

import { Router } from 'express';
import { analyticsController } from './controllers/analytics.controller';
import { reportController } from './controllers/report.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  trackPageView,
  analyticsRateLimit,
  validateDateRange,
  cacheAnalytics,
  requireAnalyticsAccess,
  validateMetrics,
  sanitizeAnalyticsInput,
  trackApiUsage,
} from './middleware/analytics.middleware';
import * as validators from './validators';

const router = Router();

// Apply page view tracking to all routes
router.use(trackPageView);
router.use(analyticsRateLimit);
router.use(trackApiUsage);

// =====================================================
// Analytics Event Tracking Routes
// =====================================================

/**
 * Track a single analytics event
 * POST /api/v1/analytics/events
 */
router.post(
  '/events',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.trackEventValidator),
  sanitizeAnalyticsInput,
  analyticsController.trackEvent
);

/**
 * Track multiple analytics events in batch
 * POST /api/v1/analytics/events/batch
 */
router.post(
  '/events/batch',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.trackBatchEventsValidator),
  sanitizeAnalyticsInput,
  analyticsController.trackEvents
);

// =====================================================
// Analytics Query Routes
// =====================================================

/**
 * Query analytics data
 * POST /api/v1/analytics/query
 */
router.post(
  '/query',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.queryAnalyticsValidator),
  validateDateRange,
  cacheAnalytics(300),
  analyticsController.query
);

/**
 * Get real-time analytics
 * GET /api/v1/analytics/realtime
 */
router.get(
  '/realtime',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  cacheAnalytics(10),
  analyticsController.getRealtime
);

/**
 * Get active users count
 * GET /api/v1/analytics/users/active
 */
router.get(
  '/users/active',
  authenticate,
  requireAnalyticsAccess('basic'),
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.getActiveUsersValidator),
  cacheAnalytics(60),
  analyticsController.getActiveUsers
);

/**
 * Get user analytics
 * GET /api/v1/analytics/users/:userId
 */
router.get(
  '/users/:userId',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getUserAnalyticsValidator),
  cacheAnalytics(300),
  analyticsController.getUserAnalytics
);

/**
 * Get current user's analytics
 * GET /api/v1/analytics/users/me
 */
router.get(
  '/users/me',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getUserAnalyticsValidator),
  cacheAnalytics(300),
  analyticsController.getUserAnalytics
);

/**
 * Get platform analytics (admin only)
 * GET /api/v1/analytics/platform
 */
router.get(
  '/platform',
  authenticate,
  authorize('admin'),
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.getPlatformAnalyticsValidator),
  cacheAnalytics(600),
  analyticsController.getPlatformAnalytics
);

/**
 * Export analytics data
 * POST /api/v1/analytics/export
 */
router.post(
  '/export',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  validate(validators.exportAnalyticsValidator),
  validateDateRange,
  analyticsController.export
);

// =====================================================
// Report Routes
// =====================================================

/**
 * Create a new report
 * POST /api/v1/analytics/reports
 */
router.post(
  '/reports',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.createReportValidator),
  validateMetrics,
  reportController.createReport
);

/**
 * Get list of reports
 * GET /api/v1/analytics/reports
 */
router.get(
  '/reports',
  authenticate,
  requireAnalyticsAccess('basic'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getReportsValidator),
  cacheAnalytics(60),
  reportController.getReports
);

/**
 * Get report by ID
 * GET /api/v1/analytics/reports/:reportId
 */
router.get(
  '/reports/:reportId',
  authenticate,
  requireAnalyticsAccess('basic'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getReportValidator),
  cacheAnalytics(60),
  reportController.getReport
);

/**
 * Delete report
 * DELETE /api/v1/analytics/reports/:reportId
 */
router.delete(
  '/reports/:reportId',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.deleteReportValidator),
  reportController.deleteReport
);

/**
 * Download report file
 * GET /api/v1/analytics/reports/:reportId/download
 */
router.get(
  '/reports/:reportId/download',
  authenticate,
  requireAnalyticsAccess('basic'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.downloadReportValidator),
  reportController.downloadReport
);

/**
 * Schedule recurring report
 * POST /api/v1/analytics/reports/schedule
 */
router.post(
  '/reports/schedule',
  authenticate,
  requireAnalyticsAccess('advanced'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  validate(validators.scheduleReportValidator),
  reportController.scheduleReport
);

/**
 * Get report templates
 * GET /api/v1/analytics/reports/templates/list
 */
router.get(
  '/reports/templates/list',
  authenticate,
  requireAnalyticsAccess('basic'),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getReportTemplatesValidator),
  cacheAnalytics(3600),
  reportController.getTemplates
);

export { router as analyticsRouter };