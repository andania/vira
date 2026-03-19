/**
 * Billboard Routes
 * Defines all billboard-related API endpoints
 */

import { Router } from 'express';
import { billboardController } from './controllers/billboard.controller';
import { feedController } from './controllers/feed.controller';
import { discoveryController } from './controllers/discovery.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import {
  validateLocation,
  feedRateLimit,
  cacheFeed,
  validateSearchQuery,
  trackSearch,
  filterSensitiveContent,
  personalizeFeed,
  validatePagination,
} from './middleware/billboard.middleware';
import * as validators from './validators';

const router = Router();

// =====================================================
// Billboard Routes
// =====================================================

/**
 * Get complete billboard
 * GET /api/v1/billboard
 */
router.get(
  '/',
  rateLimit({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  validate(validators.getBillboardValidator),
  validateLocation,
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  personalizeFeed,
  billboardController.getBillboard
);

/**
 * Get single billboard section
 * GET /api/v1/billboard/sections/:sectionId
 */
router.get(
  '/sections/:sectionId',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.getSectionValidator),
  validateLocation,
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  personalizeFeed,
  billboardController.getSection
);

/**
 * Get billboard stats
 * GET /api/v1/billboard/stats
 */
router.get(
  '/stats',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  validate(validators.getBillboardStatsValidator),
  billboardController.getStats
);

/**
 * Track billboard interaction
 * POST /api/v1/billboard/track
 */
router.post(
  '/track',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 50 }),
  validate(validators.trackInteractionValidator),
  billboardController.trackInteraction
);

// =====================================================
// Feed Routes
// =====================================================

/**
 * Get main feed
 * GET /api/v1/billboard/feed
 */
router.get(
  '/feed',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getFeedValidator),
  validateLocation,
  validatePagination,
  feedRateLimit,
  cacheFeed,
  filterSensitiveContent,
  personalizeFeed,
  feedController.getFeed
);

/**
 * Get trending feed
 * GET /api/v1/billboard/feed/trending
 */
router.get(
  '/feed/trending',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getTrendingValidator),
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  feedController.getTrending
);

/**
 * Get recommended feed (authenticated)
 * GET /api/v1/billboard/feed/recommended
 */
router.get(
  '/feed/recommended',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getRecommendedValidator),
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  personalizeFeed,
  feedController.getRecommended
);

/**
 * Get nearby feed
 * GET /api/v1/billboard/feed/nearby
 */
router.get(
  '/feed/nearby',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getNearbyValidator),
  validateLocation,
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  feedController.getNearby
);

/**
 * Get feed by category
 * GET /api/v1/billboard/feed/category/:category
 */
router.get(
  '/feed/category/:category',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getByCategoryValidator),
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  feedController.getByCategory
);

/**
 * Refresh feed cache (authenticated)
 * POST /api/v1/billboard/feed/refresh
 */
router.post(
  '/feed/refresh',
  authenticate,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 times per hour
  validate(validators.refreshFeedValidator),
  feedController.refreshFeed
);

// =====================================================
// Discovery Routes
// =====================================================

/**
 * Search all content
 * GET /api/v1/billboard/search
 */
router.get(
  '/search',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.searchValidator),
  validateSearchQuery,
  validatePagination,
  trackSearch,
  cacheFeed,
  filterSensitiveContent,
  discoveryController.search
);

/**
 * Get search suggestions
 * GET /api/v1/billboard/search/suggestions
 */
router.get(
  '/search/suggestions',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.getSuggestionsValidator),
  discoveryController.getSuggestions
);

/**
 * Get trending searches
 * GET /api/v1/billboard/search/trending
 */
router.get(
  '/search/trending',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getTrendingSearchesValidator),
  discoveryController.getTrendingSearches
);

/**
 * Get content categories
 * GET /api/v1/billboard/categories
 */
router.get(
  '/categories',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getCategoriesValidator),
  cacheFeed,
  discoveryController.getCategories
);

/**
 * Filter content
 * POST /api/v1/billboard/filter
 */
router.post(
  '/filter',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.filterValidator),
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  discoveryController.filter
);

/**
 * Get content by ID
 * GET /api/v1/billboard/content/:type/:id
 */
router.get(
  '/content/:type/:id',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  validate(validators.getContentByIdValidator),
  discoveryController.getContentById
);

/**
 * Get similar content
 * GET /api/v1/billboard/content/:type/:id/similar
 */
router.get(
  '/content/:type/:id/similar',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getSimilarValidator),
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  discoveryController.getSimilar
);

// =====================================================
// Recommendation Routes (Authenticated)
// =====================================================

/**
 * Get personalized recommendations
 * GET /api/v1/billboard/recommendations
 */
router.get(
  '/recommendations',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validate(validators.getRecommendationsValidator),
  validateLocation,
  validatePagination,
  cacheFeed,
  filterSensitiveContent,
  billboardController.getRecommendations
);

/**
 * Get recommendation explanation
 * GET /api/v1/billboard/recommendations/:itemType/:itemId/explain
 */
router.get(
  '/recommendations/:itemType/:itemId/explain',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(validators.getRecommendationExplanationValidator),
  billboardController.getRecommendationExplanation
);

/**
 * Refresh recommendations
 * POST /api/v1/billboard/recommendations/refresh
 */
router.post(
  '/recommendations/refresh',
  authenticate,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }),
  validate(validators.refreshRecommendationsValidator),
  billboardController.refreshRecommendations
);

export { router as billboardRouter };