/**
 * Campaign Routes
 * Defines all campaign-related API endpoints
 */

import { Router } from 'express';
import { campaignController } from './controllers/campaign.controller';
import { adController } from './controllers/ad.controller';
import { targetingController } from './controllers/targeting.controller';
import { campaignAnalyticsController } from './controllers/analytics.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  campaignExists,
  ownsCampaign,
  canModifyCampaign,
  canLaunchCampaign,
  validateCampaignDates,
  validateCampaignBudget,
  campaignRateLimit,
} from './middleware/campaign.middleware';
import {
  adExists,
  ownsAd,
  validateAdContent,
  validateAssetUpload,
} from './middleware/ad.middleware';
import * as validators from './validators';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

// =====================================================
// Targeting Routes
// =====================================================

/**
 * Estimate audience size
 * POST /api/v1/campaigns/targeting/estimate
 */
router.post(
  '/targeting/estimate',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 100 }),
  validate(validators.estimateAudienceValidator),
  targetingController.estimateAudience
);

/**
 * Validate targeting criteria
 * POST /api/v1/campaigns/targeting/validate
 */
router.post(
  '/targeting/validate',
  validate(validators.validateTargetingValidator),
  targetingController.validateTargeting
);

/**
 * Create audience segment
 * POST /api/v1/campaigns/targeting/segments
 */
router.post(
  '/targeting/segments',
  authorize('sponsor'),
  validate(validators.createAudienceSegmentValidator),
  targetingController.createAudienceSegment
);

/**
 * Get audience segments
 * GET /api/v1/campaigns/targeting/segments
 */
router.get(
  '/targeting/segments',
  authorize('sponsor'),
  targetingController.getAudienceSegments
);

/**
 * Update audience segment
 * PUT /api/v1/campaigns/targeting/segments/:segmentId
 */
router.put(
  '/targeting/segments/:segmentId',
  authorize('sponsor'),
  validate(validators.updateAudienceSegmentValidator),
  targetingController.updateAudienceSegment
);

/**
 * Delete audience segment
 * DELETE /api/v1/campaigns/targeting/segments/:segmentId
 */
router.delete(
  '/targeting/segments/:segmentId',
  authorize('sponsor'),
  validate(validators.deleteAudienceSegmentValidator),
  targetingController.deleteAudienceSegment
);

/**
 * Check if user matches targeting
 * POST /api/v1/campaigns/targeting/check/:userId
 */
router.post(
  '/targeting/check/:userId',
  authorize('sponsor'),
  validate(validators.checkUserMatchValidator),
  targetingController.checkUserMatch
);

// =====================================================
// Campaign Routes
// =====================================================

/**
 * Create campaign
 * POST /api/v1/campaigns
 */
router.post(
  '/',
  authorize('sponsor'),
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }),
  validate(validators.createCampaignValidator),
  validateCampaignDates,
  validateCampaignBudget,
  campaignController.createCampaign
);

/**
 * Get campaign by ID
 * GET /api/v1/campaigns/:campaignId
 */
router.get(
  '/:campaignId',
  validate(validators.getCampaignByIdValidator),
  campaignExists,
  campaignController.getCampaign
);

/**
 * Update campaign
 * PUT /api/v1/campaigns/:campaignId
 */
router.put(
  '/:campaignId',
  authorize('sponsor'),
  validate(validators.updateCampaignValidator),
  campaignExists,
  ownsCampaign,
  canModifyCampaign,
  validateCampaignDates,
  validateCampaignBudget,
  campaignController.updateCampaign
);

/**
 * Delete campaign
 * DELETE /api/v1/campaigns/:campaignId
 */
router.delete(
  '/:campaignId',
  authorize('sponsor'),
  validate(validators.deleteCampaignValidator),
  campaignExists,
  ownsCampaign,
  canModifyCampaign,
  campaignController.deleteCampaign
);

/**
 * Launch campaign
 * POST /api/v1/campaigns/:campaignId/launch
 */
router.post(
  '/:campaignId/launch',
  authorize('sponsor'),
  validate(validators.launchCampaignValidator),
  campaignExists,
  ownsCampaign,
  canLaunchCampaign,
  campaignController.launchCampaign
);

/**
 * Pause campaign
 * POST /api/v1/campaigns/:campaignId/pause
 */
router.post(
  '/:campaignId/pause',
  authorize('sponsor'),
  validate(validators.pauseCampaignValidator),
  campaignExists,
  ownsCampaign,
  campaignController.pauseCampaign
);

/**
 * End campaign
 * POST /api/v1/campaigns/:campaignId/end
 */
router.post(
  '/:campaignId/end',
  authorize('sponsor'),
  validate(validators.endCampaignValidator),
  campaignExists,
  ownsCampaign,
  campaignController.endCampaign
);

/**
 * Duplicate campaign
 * POST /api/v1/campaigns/:campaignId/duplicate
 */
router.post(
  '/:campaignId/duplicate',
  authorize('sponsor'),
  validate(validators.duplicateCampaignValidator),
  campaignExists,
  ownsCampaign,
  campaignController.duplicateCampaign
);

/**
 * Get campaigns by brand
 * GET /api/v1/campaigns/brand/:brandId
 */
router.get(
  '/brand/:brandId',
  validate(validators.getCampaignsByBrandValidator),
  campaignController.getCampaignsByBrand
);

/**
 * Get campaign budget report
 * GET /api/v1/campaigns/:campaignId/budget/report
 */
router.get(
  '/:campaignId/budget/report',
  validate(validators.getBudgetReportValidator),
  campaignExists,
  ownsCampaign,
  campaignController.getBudgetReport
);

/**
 * Allocate budget to campaign
 * POST /api/v1/campaigns/:campaignId/budget/allocate
 */
router.post(
  '/:campaignId/budget/allocate',
  authorize('sponsor'),
  validate(validators.allocateBudgetValidator),
  campaignExists,
  ownsCampaign,
  campaignController.allocateBudget
);

// =====================================================
// Ad Routes
// =====================================================

/**
 * Create ad
 * POST /api/v1/campaigns/ads
 */
router.post(
  '/ads',
  authorize('sponsor'),
  validate(validators.createAdValidator),
  validateAdContent,
  adController.createAd
);

/**
 * Get ad by ID
 * GET /api/v1/campaigns/ads/:adId
 */
router.get(
  '/ads/:adId',
  validate(validators.getAdByIdValidator),
  adExists,
  adController.getAd
);

/**
 * Update ad
 * PUT /api/v1/campaigns/ads/:adId
 */
router.put(
  '/ads/:adId',
  authorize('sponsor'),
  validate(validators.updateAdValidator),
  adExists,
  ownsAd,
  validateAdContent,
  adController.updateAd
);

/**
 * Delete ad
 * DELETE /api/v1/campaigns/ads/:adId
 */
router.delete(
  '/ads/:adId',
  authorize('sponsor'),
  validate(validators.deleteAdValidator),
  adExists,
  ownsAd,
  adController.deleteAd
);

/**
 * Upload ad asset
 * POST /api/v1/campaigns/ads/:adId/assets
 */
router.post(
  '/ads/:adId/assets',
  authorize('sponsor'),
  validate(validators.uploadAssetValidator),
  adExists,
  ownsAd,
  upload.single('file'),
  validateAssetUpload,
  adController.uploadAsset
);

/**
 * Delete ad asset
 * DELETE /api/v1/campaigns/ads/assets/:assetId
 */
router.delete(
  '/ads/assets/:assetId',
  authorize('sponsor'),
  validate(validators.deleteAssetValidator),
  adController.deleteAsset
);

/**
 * Get ads by campaign
 * GET /api/v1/campaigns/:campaignId/ads
 */
router.get(
  '/:campaignId/ads',
  validate(validators.getAdsByCampaignValidator),
  campaignExists,
  adController.getAdsByCampaign
);

/**
 * Get ad analytics
 * GET /api/v1/campaigns/ads/:adId/analytics
 */
router.get(
  '/ads/:adId/analytics',
  validate(validators.getAdAnalyticsValidator),
  adExists,
  ownsAd,
  adController.getAdAnalytics
);

/**
 * Duplicate ad
 * POST /api/v1/campaigns/ads/:adId/duplicate
 */
router.post(
  '/ads/:adId/duplicate',
  authorize('sponsor'),
  validate(validators.duplicateAdValidator),
  adExists,
  ownsAd,
  adController.duplicateAd
);

// =====================================================
// Analytics Routes
// =====================================================

/**
 * Get campaign metrics
 * GET /api/v1/campaigns/:campaignId/analytics/metrics
 */
router.get(
  '/:campaignId/analytics/metrics',
  validate(validators.getCampaignMetricsValidator),
  campaignExists,
  ownsCampaign,
  campaignAnalyticsController.getCampaignMetrics
);

/**
 * Get campaign ROI
 * GET /api/v1/campaigns/:campaignId/analytics/roi
 */
router.get(
  '/:campaignId/analytics/roi',
  validate(validators.getCampaignROIValidator),
  campaignExists,
  ownsCampaign,
  campaignAnalyticsController.getCampaignROI
);

/**
 * Get audience insights
 * GET /api/v1/campaigns/:campaignId/analytics/audience
 */
router.get(
  '/:campaignId/analytics/audience',
  validate(validators.getAudienceInsightsValidator),
  campaignExists,
  ownsCampaign,
  campaignAnalyticsController.getAudienceInsights
);

/**
 * Compare campaigns
 * POST /api/v1/campaigns/analytics/compare
 */
router.post(
  '/analytics/compare',
  authorize('sponsor'),
  validate(validators.compareCampaignsValidator),
  campaignAnalyticsController.compareCampaigns
);

/**
 * Export campaign report
 * GET /api/v1/campaigns/:campaignId/analytics/export
 */
router.get(
  '/:campaignId/analytics/export',
  validate(validators.exportCampaignReportValidator),
  campaignExists,
  ownsCampaign,
  campaignAnalyticsController.exportCampaignReport
);

/**
 * Get realtime stats
 * GET /api/v1/campaigns/:campaignId/analytics/realtime
 */
router.get(
  '/:campaignId/analytics/realtime',
  validate(validators.getRealtimeStatsValidator),
  campaignExists,
  ownsCampaign,
  campaignAnalyticsController.getRealtimeStats
);

export { router as campaignRouter };