/**
 * API Middlewares Index
 * Exports all API middleware functions
 */

export * from './auth.middleware';
export * from './error.middleware';
export * from './validation.middleware';
export * from './rate-limit.middleware';
export * from './cors.middleware';
export * from './compression.middleware';
export * from './helmet.middleware';
export * from './logger.middleware';
export * from './upload.middleware';
export * from './request-id.middleware';

// Re-export commonly used middleware with convenient names
import { authenticate, authorize, optionalAuthenticate, requireVerified, requireSponsor, requireAdmin } from './auth.middleware';
import { notFound, errorHandler, catchAsync, ApiError, handleValidationError, handleDatabaseError, handleRateLimitError } from './error.middleware';
import { validate, validateBody, validateQuery, validateParams, sanitize } from './validation.middleware';
import { 
  rateLimit, 
  apiRateLimiter, 
  authRateLimiter, 
  strictRateLimiter, 
  publicRateLimiter, 
  uploadRateLimiter,
  ipRateLimiter,
  userRateLimiter
} from './rate-limit.middleware';
import { cors, corsWithOptions } from './cors.middleware';
import { compress, forceCompression, noCompression, skipCompressionForTypes } from './compression.middleware';
import { securityHeaders, strictSecurity, disableSecurity } from './helmet.middleware';
import { 
  requestId, 
  requestLogger, 
  errorLogger, 
  slowRequestLogger, 
  usageLogger,
  requestIdFromUser,
  validateRequestId,
  addRequestContextHeaders,
  ensureRequestId,
  chainRequestId,
  getRequestContext,
  getRequestTiming,
  isRequestSlow,
  getActiveRequests
} from './logger.middleware';
import { 
  upload, 
  configureUpload, 
  uploadSingle, 
  uploadArray, 
  uploadFields, 
  uploadImage, 
  uploadVideo, 
  uploadDocument 
} from './upload.middleware';

// Export all as a single object for convenience
export const middleware = {
  // Auth
  authenticate,
  authorize,
  optionalAuthenticate,
  requireVerified,
  requireSponsor,
  requireAdmin,

  // Error handling
  notFound,
  errorHandler,
  catchAsync,
  ApiError,
  handleValidationError,
  handleDatabaseError,
  handleRateLimitError,

  // Validation
  validate,
  validateBody,
  validateQuery,
  validateParams,
  sanitize,

  // Rate limiting
  rateLimit,
  apiRateLimiter,
  authRateLimiter,
  strictRateLimiter,
  publicRateLimiter,
  uploadRateLimiter,
  ipRateLimiter,
  userRateLimiter,

  // CORS
  cors,
  corsWithOptions,

  // Compression
  compress,
  forceCompression,
  noCompression,
  skipCompressionForTypes,

  // Security
  securityHeaders,
  strictSecurity,
  disableSecurity,

  // Logging & Request ID
  requestId,
  requestLogger,
  errorLogger,
  slowRequestLogger,
  usageLogger,
  requestIdFromUser,
  validateRequestId,
  addRequestContextHeaders,
  ensureRequestId,
  chainRequestId,
  getRequestContext,
  getRequestTiming,
  isRequestSlow,
  getActiveRequests,

  // Upload
  upload,
  configureUpload,
  uploadSingle,
  uploadArray,
  uploadFields,
  uploadImage,
  uploadVideo,
  uploadDocument,
};

// Export individual functions for direct imports
export {
  // Auth
  authenticate,
  authorize,
  optionalAuthenticate,
  requireVerified,
  requireSponsor,
  requireAdmin,

  // Error handling
  notFound,
  errorHandler,
  catchAsync,
  ApiError,
  handleValidationError,
  handleDatabaseError,
  handleRateLimitError,

  // Validation
  validate,
  validateBody,
  validateQuery,
  validateParams,
  sanitize,

  // Rate limiting
  rateLimit,
  apiRateLimiter,
  authRateLimiter,
  strictRateLimiter,
  publicRateLimiter,
  uploadRateLimiter,
  ipRateLimiter,
  userRateLimiter,

  // CORS
  cors,
  corsWithOptions,

  // Compression
  compress,
  forceCompression,
  noCompression,
  skipCompressionForTypes,

  // Security
  securityHeaders,
  strictSecurity,
  disableSecurity,

  // Logging & Request ID
  requestId,
  requestLogger,
  errorLogger,
  slowRequestLogger,
  usageLogger,
  requestIdFromUser,
  validateRequestId,
  addRequestContextHeaders,
  ensureRequestId,
  chainRequestId,
  getRequestContext,
  getRequestTiming,
  isRequestSlow,
  getActiveRequests,

  // Upload
  upload,
  configureUpload,
  uploadSingle,
  uploadArray,
  uploadFields,
  uploadImage,
  uploadVideo,
  uploadDocument,
};

export default middleware;