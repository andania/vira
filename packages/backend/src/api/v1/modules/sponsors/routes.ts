/**
 * Sponsor Routes
 * Defines all sponsor-related API endpoints
 */

import { Router } from 'express';
import { sponsorController } from './controllers/sponsor.controller';
import { brandController } from './controllers/brand.controller';
import { verificationController } from './controllers/verification.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  requireSponsor,
  requireVerifiedSponsor,
  ownsBrand,
  checkCreditLimit,
  sponsorRateLimit,
  validateBusinessDetails,
  checkBrandNameAvailability,
  logSponsorAction,
  validateVerificationFiles,
} from './middleware/sponsor.middleware';
import * as validators from './validators';

const router = Router();

// All sponsor routes require authentication and sponsor role
router.use(authenticate);
router.use(requireSponsor);
router.use(sponsorRateLimit);

// =====================================================
// Sponsor Profile Routes
// =====================================================

/**
 * Get sponsor profile
 * GET /api/v1/sponsors/profile
 */
router.get(
  '/profile',
  validate(validators.getSponsorStatsValidator),
  sponsorController.getProfile
);

/**
 * Update sponsor profile
 * PUT /api/v1/sponsors/profile
 */
router.put(
  '/profile',
  validate(validators.updateSponsorProfileValidator),
  logSponsorAction('UPDATE_PROFILE'),
  sponsorController.updateProfile
);

/**
 * Get sponsor statistics
 * GET /api/v1/sponsors/stats
 */
router.get(
  '/stats',
  validate(validators.getSponsorStatsValidator),
  sponsorController.getStats
);

/**
 * Get sponsor dashboard
 * GET /api/v1/sponsors/dashboard
 */
router.get(
  '/dashboard',
  validate(validators.getDashboardValidator),
  sponsorController.getDashboard
);

// =====================================================
// Brand Management Routes
// =====================================================

/**
 * Get all brands for sponsor
 * GET /api/v1/sponsors/brands
 */
router.get(
  '/brands',
  validate(validators.getSponsorBrandsValidator),
  sponsorController.getBrands
);

/**
 * Create brand
 * POST /api/v1/sponsors/brands
 */
router.post(
  '/brands',
  requireVerifiedSponsor,
  checkCreditLimit,
  validate(validators.createBrandValidator),
  checkBrandNameAvailability,
  logSponsorAction('CREATE_BRAND'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  sponsorController.createBrand
);

/**
 * Get brand details
 * GET /api/v1/sponsors/brands/:brandId
 */
router.get(
  '/brands/:brandId',
  validate(validators.getBrandDetailsValidator),
  ownsBrand,
  brandController.getBrandDetails
);

/**
 * Update brand
 * PUT /api/v1/sponsors/brands/:brandId
 */
router.put(
  '/brands/:brandId',
  validate(validators.updateBrandValidator),
  ownsBrand,
  checkBrandNameAvailability,
  logSponsorAction('UPDATE_BRAND'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  brandController.updateBrand
);

/**
 * Delete brand
 * DELETE /api/v1/sponsors/brands/:brandId
 */
router.delete(
  '/brands/:brandId',
  validate(validators.deleteBrandValidator),
  ownsBrand,
  logSponsorAction('DELETE_BRAND'),
  sponsorController.deleteBrand
);

/**
 * Get brand followers
 * GET /api/v1/sponsors/brands/:brandId/followers
 */
router.get(
  '/brands/:brandId/followers',
  validate(validators.getBrandFollowersValidator),
  ownsBrand,
  brandController.getFollowers
);

/**
 * Get brand campaigns
 * GET /api/v1/sponsors/brands/:brandId/campaigns
 */
router.get(
  '/brands/:brandId/campaigns',
  validate(validators.getBrandCampaignsValidator),
  ownsBrand,
  brandController.getCampaigns
);

/**
 * Get brand rooms
 * GET /api/v1/sponsors/brands/:brandId/rooms
 */
router.get(
  '/brands/:brandId/rooms',
  validate(validators.getBrandRoomsValidator),
  ownsBrand,
  brandController.getRooms
);

/**
 * Get brand analytics
 * GET /api/v1/sponsors/brands/:brandId/analytics
 */
router.get(
  '/brands/:brandId/analytics',
  validate(validators.getBrandAnalyticsValidator),
  ownsBrand,
  brandController.getAnalytics
);

/**
 * Get brand team members
 * GET /api/v1/sponsors/brands/:brandId/team
 */
router.get(
  '/brands/:brandId/team',
  validate(validators.getTeamMembersValidator),
  ownsBrand,
  brandController.getTeamMembers
);

/**
 * Add team member
 * POST /api/v1/sponsors/brands/:brandId/team
 */
router.post(
  '/brands/:brandId/team',
  validate(validators.addTeamMemberValidator),
  ownsBrand,
  logSponsorAction('ADD_TEAM_MEMBER'),
  brandController.addTeamMember
);

/**
 * Update team member role
 * PUT /api/v1/sponsors/brands/:brandId/team/:userId
 */
router.put(
  '/brands/:brandId/team/:userId',
  validate(validators.updateTeamMemberRoleValidator),
  ownsBrand,
  logSponsorAction('UPDATE_TEAM_MEMBER'),
  brandController.updateTeamMemberRole
);

/**
 * Remove team member
 * DELETE /api/v1/sponsors/brands/:brandId/team/:userId
 */
router.delete(
  '/brands/:brandId/team/:userId',
  validate(validators.removeTeamMemberValidator),
  ownsBrand,
  logSponsorAction('REMOVE_TEAM_MEMBER'),
  brandController.removeTeamMember
);

// =====================================================
// Payment Routes
// =====================================================

/**
 * Get payment methods
 * GET /api/v1/sponsors/payments/methods
 */
router.get(
  '/payments/methods',
  validate(validators.getPaymentMethodsValidator),
  sponsorController.getPaymentMethods
);

/**
 * Add payment method
 * POST /api/v1/sponsors/payments/methods
 */
router.post(
  '/payments/methods',
  validate(validators.addPaymentMethodValidator),
  logSponsorAction('ADD_PAYMENT_METHOD'),
  sponsorController.addPaymentMethod
);

/**
 * Remove payment method
 * DELETE /api/v1/sponsors/payments/methods/:methodId
 */
router.delete(
  '/payments/methods/:methodId',
  validate(validators.removePaymentMethodValidator),
  logSponsorAction('REMOVE_PAYMENT_METHOD'),
  sponsorController.removePaymentMethod
);

/**
 * Get transaction history
 * GET /api/v1/sponsors/payments/transactions
 */
router.get(
  '/payments/transactions',
  validate(validators.getTransactionsValidator),
  sponsorController.getTransactions
);

/**
 * Get invoices
 * GET /api/v1/sponsors/payments/invoices
 */
router.get(
  '/payments/invoices',
  validate(validators.getInvoicesValidator),
  sponsorController.getInvoices
);

// =====================================================
// Verification Routes
// =====================================================

/**
 * Get verification status
 * GET /api/v1/sponsors/verification/status
 */
router.get(
  '/verification/status',
  validate(validators.getVerificationStatusValidator),
  verificationController.getVerificationStatus
);

/**
 * Submit verification request
 * POST /api/v1/sponsors/verification/submit
 */
router.post(
  '/verification/submit',
  rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 3 }), // 3 attempts per day
  validate(validators.submitVerificationValidator),
  validateBusinessDetails,
  validateVerificationFiles,
  upload.array('documents', 10),
  logSponsorAction('SUBMIT_VERIFICATION'),
  verificationController.submitVerification
);

/**
 * Upload additional documents
 * POST /api/v1/sponsors/verification/documents
 */
router.post(
  '/verification/documents',
  rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 5 }),
  validateVerificationFiles,
  upload.array('documents', 10),
  logSponsorAction('UPLOAD_ADDITIONAL_DOCUMENTS'),
  verificationController.uploadAdditionalDocuments
);

// =====================================================
// Admin Routes (for managing sponsors)
// =====================================================

/**
 * Get pending verifications (admin only)
 * GET /api/v1/sponsors/admin/verifications/pending
 */
router.get(
  '/admin/verifications/pending',
  authorize('admin'),
  validate(validators.getPendingVerificationsValidator),
  verificationController.getPendingVerifications
);

/**
 * Get verification details (admin only)
 * GET /api/v1/sponsors/admin/verifications/:verificationId
 */
router.get(
  '/admin/verifications/:verificationId',
  authorize('admin'),
  validate(validators.getVerificationDetailsValidator),
  verificationController.getVerificationDetails
);

/**
 * Process verification (admin only)
 * POST /api/v1/sponsors/admin/verifications/:verificationId/process
 */
router.post(
  '/admin/verifications/:verificationId/process',
  authorize('admin'),
  validate(validators.processVerificationValidator),
  logSponsorAction('PROCESS_VERIFICATION'),
  verificationController.processVerification
);

/**
 * Request additional documents (admin only)
 * POST /api/v1/sponsors/admin/verifications/:verificationId/request-docs
 */
router.post(
  '/admin/verifications/:verificationId/request-docs',
  authorize('admin'),
  validate(validators.requestAdditionalDocumentsValidator),
  logSponsorAction('REQUEST_DOCUMENTS'),
  verificationController.requestAdditionalDocuments
);

/**
 * Get verification statistics (admin only)
 * GET /api/v1/sponsors/admin/verifications/stats
 */
router.get(
  '/admin/verifications/stats',
  authorize('admin'),
  validate(validators.getVerificationStatsValidator),
  verificationController.getVerificationStats
);

export { router as sponsorRouter };