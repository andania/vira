/**
 * Engagement Routes
 * Defines all engagement-related API endpoints
 */

import { Router } from 'express';
import { engagementController } from './controllers/engagement.controller';
import { commentController } from './controllers/comment.controller';
import { suggestionController } from './controllers/suggestion.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  targetExists,
  engagementRateLimit,
  checkDuplicateEngagement,
  validateCommentContent,
  validateSuggestionContent,
  canModerate,
  trackEngagement,
} from './middleware/engagement.middleware';
import * as validators from './validators';

const router = Router();

// All engagement routes require authentication
router.use(authenticate);

// =====================================================
// General Engagement Routes
// =====================================================

/**
 * Process engagement action
 * POST /api/v1/engagement
 */
router.post(
  '/',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.processEngagementValidator),
  targetExists,
  engagementRateLimit,
  checkDuplicateEngagement,
  trackEngagement,
  engagementController.processEngagement
);

/**
 * Get engagement counts
 * GET /api/v1/engagement/counts/:targetType/:targetId
 */
router.get(
  '/counts/:targetType/:targetId',
  validate(validators.getEngagementCountsValidator),
  engagementController.getEngagementCounts
);

/**
 * Get user engagement history
 * GET /api/v1/engagement/user/history
 */
router.get(
  '/user/history',
  validate(validators.getUserEngagementValidator),
  engagementController.getUserEngagement
);

/**
 * Get reward weights
 * GET /api/v1/engagement/rewards/weights
 */
router.get(
  '/rewards/weights',
  validate(validators.getRewardWeightsValidator),
  engagementController.getRewardWeights
);

/**
 * Get user reward stats
 * GET /api/v1/engagement/rewards/stats
 */
router.get(
  '/rewards/stats',
  validate(validators.getUserRewardStatsValidator),
  engagementController.getUserRewardStats
);

/**
 * Get top earners
 * GET /api/v1/engagement/leaderboard/top-earners
 */
router.get(
  '/leaderboard/top-earners',
  validate(validators.getTopEarnersValidator),
  engagementController.getTopEarners
);

// =====================================================
// Comment Routes
// =====================================================

/**
 * Create comment
 * POST /api/v1/engagement/comments
 */
router.post(
  '/comments',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.createCommentValidator),
  targetExists,
  validateCommentContent,
  engagementRateLimit,
  checkDuplicateEngagement,
  commentController.createComment
);

/**
 * Get comments for target
 * GET /api/v1/engagement/comments/:targetType/:targetId
 */
router.get(
  '/comments/:targetType/:targetId',
  validate(validators.getCommentsValidator),
  commentController.getComments
);

/**
 * Get single comment
 * GET /api/v1/engagement/comments/:commentId
 */
router.get(
  '/comments/:commentId',
  validate(validators.getCommentValidator),
  commentController.getComment
);

/**
 * Update comment
 * PUT /api/v1/engagement/comments/:commentId
 */
router.put(
  '/comments/:commentId',
  validate(validators.updateCommentValidator),
  canModerate,
  validateCommentContent,
  commentController.updateComment
);

/**
 * Delete comment
 * DELETE /api/v1/engagement/comments/:commentId
 */
router.delete(
  '/comments/:commentId',
  validate(validators.deleteCommentValidator),
  canModerate,
  commentController.deleteComment
);

/**
 * Toggle comment like
 * POST /api/v1/engagement/comments/:commentId/like
 */
router.post(
  '/comments/:commentId/like',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.toggleCommentLikeValidator),
  engagementRateLimit,
  checkDuplicateEngagement,
  commentController.toggleLike
);

/**
 * Report comment
 * POST /api/v1/engagement/comments/:commentId/report
 */
router.post(
  '/comments/:commentId/report',
  rateLimit({ windowMs: 60 * 1000, max: 5 }),
  validate(validators.reportCommentValidator),
  engagementRateLimit,
  checkDuplicateEngagement,
  commentController.reportComment
);

/**
 * Get comment replies
 * GET /api/v1/engagement/comments/:commentId/replies
 */
router.get(
  '/comments/:commentId/replies',
  validate(validators.getCommentRepliesValidator),
  commentController.getReplies
);

// =====================================================
// Suggestion Routes
// =====================================================

/**
 * Create suggestion
 * POST /api/v1/engagement/suggestions
 */
router.post(
  '/suggestions',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 suggestions per hour
  validate(validators.createSuggestionValidator),
  targetExists,
  validateSuggestionContent,
  engagementRateLimit,
  checkDuplicateEngagement,
  suggestionController.createSuggestion
);

/**
 * Get suggestions for target
 * GET /api/v1/engagement/suggestions/:targetType/:targetId
 */
router.get(
  '/suggestions/:targetType/:targetId',
  validate(validators.getSuggestionsValidator),
  suggestionController.getSuggestions
);

/**
 * Get single suggestion
 * GET /api/v1/engagement/suggestions/:suggestionId
 */
router.get(
  '/suggestions/:suggestionId',
  validate(validators.getSuggestionValidator),
  suggestionController.getSuggestion
);

/**
 * Update suggestion status (content owners/admins)
 * PUT /api/v1/engagement/suggestions/:suggestionId/status
 */
router.put(
  '/suggestions/:suggestionId/status',
  authorize(['sponsor', 'admin']),
  validate(validators.updateSuggestionStatusValidator),
  suggestionController.updateSuggestionStatus
);

/**
 * Vote on suggestion
 * POST /api/v1/engagement/suggestions/:suggestionId/vote
 */
router.post(
  '/suggestions/:suggestionId/vote',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.voteSuggestionValidator),
  engagementRateLimit,
  checkDuplicateEngagement,
  suggestionController.voteSuggestion
);

/**
 * Add comment to suggestion
 * POST /api/v1/engagement/suggestions/:suggestionId/comments
 */
router.post(
  '/suggestions/:suggestionId/comments',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  validate(validators.addSuggestionCommentValidator),
  validateCommentContent,
  suggestionController.addComment
);

/**
 * Get suggestion statistics
 * GET /api/v1/engagement/suggestions/stats/:targetType/:targetId
 */
router.get(
  '/suggestions/stats/:targetType/:targetId',
  validate(validators.getSuggestionStatsValidator),
  suggestionController.getSuggestionStats
);

export { router as engagementRouter };