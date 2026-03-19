/**
 * AI Routes
 * Defines all AI-related API endpoints
 */

import { Router } from 'express';
import { aiController } from './controllers/ai.controller';
import { recommendationController } from './controllers/recommendation.controller';
import { personalizationController } from './controllers/personalization.controller';
import { trendController } from './controllers/trend.controller';
import { fraudAIController } from './controllers/fraud-ai.controller';
import { moderationController } from './controllers/moderation.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  trackAIMetrics,
  aiRateLimit,
  validateAIPayload,
  cacheAIResponse,
  checkAIFeature,
  logAIUsage,
  sanitizeAIInput,
  validateModelParams,
  checkAIHealth,
  addRequestId,
} from './middleware/ai.middleware';
import * as validators from './validators';

const router = Router();

// Apply global middleware to all AI routes
router.use(addRequestId);
router.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));
router.use(aiRateLimit);
router.use(trackAIMetrics);
router.use(logAIUsage);
router.use(checkAIHealth);

// =====================================================
// Main AI Routes
// =====================================================

/**
 * Process AI request (main endpoint)
 * POST /api/v1/ai/process
 */
router.post(
  '/process',
  authenticate,
  validate(validators.processAIRequestValidator),
  validateAIPayload,
  sanitizeAIInput,
  validateModelParams,
  cacheAIResponse(300),
  aiController.processRequest
);

/**
 * Get AI usage statistics (admin only)
 * GET /api/v1/ai/stats/usage
 */
router.get(
  '/stats/usage',
  authenticate,
  authorize('admin'),
  validate(validators.getUsageStatsValidator),
  aiController.getUsageStats
);

/**
 * Get AI health status
 * GET /api/v1/ai/health
 */
router.get(
  '/health',
  validate(validators.getAIHealthValidator),
  aiController.getHealth
);

/**
 * Get available AI features
 * GET /api/v1/ai/features
 */
router.get(
  '/features',
  validate(validators.getAIFeaturesValidator),
  cacheAIResponse(3600),
  aiController.getFeatures
);

/**
 * Get AI model performance (admin only)
 * GET /api/v1/ai/performance
 */
router.get(
  '/performance',
  authenticate,
  authorize('admin'),
  validate(validators.getModelPerformanceValidator),
  aiController.getModelPerformance
);

/**
 * Clear AI cache (admin only)
 * POST /api/v1/ai/cache/clear
 */
router.post(
  '/cache/clear',
  authenticate,
  authorize('admin'),
  validate(validators.clearCacheValidator),
  aiController.clearCache
);

/**
 * Train AI models (admin only)
 * POST /api/v1/ai/train
 */
router.post(
  '/train',
  authenticate,
  authorize('admin'),
  validate(validators.trainModelsValidator),
  aiController.trainModels
);

/**
 * Test AI endpoint (development only)
 * POST /api/v1/ai/test
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/test',
    validate(validators.testAIValidator),
    aiController.test
  );
}

// =====================================================
// Recommendation Routes
// =====================================================

/**
 * Get personalized recommendations
 * GET /api/v1/ai/recommendations
 */
router.get(
  '/recommendations',
  authenticate,
  validate(validators.getRecommendationsValidator),
  checkAIFeature('recommendation'),
  cacheAIResponse(600),
  recommendationController.getRecommendations
);

/**
 * Get recommendation explanation
 * GET /api/v1/ai/recommendations/:itemType/:itemId/explain
 */
router.get(
  '/recommendations/:itemType/:itemId/explain',
  authenticate,
  validate(validators.getExplanationValidator),
  checkAIFeature('recommendation'),
  recommendationController.getExplanation
);

/**
 * Refresh recommendations cache
 * POST /api/v1/ai/recommendations/refresh
 */
router.post(
  '/recommendations/refresh',
  authenticate,
  validate(validators.refreshCacheValidator),
  recommendationController.refreshCache
);

// =====================================================
// Personalization Routes
// =====================================================

/**
 * Get user personalization profile
 * GET /api/v1/ai/personalization/profile
 */
router.get(
  '/personalization/profile',
  authenticate,
  validate(validators.getPersonalizationValidator),
  checkAIFeature('personalization'),
  cacheAIResponse(600),
  personalizationController.getPersonalization
);

/**
 * Get user segments
 * GET /api/v1/ai/personalization/segments
 */
router.get(
  '/personalization/segments',
  authenticate,
  validate(validators.getUserSegmentsValidator),
  checkAIFeature('personalization'),
  cacheAIResponse(3600),
  personalizationController.getUserSegments
);

/**
 * Get personalized notifications
 * GET /api/v1/ai/personalization/notifications
 */
router.get(
  '/personalization/notifications',
  authenticate,
  validate(validators.getPersonalizedNotificationsValidator),
  checkAIFeature('personalization'),
  cacheAIResponse(60),
  personalizationController.getPersonalizedNotifications
);

/**
 * Update personalization (track interaction)
 * POST /api/v1/ai/personalization/update
 */
router.post(
  '/personalization/update',
  authenticate,
  validate(validators.updatePersonalizationValidator),
  checkAIFeature('personalization'),
  personalizationController.updatePersonalization
);

// =====================================================
// Trend Routes
// =====================================================

/**
 * Get trending items
 * GET /api/v1/ai/trend/current
 */
router.get(
  '/trend/current',
  authenticate,
  validate(validators.getTrendingItemsValidator),
  checkAIFeature('trend'),
  cacheAIResponse(300),
  trendController.getTrendingItems
);

/**
 * Get trend predictions
 * GET /api/v1/ai/trend/predict/:itemType/:itemId
 */
router.get(
  '/trend/predict/:itemType/:itemId',
  authenticate,
  validate(validators.getPredictionsValidator),
  checkAIFeature('trend'),
  cacheAIResponse(3600),
  trendController.getPredictions
);

/**
 * Get trend categories
 * GET /api/v1/ai/trend/categories
 */
router.get(
  '/trend/categories',
  authenticate,
  validate(validators.getTrendCategoriesValidator),
  checkAIFeature('trend'),
  cacheAIResponse(3600),
  trendController.getTrendCategories
);

/**
 * Get trend insights
 * GET /api/v1/ai/trend/insights
 */
router.get(
  '/trend/insights',
  authenticate,
  validate(validators.getTrendInsightsValidator),
  checkAIFeature('trend'),
  cacheAIResponse(600),
  trendController.getTrendInsights
);

// =====================================================
// AI Fraud Detection Routes (Admin only)
// =====================================================

/**
 * Analyze user behavior for fraud
 * GET /api/v1/ai/fraud/analyze/:userId
 */
router.get(
  '/fraud/analyze/:userId',
  authenticate,
  authorize('admin'),
  validate(validators.analyzeUserBehaviorValidator),
  checkAIFeature('fraud'),
  fraudAIController.analyzeUserBehavior
);

/**
 * Detect account takeover
 * GET /api/v1/ai/fraud/takeover/:userId
 */
router.get(
  '/fraud/takeover/:userId',
  authenticate,
  authorize('admin'),
  validate(validators.detectAccountTakeoverValidator),
  checkAIFeature('fraud'),
  fraudAIController.detectAccountTakeover
);

/**
 * Detect click fraud
 * GET /api/v1/ai/fraud/click/:adId
 */
router.get(
  '/fraud/click/:adId',
  authenticate,
  authorize('admin'),
  validate(validators.detectClickFraudValidator),
  checkAIFeature('fraud'),
  fraudAIController.detectClickFraud
);

/**
 * Get fraud statistics
 * GET /api/v1/ai/fraud/stats
 */
router.get(
  '/fraud/stats',
  authenticate,
  authorize('admin'),
  validate(validators.getFraudStatisticsValidator),
  checkAIFeature('fraud'),
  cacheAIResponse(3600),
  fraudAIController.getFraudStatistics
);

// =====================================================
// Content Moderation Routes
// =====================================================

/**
 * Moderate text content
 * POST /api/v1/ai/moderation/text
 */
router.post(
  '/moderation/text',
  authenticate,
  validate(validators.moderateTextValidator),
  checkAIFeature('moderation'),
  sanitizeAIInput,
  moderationController.moderateText
);

/**
 * Moderate image content
 * POST /api/v1/ai/moderation/image
 */
router.post(
  '/moderation/image',
  authenticate,
  validate(validators.moderateImageValidator),
  checkAIFeature('moderation'),
  moderationController.moderateImage
);

/**
 * Get moderation statistics
 * GET /api/v1/ai/moderation/stats
 */
router.get(
  '/moderation/stats',
  authenticate,
  validate(validators.getModerationStatsValidator),
  checkAIFeature('moderation'),
  cacheAIResponse(3600),
  moderationController.getModerationStats
);

/**
 * Get moderation rules
 * GET /api/v1/ai/moderation/rules
 */
router.get(
  '/moderation/rules',
  authenticate,
  validate(validators.getModerationRulesValidator),
  checkAIFeature('moderation'),
  cacheAIResponse(3600),
  moderationController.getModerationRules
);

/**
 * Update moderation rules (admin only)
 * PUT /api/v1/ai/moderation/rules
 */
router.put(
  '/moderation/rules',
  authenticate,
  authorize('admin'),
  validate(validators.updateModerationRulesValidator),
  checkAIFeature('moderation'),
  moderationController.updateModerationRules
);

export { router as aiRouter };