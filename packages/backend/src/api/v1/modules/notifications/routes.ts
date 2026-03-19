/**
 * Notification Routes
 * Defines all notification-related API endpoints
 */

import { Router } from 'express';
import { notificationController } from './controllers/notification.controller';
import { preferenceController } from './controllers/preference.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  notificationExists,
  notificationRateLimit,
  validatePushToken,
  checkQuietHours,
  trackNotificationDelivery,
  filterSensitiveData,
  validateBulkNotification,
  checkChannelAvailability,
} from './middleware/notification.middleware';
import * as validators from './validators';

const router = Router();

// All notification routes require authentication
router.use(authenticate);
router.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
router.use(trackNotificationDelivery);
router.use(filterSensitiveData);
router.use(checkQuietHours);

// =====================================================
// Notification Routes
// =====================================================

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
router.get(
  '/',
  validate(validators.getNotificationsValidator),
  notificationController.getNotifications
);

/**
 * Get unread count
 * GET /api/v1/notifications/unread/count
 */
router.get(
  '/unread/count',
  validate(validators.getUnreadCountValidator),
  notificationController.getUnreadCount
);

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:notificationId/read
 */
router.put(
  '/:notificationId/read',
  validate(validators.markAsReadValidator),
  notificationExists,
  notificationController.markAsRead
);

/**
 * Mark all notifications as read
 * POST /api/v1/notifications/read/all
 */
router.post(
  '/read/all',
  validate(validators.markAllAsReadValidator),
  notificationController.markAllAsRead
);

/**
 * Delete notification
 * DELETE /api/v1/notifications/:notificationId
 */
router.delete(
  '/:notificationId',
  validate(validators.deleteNotificationValidator),
  notificationExists,
  notificationController.deleteNotification
);

// =====================================================
// Notification Preference Routes
// =====================================================

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
router.get(
  '/preferences',
  preferenceController.getPreferences
);

/**
 * Update notification preferences
 * PUT /api/v1/notifications/preferences
 */
router.put(
  '/preferences',
  validate(validators.updatePreferencesValidator),
  preferenceController.updatePreferences
);

/**
 * Get quiet hours settings
 * GET /api/v1/notifications/preferences/quiet-hours
 */
router.get(
  '/preferences/quiet-hours',
  preferenceController.getQuietHours
);

/**
 * Update quiet hours
 * PUT /api/v1/notifications/preferences/quiet-hours
 */
router.put(
  '/preferences/quiet-hours',
  validate(validators.updateQuietHoursValidator),
  preferenceController.updateQuietHours
);

/**
 * Toggle notification category
 * PUT /api/v1/notifications/preferences/categories/:category
 */
router.put(
  '/preferences/categories/:category',
  validate(validators.toggleCategoryValidator),
  preferenceController.toggleCategory
);

/**
 * Toggle notification channel
 * PUT /api/v1/notifications/preferences/channels/:channel
 */
router.put(
  '/preferences/channels/:channel',
  validate(validators.toggleChannelValidator),
  preferenceController.toggleChannel
);

/**
 * Reset preferences to default
 * POST /api/v1/notifications/preferences/reset
 */
router.post(
  '/preferences/reset',
  validate(validators.resetToDefaultValidator),
  preferenceController.resetToDefault
);

// =====================================================
// Push Token Routes
// =====================================================

/**
 * Register push token
 * POST /api/v1/notifications/push/register
 */
router.post(
  '/push/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 per hour
  validate(validators.registerPushTokenValidator),
  validatePushToken,
  notificationController.registerPushToken
);

/**
 * Unregister push token
 * POST /api/v1/notifications/push/unregister
 */
router.post(
  '/push/unregister',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }),
  validate(validators.unregisterPushTokenValidator),
  validatePushToken,
  notificationController.unregisterPushToken
);

// =====================================================
// Admin Routes
// =====================================================

/**
 * Create notification (admin)
 * POST /api/v1/notifications/admin/create
 */
router.post(
  '/admin/create',
  authorize('admin'),
  validate(validators.createNotificationValidator),
  checkChannelAvailability,
  notificationRateLimit,
  notificationController.testNotification
);

/**
 * Send bulk notification (admin)
 * POST /api/v1/notifications/admin/bulk
 */
router.post(
  '/admin/bulk',
  authorize('admin'),
  validate(validators.sendBulkNotificationValidator),
  validateBulkNotification,
  checkChannelAvailability,
  notificationRateLimit,
  async (req, res) => {
    try {
      const { userIds, type, title, body, data, priority } = req.body;
      
      // Queue bulk notifications
      for (const userId of userIds) {
        await notificationService.create({
          userId,
          type,
          title,
          body,
          data,
          priority,
        });
      }

      return res.json({
        success: true,
        message: `Notifications queued for ${userIds.length} users`,
      });
    } catch (error) {
      logger.error('Error in bulk notification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to send bulk notifications',
        },
      });
    }
  }
);

/**
 * Test notification (admin)
 * POST /api/v1/notifications/admin/test
 */
router.post(
  '/admin/test',
  authorize('admin'),
  validate(validators.testNotificationValidator),
  notificationController.testNotification
);

export { router as notificationRouter };