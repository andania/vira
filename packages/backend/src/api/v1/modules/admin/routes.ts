/**
 * Admin Routes
 * Defines all admin-related API endpoints
 */

import { Router } from 'express';
import { adminController } from './controllers/admin.controller';
import { userManagementController } from './controllers/user-management.controller';
import { moderationController } from './controllers/moderation.controller';
import { fraudController } from './controllers/fraud.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  requireAdmin,
  requireModerator,
  adminRateLimit,
  logAdminAction,
  validateUserExists,
  validateReportExists,
  validateFraudAlertExists,
  checkMaintenanceMode,
  validateDateRange,
  sanitizeAdminInput,
} from './middleware/admin.middleware';
import * as validators from './validators';

const router = Router();

// Apply global middleware
router.use(authenticate);
router.use(checkMaintenanceMode);
router.use(adminRateLimit);
router.use(sanitizeAdminInput);

// =====================================================
// Dashboard Routes (Admin only)
// =====================================================

/**
 * Get system health
 * GET /api/v1/admin/health
 */
router.get(
  '/health',
  requireAdmin,
  validate(validators.getSystemHealthValidator),
  adminController.getSystemHealth
);

/**
 * Get platform statistics
 * GET /api/v1/admin/stats/platform
 */
router.get(
  '/stats/platform',
  requireAdmin,
  validate(validators.getPlatformStatsValidator),
  adminController.getPlatformStats
);

/**
 * Get dashboard summary
 * GET /api/v1/admin/dashboard
 */
router.get(
  '/dashboard',
  requireAdmin,
  validate(validators.getDashboardSummaryValidator),
  adminController.getDashboardSummary
);

/**
 * Get audit logs
 * GET /api/v1/admin/audit-logs
 */
router.get(
  '/audit-logs',
  requireAdmin,
  validate(validators.getAuditLogsValidator),
  validateDateRange,
  adminController.getAuditLogs
);

/**
 * Get system configuration
 * GET /api/v1/admin/config
 */
router.get(
  '/config',
  requireAdmin,
  validate(validators.getSystemConfigValidator),
  adminController.getSystemConfig
);

/**
 * Update system configuration
 * PUT /api/v1/admin/config
 */
router.put(
  '/config',
  requireAdmin,
  validate(validators.updateSystemConfigValidator),
  logAdminAction('UPDATE_CONFIG'),
  adminController.updateSystemConfig
);

/**
 * Get background jobs status
 * GET /api/v1/admin/jobs
 */
router.get(
  '/jobs',
  requireAdmin,
  validate(validators.getJobsStatusValidator),
  adminController.getJobsStatus
);

/**
 * Clear cache
 * POST /api/v1/admin/cache/clear
 */
router.post(
  '/cache/clear',
  requireAdmin,
  validate(validators.clearCacheValidator),
  logAdminAction('CLEAR_CACHE'),
  adminController.clearCache
);

/**
 * Run maintenance task
 * POST /api/v1/admin/maintenance/:task
 */
router.post(
  '/maintenance/:task',
  requireAdmin,
  validate(validators.runMaintenanceValidator),
  logAdminAction('RUN_MAINTENANCE'),
  adminController.runMaintenance
);

// =====================================================
// User Management Routes (Admin only)
// =====================================================

/**
 * Get all users
 * GET /api/v1/admin/users
 */
router.get(
  '/users',
  requireAdmin,
  validate(validators.getUsersValidator),
  userManagementController.getUsers
);

/**
 * Get user details
 * GET /api/v1/admin/users/:userId
 */
router.get(
  '/users/:userId',
  requireAdmin,
  validate(validators.getUserDetailsValidator),
  validateUserExists,
  userManagementController.getUserDetails
);

/**
 * Update user status
 * PATCH /api/v1/admin/users/:userId/status
 */
router.patch(
  '/users/:userId/status',
  requireAdmin,
  validate(validators.updateUserStatusValidator),
  validateUserExists,
  logAdminAction('UPDATE_USER_STATUS'),
  userManagementController.updateUserStatus
);

/**
 * Update user role
 * PATCH /api/v1/admin/users/:userId/role
 */
router.patch(
  '/users/:userId/role',
  requireAdmin,
  validate(validators.updateUserRoleValidator),
  validateUserExists,
  logAdminAction('UPDATE_USER_ROLE'),
  userManagementController.updateUserRole
);

/**
 * Verify user
 * POST /api/v1/admin/users/:userId/verify
 */
router.post(
  '/users/:userId/verify',
  requireAdmin,
  validate(validators.verifyUserValidator),
  validateUserExists,
  logAdminAction('VERIFY_USER'),
  userManagementController.verifyUser
);

/**
 * Suspend user
 * POST /api/v1/admin/users/:userId/suspend
 */
router.post(
  '/users/:userId/suspend',
  requireAdmin,
  validate(validators.suspendUserValidator),
  validateUserExists,
  logAdminAction('SUSPEND_USER'),
  userManagementController.suspendUser
);

/**
 * Unsuspend user
 * POST /api/v1/admin/users/:userId/unsuspend
 */
router.post(
  '/users/:userId/unsuspend',
  requireAdmin,
  validate(validators.unsuspendUserValidator),
  validateUserExists,
  logAdminAction('UNSUSPEND_USER'),
  userManagementController.unsuspendUser
);

/**
 * Ban user
 * POST /api/v1/admin/users/:userId/ban
 */
router.post(
  '/users/:userId/ban',
  requireAdmin,
  validate(validators.banUserValidator),
  validateUserExists,
  logAdminAction('BAN_USER'),
  userManagementController.banUser
);

/**
 * Delete user (GDPR)
 * DELETE /api/v1/admin/users/:userId
 */
router.delete(
  '/users/:userId',
  requireAdmin,
  validate(validators.deleteUserValidator),
  validateUserExists,
  logAdminAction('DELETE_USER'),
  userManagementController.deleteUser
);

/**
 * Get user reports
 * GET /api/v1/admin/users/:userId/reports
 */
router.get(
  '/users/:userId/reports',
  requireAdmin,
  validate(validators.getUserReportsValidator),
  validateUserExists,
  userManagementController.getUserReports
);

/**
 * Get user growth chart
 * GET /api/v1/admin/users/growth/chart
 */
router.get(
  '/users/growth/chart',
  requireAdmin,
  validate(validators.getUserGrowthValidator),
  userManagementController.getUserGrowth
);

/**
 * Export user data (GDPR)
 * GET /api/v1/admin/users/:userId/export
 */
router.get(
  '/users/:userId/export',
  requireAdmin,
  validate(validators.exportUserDataValidator),
  validateUserExists,
  userManagementController.exportUserData
);

/**
 * Get user statistics summary
 * GET /api/v1/admin/users/stats/summary
 */
router.get(
  '/users/stats/summary',
  requireAdmin,
  validate(validators.getUserStatsSummaryValidator),
  userManagementController.getUserStatsSummary
);

// =====================================================
// Moderation Routes (Admin & Moderator)
// =====================================================

/**
 * Get moderation queue
 * GET /api/v1/admin/moderation/queue
 */
router.get(
  '/moderation/queue',
  requireModerator,
  validate(validators.getModerationQueueValidator),
  moderationController.getModerationQueue
);

/**
 * Get report details
 * GET /api/v1/admin/moderation/reports/:reportId
 */
router.get(
  '/moderation/reports/:reportId',
  requireModerator,
  validate(validators.getReportDetailsValidator),
  validateReportExists,
  moderationController.getReportDetails
);

/**
 * Resolve report
 * POST /api/v1/admin/moderation/reports/:reportId/resolve
 */
router.post(
  '/moderation/reports/:reportId/resolve',
  requireModerator,
  validate(validators.resolveReportValidator),
  validateReportExists,
  logAdminAction('RESOLVE_REPORT'),
  moderationController.resolveReport
);

/**
 * Dismiss report
 * POST /api/v1/admin/moderation/reports/:reportId/dismiss
 */
router.post(
  '/moderation/reports/:reportId/dismiss',
  requireModerator,
  validate(validators.dismissReportValidator),
  validateReportExists,
  logAdminAction('DISMISS_REPORT'),
  moderationController.dismissReport
);

/**
 * Take moderation action
 * POST /api/v1/admin/moderation/actions
 */
router.post(
  '/moderation/actions',
  requireModerator,
  validate(validators.takeActionValidator),
  validateUserExists,
  logAdminAction('TAKE_MODERATION_ACTION'),
  moderationController.takeAction
);

/**
 * Remove moderation action
 * DELETE /api/v1/admin/moderation/actions/:actionId
 */
router.delete(
  '/moderation/actions/:actionId',
  requireModerator,
  validate(validators.removeActionValidator),
  logAdminAction('REMOVE_MODERATION_ACTION'),
  moderationController.removeAction
);

/**
 * Get moderation statistics
 * GET /api/v1/admin/moderation/stats
 */
router.get(
  '/moderation/stats',
  requireModerator,
  validate(validators.getModerationStatsValidator),
  moderationController.getModerationStats
);

/**
 * Moderate content (automated)
 * POST /api/v1/admin/moderation/content/moderate
 */
router.post(
  '/moderation/content/moderate',
  requireModerator,
  validate(validators.moderateContentValidator),
  moderationController.moderateContent
);

/**
 * Get user moderation history
 * GET /api/v1/admin/moderation/users/:userId/history
 */
router.get(
  '/moderation/users/:userId/history',
  requireModerator,
  validate(validators.getUserModerationHistoryValidator),
  validateUserExists,
  moderationController.getUserModerationHistory
);

/**
 * Get room moderation history
 * GET /api/v1/admin/moderation/rooms/:roomId/history
 */
router.get(
  '/moderation/rooms/:roomId/history',
  requireModerator,
  validate(validators.getRoomModerationHistoryValidator),
  moderationController.getRoomModerationHistory
);

// =====================================================
// Fraud Detection Routes (Admin only)
// =====================================================

/**
 * Get fraud alerts
 * GET /api/v1/admin/fraud/alerts
 */
router.get(
  '/fraud/alerts',
  requireAdmin,
  validate(validators.getFraudAlertsValidator),
  validateDateRange,
  fraudController.getFraudAlerts
);

/**
 * Get fraud alert details
 * GET /api/v1/admin/fraud/alerts/:alertId
 */
router.get(
  '/fraud/alerts/:alertId',
  requireAdmin,
  validate(validators.getFraudAlertValidator),
  validateFraudAlertExists,
  fraudController.getFraudAlert
);

/**
 * Update fraud alert status
 * PATCH /api/v1/admin/fraud/alerts/:alertId/status
 */
router.patch(
  '/fraud/alerts/:alertId/status',
  requireAdmin,
  validate(validators.updateFraudAlertStatusValidator),
  validateFraudAlertExists,
  logAdminAction('UPDATE_FRAUD_ALERT'),
  fraudController.updateAlertStatus
);

/**
 * Get fraud statistics
 * GET /api/v1/admin/fraud/stats
 */
router.get(
  '/fraud/stats',
  requireAdmin,
  validate(validators.getFraudStatisticsValidator),
  fraudController.getFraudStatistics
);

/**
 * Analyze transaction for fraud (test)
 * POST /api/v1/admin/fraud/analyze
 */
router.post(
  '/fraud/analyze',
  requireAdmin,
  validate(validators.analyzeTransactionValidator),
  fraudController.analyzeTransaction
);

/**
 * Get blacklisted items
 * GET /api/v1/admin/fraud/blacklist
 */
router.get(
  '/fraud/blacklist',
  requireAdmin,
  validate(validators.getBlacklistedItemsValidator),
  fraudController.getBlacklistedItems
);

/**
 * Add to blacklist
 * POST /api/v1/admin/fraud/blacklist
 */
router.post(
  '/fraud/blacklist',
  requireAdmin,
  validate(validators.addToBlacklistValidator),
  logAdminAction('ADD_TO_BLACKLIST'),
  fraudController.addToBlacklist
);

/**
 * Remove from blacklist
 * DELETE /api/v1/admin/fraud/blacklist
 */
router.delete(
  '/fraud/blacklist',
  requireAdmin,
  validate(validators.removeFromBlacklistValidator),
  logAdminAction('REMOVE_FROM_BLACKLIST'),
  fraudController.removeFromBlacklist
);

/**
 * Create fraud alert (test)
 * POST /api/v1/admin/fraud/alerts/test
 */
router.post(
  '/fraud/alerts/test',
  requireAdmin,
  validate(validators.createFraudAlertValidator),
  fraudController.createFraudAlert
);

export { router as adminRouter };