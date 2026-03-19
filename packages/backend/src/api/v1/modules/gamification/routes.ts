/**
 * Gamification Routes
 * Defines all gamification-related API endpoints
 */

import { Router } from 'express';
import { gamificationController } from './controllers/gamification.controller';
import { rankController } from './controllers/rank.controller';
import { achievementController } from './controllers/achievement.controller';
import { leaderboardController } from './controllers/leaderboard.controller';
import { challengeController } from './controllers/challenge.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  gamificationRateLimit,
  cacheGamificationData,
  validateAchievementClaim,
  validateChallengeClaim,
  gamificationFeatureEnabled,
  trackGamificationEvent,
} from './middleware/gamification.middleware';
import * as validators from './validators';

const router = Router();

// All gamification routes require authentication
router.use(authenticate);
router.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
router.use(gamificationRateLimit);

// =====================================================
// Main Gamification Routes
// =====================================================

/**
 * Get user's complete gamification profile
 * GET /api/v1/gamification/profile
 */
router.get(
  '/profile',
  validate(validators.getUserProfileValidator),
  cacheGamificationData(300),
  gamificationController.getUserProfile
);

/**
 * Process gamification event (internal)
 * POST /api/v1/gamification/events
 */
router.post(
  '/events',
  authorize('internal'),
  validate(validators.processEventValidator),
  gamificationController.processEvent
);

/**
 * Get gamification statistics (admin only)
 * GET /api/v1/gamification/stats
 */
router.get(
  '/stats',
  authorize('admin'),
  validate(validators.getGamificationStatsValidator),
  gamificationController.getGamificationStats
);

/**
 * Get available badges
 * GET /api/v1/gamification/badges
 */
router.get(
  '/badges',
  validate(validators.getAvailableBadgesValidator),
  cacheGamificationData(3600),
  gamificationController.getAvailableBadges
);

/**
 * Initialize gamification for user (admin only)
 * POST /api/v1/gamification/users/:userId/initialize
 */
router.post(
  '/users/:userId/initialize',
  authorize('admin'),
  validate(validators.initializeUserValidator),
  gamificationController.initializeUser
);

// =====================================================
// Rank Routes
// =====================================================

/**
 * Get user's current rank
 * GET /api/v1/gamification/rank
 */
router.get(
  '/rank',
  validate(validators.getUserRankValidator),
  cacheGamificationData(300),
  rankController.getUserRank
);

/**
 * Get leaderboard by rank
 * GET /api/v1/gamification/rank/leaderboard
 */
router.get(
  '/rank/leaderboard',
  validate(validators.getLeaderboardValidator),
  cacheGamificationData(600),
  rankController.getLeaderboard
);

/**
 * Get rank statistics
 * GET /api/v1/gamification/rank/stats
 */
router.get(
  '/rank/stats',
  validate(validators.getRankStatsValidator),
  cacheGamificationData(3600),
  rankController.getRankStats
);

// =====================================================
// Achievement Routes
// =====================================================

/**
 * Get user's achievements
 * GET /api/v1/gamification/achievements
 */
router.get(
  '/achievements',
  validate(validators.getUserAchievementsValidator),
  cacheGamificationData(300),
  achievementController.getUserAchievements
);

/**
 * Get all achievements
 * GET /api/v1/gamification/achievements/all
 */
router.get(
  '/achievements/all',
  validate(validators.getAllAchievementsValidator),
  cacheGamificationData(3600),
  achievementController.getAllAchievements
);

/**
 * Get achievement progress
 * GET /api/v1/gamification/achievements/:achievementId/progress
 */
router.get(
  '/achievements/:achievementId/progress',
  validate(validators.getAchievementProgressValidator),
  cacheGamificationData(60),
  achievementController.getAchievementProgress
);

/**
 * Claim achievement reward
 * POST /api/v1/gamification/achievements/:achievementId/claim
 */
router.post(
  '/achievements/:achievementId/claim',
  validate(validators.claimAchievementRewardValidator),
  validateAchievementClaim,
  achievementController.claimReward
);

/**
 * Get achievement statistics
 * GET /api/v1/gamification/achievements/stats
 */
router.get(
  '/achievements/stats',
  validate(validators.getAchievementStatsValidator),
  cacheGamificationData(3600),
  achievementController.getAchievementStats
);

/**
 * Get top achievers
 * GET /api/v1/gamification/achievements/leaderboard
 */
router.get(
  '/achievements/leaderboard',
  validate(validators.getTopAchieversValidator),
  cacheGamificationData(600),
  achievementController.getTopAchievers
);

// =====================================================
// Leaderboard Routes
// =====================================================

/**
 * Get leaderboard (with filters)
 * GET /api/v1/gamification/leaderboard
 */
router.get(
  '/leaderboard',
  validate(validators.getLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getLeaderboard
);

/**
 * Get global leaderboard
 * GET /api/v1/gamification/leaderboard/global
 */
router.get(
  '/leaderboard/global',
  validate(validators.getGlobalLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getGlobalLeaderboard
);

/**
 * Get weekly leaderboard
 * GET /api/v1/gamification/leaderboard/weekly
 */
router.get(
  '/leaderboard/weekly',
  validate(validators.getWeeklyLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getWeeklyLeaderboard
);

/**
 * Get monthly leaderboard
 * GET /api/v1/gamification/leaderboard/monthly
 */
router.get(
  '/leaderboard/monthly',
  validate(validators.getMonthlyLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getMonthlyLeaderboard
);

/**
 * Get brand leaderboard
 * GET /api/v1/gamification/leaderboard/brand/:brandId
 */
router.get(
  '/leaderboard/brand/:brandId',
  validate(validators.getBrandLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getBrandLeaderboard
);

/**
 * Get category leaderboard
 * GET /api/v1/gamification/leaderboard/category/:category
 */
router.get(
  '/leaderboard/category/:category',
  validate(validators.getCategoryLeaderboardValidator),
  cacheGamificationData(300),
  leaderboardController.getCategoryLeaderboard
);

/**
 * Get user's rank on leaderboard
 * GET /api/v1/gamification/leaderboard/user/rank
 */
router.get(
  '/leaderboard/user/rank',
  validate(validators.getUserRankValidator),
  cacheGamificationData(60),
  leaderboardController.getUserRank
);

/**
 * Get leaderboard statistics
 * GET /api/v1/gamification/leaderboard/stats
 */
router.get(
  '/leaderboard/stats',
  validate(validators.getLeaderboardStatsValidator),
  cacheGamificationData(3600),
  leaderboardController.getLeaderboardStats
);

/**
 * Clear leaderboard cache (admin only)
 * POST /api/v1/gamification/leaderboard/cache/clear
 */
router.post(
  '/leaderboard/cache/clear',
  authorize('admin'),
  validate(validators.clearLeaderboardCacheValidator),
  leaderboardController.clearCache
);

// =====================================================
// Challenge Routes
// =====================================================

/**
 * Get active challenges
 * GET /api/v1/gamification/challenges/active
 */
router.get(
  '/challenges/active',
  validate(validators.getActiveChallengesValidator),
  cacheGamificationData(60),
  challengeController.getActiveChallenges
);

/**
 * Get user's challenges
 * GET /api/v1/gamification/challenges/user
 */
router.get(
  '/challenges/user',
  validate(validators.getUserChallengesValidator),
  cacheGamificationData(60),
  challengeController.getUserChallenges
);

/**
 * Get challenge details
 * GET /api/v1/gamification/challenges/:challengeId
 */
router.get(
  '/challenges/:challengeId',
  validate(validators.getChallengeValidator),
  cacheGamificationData(60),
  challengeController.getChallenge
);

/**
 * Claim challenge reward
 * POST /api/v1/gamification/challenges/:challengeId/claim
 */
router.post(
  '/challenges/:challengeId/claim',
  validate(validators.claimChallengeRewardValidator),
  validateChallengeClaim,
  challengeController.claimReward
);

/**
 * Get challenge statistics
 * GET /api/v1/gamification/challenges/stats
 */
router.get(
  '/challenges/stats',
  validate(validators.getChallengeStatsValidator),
  cacheGamificationData(3600),
  challengeController.getChallengeStats
);

/**
 * Get challenge leaderboard
 * GET /api/v1/gamification/challenges/:challengeId/leaderboard
 */
router.get(
  '/challenges/:challengeId/leaderboard',
  validate(validators.getChallengeLeaderboardValidator),
  cacheGamificationData(300),
  challengeController.getChallengeLeaderboard
);

/**
 * Create weekly challenges (admin only)
 * POST /api/v1/gamification/challenges/weekly/generate
 */
router.post(
  '/challenges/weekly/generate',
  authorize('admin'),
  validate(validators.createWeeklyChallengesValidator),
  challengeController.createWeeklyChallenges
);

/**
 * Update challenge progress (internal)
 * POST /api/v1/gamification/challenges/users/:userId/progress
 */
router.post(
  '/challenges/users/:userId/progress',
  authorize('internal'),
  validate(validators.updateChallengeProgressValidator),
  challengeController.updateProgress
);

export { router as gamificationRouter };