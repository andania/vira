/**
 * Auth Routes
 * Defines all authentication-related API endpoints
 */

import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { oauthController } from './controllers/oauth.controller';
import { verificationController } from './controllers/verification.controller';
import { authenticate, optionalAuthenticate, authorize } from './middleware/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimiters } from './middleware';
import * as validators from './validators';

const router = Router();

// =====================================================
// Public Routes (No Authentication Required)
// =====================================================

/**
 * Register new user
 * POST /api/v1/auth/register
 */
router.post(
  '/register',
  rateLimiters.register,
  validate(validators.registerValidator),
  authController.register
);

/**
 * Login
 * POST /api/v1/auth/login
 */
router.post(
  '/login',
  rateLimiters.login,
  validate(validators.loginValidator),
  authController.login
);

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
router.post(
  '/refresh',
  rateLimiters.api,
  validate(validators.refreshTokenValidator),
  authController.refreshToken
);

/**
 * Request password reset
 * POST /api/v1/auth/password-reset/request
 */
router.post(
  '/password-reset/request',
  rateLimiters.passwordReset,
  validate(validators.requestPasswordResetValidator),
  authController.requestPasswordReset
);

/**
 * Reset password with token
 * POST /api/v1/auth/password-reset/reset
 */
router.post(
  '/password-reset/reset',
  rateLimiters.passwordReset,
  validate(validators.resetPasswordValidator),
  authController.resetPassword
);

/**
 * Verify email with token (legacy)
 * GET /api/v1/auth/verify-email/:token
 */
router.get(
  '/verify-email/:token',
  validate(validators.verifyEmailTokenValidator),
  verificationController.verifyEmailWithToken
);

/**
 * Check username availability
 * GET /api/v1/auth/check-username/:username
 */
router.get(
  '/check-username/:username',
  validate(validators.checkUsernameValidator),
  authController.checkUsername
);

/**
 * Check email availability
 * GET /api/v1/auth/check-email/:email
 */
router.get(
  '/check-email/:email',
  validate(validators.checkEmailValidator),
  authController.checkEmail
);

// =====================================================
// OAuth Routes
// =====================================================

/**
 * Google OAuth login
 * POST /api/v1/auth/oauth/google
 */
router.post(
  '/oauth/google',
  rateLimiters.login,
  validate(validators.googleLoginValidator),
  oauthController.googleLogin
);

/**
 * Facebook OAuth login
 * POST /api/v1/auth/oauth/facebook
 */
router.post(
  '/oauth/facebook',
  rateLimiters.login,
  validate(validators.facebookLoginValidator),
  oauthController.facebookLogin
);

/**
 * Apple OAuth login
 * POST /api/v1/auth/oauth/apple
 */
router.post(
  '/oauth/apple',
  rateLimiters.login,
  validate(validators.appleLoginValidator),
  oauthController.appleLogin
);

// =====================================================
// Protected Routes (Authentication Required)
// =====================================================

// All routes below require authentication
router.use(authenticate);

/**
 * Get current user
 * GET /api/v1/auth/me
 */
router.get(
  '/me',
  authController.getCurrentUser
);

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
router.post(
  '/change-password',
  rateLimiters.strict,
  validate(validators.changePasswordValidator),
  authController.changePassword
);

/**
 * Logout
 * POST /api/v1/auth/logout
 */
router.post(
  '/logout',
  authController.logout
);

/**
 * Logout from all devices
 * POST /api/v1/auth/logout-all
 */
router.post(
  '/logout-all',
  authController.logoutAll
);

/**
 * Get active sessions
 * GET /api/v1/auth/sessions
 */
router.get(
  '/sessions',
  authController.getSessions
);

/**
 * Revoke session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
router.delete(
  '/sessions/:sessionId',
  validate(validators.revokeSessionValidator),
  authController.revokeSession
);

// =====================================================
// Verification Routes
// =====================================================

/**
 * Send email verification
 * POST /api/v1/auth/verify/email/send
 */
router.post(
  '/verify/email/send',
  rateLimiters.emailVerification,
  validate(validators.sendEmailVerificationValidator),
  verificationController.sendEmailVerification
);

/**
 * Verify email with OTP
 * POST /api/v1/auth/verify/email
 */
router.post(
  '/verify/email',
  rateLimiters.emailVerification,
  validate(validators.verifyOTPValidator),
  verificationController.verifyEmail
);

/**
 * Send phone verification
 * POST /api/v1/auth/verify/phone/send
 */
router.post(
  '/verify/phone/send',
  rateLimiters.phoneVerification,
  validate(validators.sendPhoneVerificationValidator),
  verificationController.sendPhoneVerification
);

/**
 * Verify phone with OTP
 * POST /api/v1/auth/verify/phone
 */
router.post(
  '/verify/phone',
  rateLimiters.phoneVerification,
  validate(validators.verifyOTPValidator),
  verificationController.verifyPhone
);

/**
 * Resend verification code
 * POST /api/v1/auth/verify/resend/:type/:identifier
 */
router.post(
  '/verify/resend/:type/:identifier',
  rateLimiters.otp,
  validate(validators.resendCodeValidator),
  verificationController.resendCode
);

/**
 * Get verification status
 * GET /api/v1/auth/verify/status
 */
router.get(
  '/verify/status',
  verificationController.getVerificationStatus
);

/**
 * Get remaining attempts
 * GET /api/v1/auth/verify/attempts/:type/:identifier
 */
router.get(
  '/verify/attempts/:type/:identifier',
  validate(validators.getRemainingAttemptsValidator),
  verificationController.getRemainingAttempts
);

/**
 * Update email
 * PUT /api/v1/auth/email
 */
router.put(
  '/email',
  rateLimiters.strict,
  validate(validators.updateEmailValidator),
  verificationController.updateEmail
);

/**
 * Update phone
 * PUT /api/v1/auth/phone
 */
router.put(
  '/phone',
  rateLimiters.strict,
  validate(validators.updatePhoneValidator),
  verificationController.updatePhone
);

// =====================================================
// OAuth Account Management Routes
// =====================================================

/**
 * Get linked OAuth accounts
 * GET /api/v1/auth/oauth/accounts
 */
router.get(
  '/oauth/accounts',
  oauthController.getLinkedAccounts
);

/**
 * Link OAuth account
 * POST /api/v1/auth/oauth/link
 */
router.post(
  '/oauth/link',
  rateLimiters.strict,
  validate(validators.linkAccountValidator),
  oauthController.linkAccount
);

/**
 * Unlink OAuth account
 * DELETE /api/v1/auth/oauth/unlink/:provider
 */
router.delete(
  '/oauth/unlink/:provider',
  rateLimiters.strict,
  validate(validators.unlinkAccountValidator),
  oauthController.unlinkAccount
);

export { router as authRouter };