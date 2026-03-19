/**
 * User Routes
 * Defines all user-related API endpoints
 */

import { Router } from 'express';
import { userController } from './controllers/user.controller';
import { followerController } from './controllers/follower.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import { userExists, canAccessUser, followRateLimit } from './middleware/user.middleware';
import * as validators from './validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// =====================================================
// Profile Routes
// =====================================================

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
router.get('/me', userController.getCurrentUser);

/**
 * Update current user profile
 * PUT /api/v1/users/me/profile
 */
router.put(
  '/me/profile',
  validate(validators.updateProfileValidator),
  userController.updateProfile
);

/**
 * Update current user preferences
 * PUT /api/v1/users/me/preferences
 */
router.put(
  '/me/preferences',
  validate(validators.updatePreferencesValidator),
  userController.updatePreferences
);

/**
 * Upload avatar
 * POST /api/v1/users/me/avatar
 */
router.post(
  '/me/avatar',
  upload.single('avatar'),
  userController.uploadAvatar
);

/**
 * Upload cover image
 * POST /api/v1/users/me/cover
 */
router.post(
  '/me/cover',
  upload.single('cover'),
  userController.uploadCover
);

/**
 * Update interests
 * PUT /api/v1/users/me/interests
 */
router.put(
  '/me/interests',
  validate(validators.updateInterestsValidator),
  userController.updateInterests
);

/**
 * Get user statistics
 * GET /api/v1/users/me/stats
 */
router.get('/me/stats', userController.getStatistics);

/**
 * Get user activity
 * GET /api/v1/users/me/activity
 */
router.get('/me/activity', userController.getActivity);

/**
 * Deactivate account
 * POST /api/v1/users/me/deactivate
 */
router.post(
  '/me/deactivate',
  validate(validators.deactivateAccountValidator),
  userController.deactivateAccount
);

/**
 * Delete account
 * POST /api/v1/users/me/delete
 */
router.post(
  '/me/delete',
  validate(validators.deleteAccountValidator),
  userController.deleteAccount
);

// =====================================================
// User Lookup Routes
// =====================================================

/**
 * Get user by ID
 * GET /api/v1/users/:userId
 */
router.get(
  '/:userId',
  validate(validators.getUserByIdValidator),
  userExists,
  userController.getUserById
);

/**
 * Get user by username
 * GET /api/v1/users/username/:username
 */
router.get(
  '/username/:username',
  validate(validators.getUserByUsernameValidator),
  userController.getUserByUsername
);

/**
 * Search users
 * GET /api/v1/users/search
 */
router.get(
  '/search',
  validate(validators.searchUsersValidator),
  userController.searchUsers
);

/**
 * Check username availability
 * GET /api/v1/users/check-username/:username
 */
router.get(
  '/check-username/:username',
  validate(validators.checkUsernameValidator),
  userController.checkUsername
);

/**
 * Check email availability
 * GET /api/v1/users/check-email/:email
 */
router.get(
  '/check-email/:email',
  validate(validators.checkEmailValidator),
  userController.checkEmail
);

// =====================================================
// Follower Routes
// =====================================================

/**
 * Follow a user
 * POST /api/v1/users/:userId/follow
 */
router.post(
  '/:userId/follow',
  validate(validators.followUserValidator),
  userExists,
  followRateLimit,
  followerController.followUser
);

/**
 * Unfollow a user
 * DELETE /api/v1/users/:userId/follow
 */
router.delete(
  '/:userId/follow',
  validate(validators.followUserValidator),
  userExists,
  followerController.unfollowUser
);

/**
 * Check if following
 * GET /api/v1/users/:userId/follow/status
 */
router.get(
  '/:userId/follow/status',
  validate(validators.checkFollowingValidator),
  userExists,
  followerController.isFollowing
);

/**
 * Get user's followers
 * GET /api/v1/users/:userId/followers
 */
router.get(
  '/:userId/followers',
  validate(validators.getFollowersValidator),
  userExists,
  followerController.getFollowers
);

/**
 * Get user's following
 * GET /api/v1/users/:userId/following
 */
router.get(
  '/:userId/following',
  validate(validators.getFollowingValidator),
  userExists,
  followerController.getFollowing
);

/**
 * Get follower counts
 * GET /api/v1/users/:userId/followers/count
 */
router.get(
  '/:userId/followers/count',
  validate(validators.getUserByIdValidator),
  userExists,
  followerController.getFollowerCounts
);

/**
 * Get follower suggestions
 * GET /api/v1/users/suggestions/followers
 */
router.get(
  '/suggestions/followers',
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  followerController.getSuggestions
);

export { router as userRouter };