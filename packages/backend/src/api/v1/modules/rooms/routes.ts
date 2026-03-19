/**
 * Room Routes
 * Defines all room-related API endpoints
 */

import { Router } from 'express';
import { roomController } from './controllers/room.controller';
import { liveController } from './controllers/live.controller';
import { chatController } from './controllers/chat.controller';
import { recordingController } from './controllers/recording.controller';
import { moderationController } from './controllers/moderation.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  roomExists,
  canAccessRoom,
  isHost,
  canModifyRoom,
  isInRoom,
  checkRoomCapacity,
  validateRoomSettings,
  roomRateLimit,
  validateRoomDates,
} from './middleware/room.middleware';
import * as validators from './validators';

const router = Router();

// All room routes require authentication
router.use(authenticate);

// =====================================================
// Room Routes
// =====================================================

/**
 * Create room
 * POST /api/v1/rooms
 */
router.post(
  '/',
  authorize('sponsor'),
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }),
  validate(validators.createRoomValidator),
  validateRoomSettings,
  validateRoomDates,
  roomController.createRoom
);

/**
 * Get room by ID
 * GET /api/v1/rooms/:roomId
 */
router.get(
  '/:roomId',
  validate(validators.getRoomByIdValidator),
  roomExists,
  canAccessRoom,
  roomController.getRoom
);

/**
 * Update room
 * PUT /api/v1/rooms/:roomId
 */
router.put(
  '/:roomId',
  authorize('sponsor'),
  validate(validators.updateRoomValidator),
  roomExists,
  canAccessRoom,
  isHost,
  canModifyRoom,
  validateRoomSettings,
  validateRoomDates,
  roomController.updateRoom
);

/**
 * Delete room
 * DELETE /api/v1/rooms/:roomId
 */
router.delete(
  '/:roomId',
  authorize('sponsor'),
  validate(validators.deleteRoomValidator),
  roomExists,
  canAccessRoom,
  isHost,
  canModifyRoom,
  roomController.deleteRoom
);

/**
 * Start room (go live)
 * POST /api/v1/rooms/:roomId/start
 */
router.post(
  '/:roomId/start',
  authorize('sponsor'),
  validate(validators.startRoomValidator),
  roomExists,
  canAccessRoom,
  isHost,
  roomController.startRoom
);

/**
 * End room
 * POST /api/v1/rooms/:roomId/end
 */
router.post(
  '/:roomId/end',
  authorize('sponsor'),
  validate(validators.endRoomValidator),
  roomExists,
  canAccessRoom,
  isHost,
  roomController.endRoom
);

/**
 * Join room
 * POST /api/v1/rooms/:roomId/join
 */
router.post(
  '/:roomId/join',
  validate(validators.joinRoomValidator),
  roomExists,
  canAccessRoom,
  checkRoomCapacity,
  roomController.joinRoom
);

/**
 * Leave room
 * POST /api/v1/rooms/:roomId/leave
 */
router.post(
  '/:roomId/leave',
  validate(validators.leaveRoomValidator),
  roomExists,
  isInRoom,
  roomController.leaveRoom
);

/**
 * Get room participants
 * GET /api/v1/rooms/:roomId/participants
 */
router.get(
  '/:roomId/participants',
  validate(validators.getParticipantsValidator),
  roomExists,
  canAccessRoom,
  roomController.getParticipants
);

/**
 * Get rooms by brand
 * GET /api/v1/rooms/brand/:brandId
 */
router.get(
  '/brand/:brandId',
  validate(validators.getRoomsByBrandValidator),
  roomController.getRoomsByBrand
);

/**
 * Get live rooms
 * GET /api/v1/rooms/live/now
 */
router.get(
  '/live/now',
  validate(validators.getLiveRoomsValidator),
  roomController.getLiveRooms
);

/**
 * Get upcoming rooms
 * GET /api/v1/rooms/upcoming/scheduled
 */
router.get(
  '/upcoming/scheduled',
  validate(validators.getUpcomingRoomsValidator),
  roomController.getUpcomingRooms
);

// =====================================================
// Live Streaming Routes
// =====================================================

/**
 * Start live stream
 * POST /api/v1/rooms/:roomId/live/start
 */
router.post(
  '/:roomId/live/start',
  authorize('sponsor'),
  validate(validators.startLiveValidator),
  roomExists,
  canAccessRoom,
  isHost,
  liveController.startLive
);

/**
 * Stop live stream
 * POST /api/v1/rooms/:roomId/live/stop
 */
router.post(
  '/:roomId/live/stop',
  authorize('sponsor'),
  validate(validators.stopLiveValidator),
  roomExists,
  canAccessRoom,
  isHost,
  liveController.stopLive
);

/**
 * Get live stream status
 * GET /api/v1/rooms/:roomId/live/status
 */
router.get(
  '/:roomId/live/status',
  validate(validators.getLiveStatusValidator),
  roomExists,
  canAccessRoom,
  liveController.getLiveStatus
);

/**
 * Get viewer count
 * GET /api/v1/rooms/:roomId/live/viewers
 */
router.get(
  '/:roomId/live/viewers',
  validate(validators.getViewerCountValidator),
  roomExists,
  canAccessRoom,
  liveController.getViewerCount
);

/**
 * Generate viewer token
 * POST /api/v1/rooms/:roomId/live/token
 */
router.post(
  '/:roomId/live/token',
  validate(validators.generateViewerTokenValidator),
  roomExists,
  canAccessRoom,
  liveController.generateViewerToken
);

/**
 * Validate viewer token
 * GET /api/v1/rooms/live/token/:token/validate
 */
router.get(
  '/live/token/:token/validate',
  validate(validators.validateViewerTokenValidator),
  liveController.validateViewerToken
);

/**
 * Update stream quality
 * PUT /api/v1/rooms/:roomId/live/quality
 */
router.put(
  '/:roomId/live/quality',
  authorize('sponsor'),
  validate(validators.updateStreamQualityValidator),
  roomExists,
  canAccessRoom,
  isHost,
  liveController.updateStreamQuality
);

/**
 * Get stream statistics
 * GET /api/v1/rooms/:roomId/live/stats
 */
router.get(
  '/:roomId/live/stats',
  validate(validators.getStreamStatisticsValidator),
  roomExists,
  canAccessRoom,
  liveController.getStreamStatistics
);

/**
 * Send stream event
 * POST /api/v1/rooms/:roomId/live/events
 */
router.post(
  '/:roomId/live/events',
  validate(validators.sendStreamEventValidator),
  roomExists,
  isInRoom,
  liveController.sendStreamEvent
);

/**
 * Get stream health
 * GET /api/v1/rooms/:roomId/live/health
 */
router.get(
  '/:roomId/live/health',
  validate(validators.getStreamHealthValidator),
  roomExists,
  canAccessRoom,
  liveController.getStreamHealth
);

/**
 * Toggle mute
 * POST /api/v1/rooms/:roomId/live/mute
 */
router.post(
  '/:roomId/live/mute',
  authorize('sponsor'),
  validate(validators.toggleMuteValidator),
  roomExists,
  canAccessRoom,
  isHost,
  liveController.toggleMute
);

// =====================================================
// Chat Routes
// =====================================================

/**
 * Get recent messages
 * GET /api/v1/rooms/:roomId/chat/messages
 */
router.get(
  '/:roomId/chat/messages',
  validate(validators.getMessagesValidator),
  roomExists,
  isInRoom,
  chatController.getMessages
);

/**
 * Send message
 * POST /api/v1/rooms/:roomId/chat/messages
 */
router.post(
  '/:roomId/chat/messages',
  rateLimit({ windowMs: 60 * 1000, max: 30 }), // 30 messages per minute
  validate(validators.sendMessageValidator),
  roomExists,
  isInRoom,
  chatController.sendMessage
);

/**
 * Delete message
 * DELETE /api/v1/rooms/:roomId/chat/messages/:messageId
 */
router.delete(
  '/:roomId/chat/messages/:messageId',
  validate(validators.deleteMessageValidator),
  roomExists,
  isInRoom,
  chatController.deleteMessage
);

/**
 * Pin message
 * POST /api/v1/rooms/:roomId/chat/messages/:messageId/pin
 */
router.post(
  '/:roomId/chat/messages/:messageId/pin',
  authorize('sponsor'),
  validate(validators.pinMessageValidator),
  roomExists,
  canAccessRoom,
  isHost,
  chatController.pinMessage
);

/**
 * Unpin message
 * POST /api/v1/rooms/:roomId/chat/messages/:messageId/unpin
 */
router.post(
  '/:roomId/chat/messages/:messageId/unpin',
  authorize('sponsor'),
  validate(validators.unpinMessageValidator),
  roomExists,
  canAccessRoom,
  isHost,
  chatController.unpinMessage
);

/**
 * Get pinned messages
 * GET /api/v1/rooms/:roomId/chat/pinned
 */
router.get(
  '/:roomId/chat/pinned',
  validate(validators.getPinnedMessagesValidator),
  roomExists,
  isInRoom,
  chatController.getPinnedMessages
);

/**
 * Set typing indicator
 * POST /api/v1/rooms/:roomId/chat/typing
 */
router.post(
  '/:roomId/chat/typing',
  validate(validators.setTypingValidator),
  roomExists,
  isInRoom,
  chatController.setTyping
);

/**
 * Get typing users
 * GET /api/v1/rooms/:roomId/chat/typing
 */
router.get(
  '/:roomId/chat/typing',
  validate(validators.getTypingUsersValidator),
  roomExists,
  isInRoom,
  chatController.getTypingUsers
);

// =====================================================
// Recording Routes
// =====================================================

/**
 * Start recording
 * POST /api/v1/rooms/:roomId/recordings/start
 */
router.post(
  '/:roomId/recordings/start',
  authorize('sponsor'),
  validate(validators.startRecordingValidator),
  roomExists,
  canAccessRoom,
  isHost,
  recordingController.startRecording
);

/**
 * Stop recording
 * POST /api/v1/rooms/recordings/:recordingId/stop
 */
router.post(
  '/recordings/:recordingId/stop',
  authorize('sponsor'),
  validate(validators.stopRecordingValidator),
  recordingController.stopRecording
);

/**
 * Get recording
 * GET /api/v1/rooms/recordings/:recordingId
 */
router.get(
  '/recordings/:recordingId',
  validate(validators.getRecordingValidator),
  recordingController.getRecording
);

/**
 * Get room recordings
 * GET /api/v1/rooms/:roomId/recordings
 */
router.get(
  '/:roomId/recordings',
  validate(validators.getRoomRecordingsValidator),
  roomExists,
  canAccessRoom,
  recordingController.getRoomRecordings
);

/**
 * Delete recording
 * DELETE /api/v1/rooms/recordings/:recordingId
 */
router.delete(
  '/recordings/:recordingId',
  authorize('sponsor'),
  validate(validators.deleteRecordingValidator),
  recordingController.deleteRecording
);

/**
 * Get recording statistics
 * GET /api/v1/rooms/:roomId/recordings/stats
 */
router.get(
  '/:roomId/recordings/stats',
  validate(validators.getRecordingStatsValidator),
  roomExists,
  canAccessRoom,
  recordingController.getRecordingStats
);

/**
 * Increment recording views
 * POST /api/v1/rooms/recordings/:recordingId/views
 */
router.post(
  '/recordings/:recordingId/views',
  validate(validators.incrementViewsValidator),
  recordingController.incrementViews
);

// =====================================================
// Moderation Routes
// =====================================================

/**
 * Moderate user
 * POST /api/v1/rooms/:roomId/moderation/users
 */
router.post(
  '/:roomId/moderation/users',
  authorize('sponsor'),
  validate(validators.moderateUserValidator),
  roomExists,
  canAccessRoom,
  isHost,
  moderationController.moderateUser
);

/**
 * Remove moderation action
 * DELETE /api/v1/rooms/:roomId/moderation/actions/:actionId
 */
router.delete(
  '/:roomId/moderation/actions/:actionId',
  authorize('sponsor'),
  validate(validators.removeModerationValidator),
  roomExists,
  canAccessRoom,
  isHost,
  moderationController.removeModeration
);

/**
 * Get room moderation history
 * GET /api/v1/rooms/:roomId/moderation/history
 */
router.get(
  '/:roomId/moderation/history',
  authorize('sponsor'),
  validate(validators.getRoomModerationHistoryValidator),
  roomExists,
  canAccessRoom,
  isHost,
  moderationController.getRoomModerationHistory
);

/**
 * Get user moderation history
 * GET /api/v1/rooms/moderation/users/:userId/history
 */
router.get(
  '/moderation/users/:userId/history',
  authorize('sponsor'),
  validate(validators.getUserModerationHistoryValidator),
  moderationController.getUserModerationHistory
);

/**
 * Report room
 * POST /api/v1/rooms/:roomId/moderation/reports
 */
router.post(
  '/:roomId/moderation/reports',
  validate(validators.reportRoomValidator),
  roomExists,
  canAccessRoom,
  moderationController.reportRoom
);

/**
 * Report message
 * POST /api/v1/rooms/:roomId/chat/messages/:messageId/report
 */
router.post(
  '/:roomId/chat/messages/:messageId/report',
  validate(validators.reportMessageValidator),
  roomExists,
  isInRoom,
  moderationController.reportMessage
);

/**
 * Get moderation queue (admin only)
 * GET /api/v1/rooms/moderation/queue
 */
router.get(
  '/moderation/queue',
  authorize('admin'),
  validate(validators.getModerationQueueValidator),
  moderationController.getModerationQueue
);

/**
 * Resolve report (admin only)
 * POST /api/v1/rooms/moderation/reports/:reportId/resolve
 */
router.post(
  '/moderation/reports/:reportId/resolve',
  authorize('admin'),
  validate(validators.resolveReportValidator),
  moderationController.resolveReport
);

/**
 * Get moderation statistics (admin only)
 * GET /api/v1/rooms/moderation/stats
 */
router.get(
  '/moderation/stats',
  authorize('admin'),
  moderationController.getModerationStats
);

/**
 * Set moderation settings
 * PUT /api/v1/rooms/:roomId/moderation/settings
 */
router.put(
  '/:roomId/moderation/settings',
  authorize('sponsor'),
  validate(validators.setModerationSettingsValidator),
  roomExists,
  canAccessRoom,
  isHost,
  moderationController.setModerationSettings
);

export { router as roomRouter };