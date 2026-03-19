/**
 * Error codes for VIRAZ platform
 * Based on ApiErrorCode enum from api.types.ts
 */

import { ApiErrorCode } from '../types/api.types';

// Error categories for grouping
export const ERROR_CATEGORIES = {
  AUTH: 'Authentication',
  VALIDATION: 'Validation',
  RESOURCE: 'Resource',
  BUSINESS: 'Business Logic',
  PAYMENT: 'Payment',
  FILE: 'File Upload',
  RATE_LIMIT: 'Rate Limiting',
  SYSTEM: 'System',
  AI: 'AI/ML',
} as const;

// Error code to HTTP status mapping
export const ERROR_HTTP_STATUS: Record<ApiErrorCode, number> = {
  // Authentication errors (401, 403)
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.INVALID_CREDENTIALS]: 401,
  [ApiErrorCode.TOKEN_EXPIRED]: 401,
  [ApiErrorCode.INVALID_TOKEN]: 401,
  [ApiErrorCode.TOKEN_REVOKED]: 401,
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ApiErrorCode.ACCOUNT_LOCKED]: 403,
  [ApiErrorCode.ACCOUNT_NOT_VERIFIED]: 403,
  [ApiErrorCode.ACCOUNT_SUSPENDED]: 403,
  [ApiErrorCode.ACCOUNT_BANNED]: 403,
  [ApiErrorCode.TWO_FACTOR_REQUIRED]: 403,
  [ApiErrorCode.INVALID_2FA_CODE]: 401,

  // Validation errors (400)
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.MISSING_FIELD]: 400,
  [ApiErrorCode.INVALID_FORMAT]: 400,
  [ApiErrorCode.FIELD_TOO_SHORT]: 400,
  [ApiErrorCode.FIELD_TOO_LONG]: 400,
  [ApiErrorCode.FIELD_OUT_OF_RANGE]: 400,
  [ApiErrorCode.INVALID_EMAIL]: 400,
  [ApiErrorCode.INVALID_PHONE]: 400,
  [ApiErrorCode.PASSWORD_TOO_WEAK]: 400,
  [ApiErrorCode.PASSWORDS_DO_NOT_MATCH]: 400,
  [ApiErrorCode.DUPLICATE_VALUE]: 409,

  // Resource errors (404, 409, 410)
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ApiErrorCode.RESOURCE_CONFLICT]: 409,
  [ApiErrorCode.RESOURCE_LOCKED]: 423,
  [ApiErrorCode.RESOURCE_EXPIRED]: 410,
  [ApiErrorCode.RESOURCE_UNAVAILABLE]: 503,
  [ApiErrorCode.INSUFFICIENT_STOCK]: 409,

  // Business logic errors (400, 402, 409)
  [ApiErrorCode.INSUFFICIENT_FUNDS]: 402,
  [ApiErrorCode.WALLET_FROZEN]: 403,
  [ApiErrorCode.DAILY_LIMIT_EXCEEDED]: 429,
  [ApiErrorCode.MONTHLY_LIMIT_EXCEEDED]: 429,
  [ApiErrorCode.CAMPAIGN_NOT_ACTIVE]: 400,
  [ApiErrorCode.CAMPAIGN_ENDED]: 400,
  [ApiErrorCode.CAMPAIGN_BUDGET_EXCEEDED]: 402,
  [ApiErrorCode.ROOM_FULL]: 403,
  [ApiErrorCode.ROOM_ENDED]: 400,
  [ApiErrorCode.ALREADY_JOINED]: 409,
  [ApiErrorCode.ALREADY_VOTED]: 409,
  [ApiErrorCode.CANNOT_SELF_TRANSFER]: 400,
  [ApiErrorCode.MINIMUM_WITHDRAWAL_NOT_MET]: 400,
  [ApiErrorCode.MAXIMUM_WITHDRAWAL_EXCEEDED]: 400,

  // Payment errors (400, 402, 500)
  [ApiErrorCode.PAYMENT_FAILED]: 402,
  [ApiErrorCode.PAYMENT_CANCELLED]: 400,
  [ApiErrorCode.PAYMENT_REFUNDED]: 400,
  [ApiErrorCode.PAYMENT_PENDING]: 202,
  [ApiErrorCode.INVALID_PAYMENT_METHOD]: 400,
  [ApiErrorCode.PAYMENT_PROVIDER_ERROR]: 502,

  // File upload errors (400, 413)
  [ApiErrorCode.FILE_TOO_LARGE]: 413,
  [ApiErrorCode.INVALID_FILE_TYPE]: 400,
  [ApiErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ApiErrorCode.FILE_NOT_FOUND]: 404,

  // Rate limiting errors (429)
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ApiErrorCode.CONCURRENT_REQUESTS_LIMIT]: 429,

  // System errors (500, 503)
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.CACHE_ERROR]: 500,
  [ApiErrorCode.QUEUE_ERROR]: 500,
  [ApiErrorCode.THIRD_PARTY_ERROR]: 502,
  [ApiErrorCode.MAINTENANCE_MODE]: 503,

  // AI errors (500, 503)
  [ApiErrorCode.AI_SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.AI_PROCESSING_ERROR]: 500,
  [ApiErrorCode.INSUFFICIENT_DATA]: 400,
} as const;

// User-friendly error messages
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  // Authentication errors
  [ApiErrorCode.UNAUTHORIZED]: 'Please log in to continue',
  [ApiErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ApiErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ApiErrorCode.INVALID_TOKEN]: 'Invalid authentication token',
  [ApiErrorCode.TOKEN_REVOKED]: 'Session revoked. Please log in again',
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ApiErrorCode.ACCOUNT_LOCKED]: 'Account temporarily locked. Try again later or reset your password',
  [ApiErrorCode.ACCOUNT_NOT_VERIFIED]: 'Please verify your email or phone number first',
  [ApiErrorCode.ACCOUNT_SUSPENDED]: 'Account suspended. Contact support for assistance',
  [ApiErrorCode.ACCOUNT_BANNED]: 'Account banned. This action cannot be undone',
  [ApiErrorCode.TWO_FACTOR_REQUIRED]: 'Two-factor authentication required',
  [ApiErrorCode.INVALID_2FA_CODE]: 'Invalid two-factor authentication code',

  // Validation errors
  [ApiErrorCode.VALIDATION_ERROR]: 'Validation failed',
  [ApiErrorCode.MISSING_FIELD]: 'Required field is missing',
  [ApiErrorCode.INVALID_FORMAT]: 'Invalid format',
  [ApiErrorCode.FIELD_TOO_SHORT]: 'Value is too short',
  [ApiErrorCode.FIELD_TOO_LONG]: 'Value is too long',
  [ApiErrorCode.FIELD_OUT_OF_RANGE]: 'Value is out of range',
  [ApiErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [ApiErrorCode.INVALID_PHONE]: 'Invalid phone number',
  [ApiErrorCode.PASSWORD_TOO_WEAK]: 'Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols',
  [ApiErrorCode.PASSWORDS_DO_NOT_MATCH]: 'Passwords do not match',
  [ApiErrorCode.DUPLICATE_VALUE]: 'This value already exists',

  // Resource errors
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ApiErrorCode.RESOURCE_CONFLICT]: 'Resource conflict',
  [ApiErrorCode.RESOURCE_LOCKED]: 'Resource is locked',
  [ApiErrorCode.RESOURCE_EXPIRED]: 'Resource has expired',
  [ApiErrorCode.RESOURCE_UNAVAILABLE]: 'Resource temporarily unavailable',
  [ApiErrorCode.INSUFFICIENT_STOCK]: 'Insufficient stock',

  // Business logic errors
  [ApiErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient CAP balance',
  [ApiErrorCode.WALLET_FROZEN]: 'Wallet is frozen. Contact support',
  [ApiErrorCode.DAILY_LIMIT_EXCEEDED]: 'Daily limit exceeded',
  [ApiErrorCode.MONTHLY_LIMIT_EXCEEDED]: 'Monthly limit exceeded',
  [ApiErrorCode.CAMPAIGN_NOT_ACTIVE]: 'Campaign is not active',
  [ApiErrorCode.CAMPAIGN_ENDED]: 'Campaign has ended',
  [ApiErrorCode.CAMPAIGN_BUDGET_EXCEEDED]: 'Campaign budget exceeded',
  [ApiErrorCode.ROOM_FULL]: 'Room has reached maximum capacity',
  [ApiErrorCode.ROOM_ENDED]: 'Room has ended',
  [ApiErrorCode.ALREADY_JOINED]: 'Already joined this room',
  [ApiErrorCode.ALREADY_VOTED]: 'Already voted in this poll',
  [ApiErrorCode.CANNOT_SELF_TRANSFER]: 'Cannot transfer CAP to yourself',
  [ApiErrorCode.MINIMUM_WITHDRAWAL_NOT_MET]: 'Minimum withdrawal amount not met',
  [ApiErrorCode.MAXIMUM_WITHDRAWAL_EXCEEDED]: 'Maximum withdrawal amount exceeded',

  // Payment errors
  [ApiErrorCode.PAYMENT_FAILED]: 'Payment failed',
  [ApiErrorCode.PAYMENT_CANCELLED]: 'Payment cancelled',
  [ApiErrorCode.PAYMENT_REFUNDED]: 'Payment has been refunded',
  [ApiErrorCode.PAYMENT_PENDING]: 'Payment is pending',
  [ApiErrorCode.INVALID_PAYMENT_METHOD]: 'Invalid payment method',
  [ApiErrorCode.PAYMENT_PROVIDER_ERROR]: 'Payment provider error',

  // File upload errors
  [ApiErrorCode.FILE_TOO_LARGE]: 'File size too large',
  [ApiErrorCode.INVALID_FILE_TYPE]: 'Invalid file type',
  [ApiErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed',
  [ApiErrorCode.FILE_NOT_FOUND]: 'File not found',

  // Rate limiting errors
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  [ApiErrorCode.CONCURRENT_REQUESTS_LIMIT]: 'Too many concurrent requests',

  // System errors
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ApiErrorCode.DATABASE_ERROR]: 'Database error',
  [ApiErrorCode.CACHE_ERROR]: 'Cache error',
  [ApiErrorCode.QUEUE_ERROR]: 'Queue error',
  [ApiErrorCode.THIRD_PARTY_ERROR]: 'Third-party service error',
  [ApiErrorCode.MAINTENANCE_MODE]: 'System is under maintenance',

  // AI errors
  [ApiErrorCode.AI_SERVICE_UNAVAILABLE]: 'AI service temporarily unavailable',
  [ApiErrorCode.AI_PROCESSING_ERROR]: 'AI processing error',
  [ApiErrorCode.INSUFFICIENT_DATA]: 'Insufficient data for AI processing',
} as const;

// Error resolution steps (helpful for debugging)
export const ERROR_RESOLUTIONS: Partial<Record<ApiErrorCode, string>> = {
  [ApiErrorCode.ACCOUNT_LOCKED]: 'Wait 15 minutes or reset your password',
  [ApiErrorCode.ACCOUNT_NOT_VERIFIED]: 'Check your email or phone for verification code',
  [ApiErrorCode.INSUFFICIENT_FUNDS]: 'Earn more CAP by engaging with ads or deposit funds',
  [ApiErrorCode.DAILY_LIMIT_EXCEEDED]: 'Daily limits reset at midnight UTC',
  [ApiErrorCode.FILE_TOO_LARGE]: 'Compress the file or choose a smaller one',
  [ApiErrorCode.INVALID_FILE_TYPE]: 'Convert file to a supported format',
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'Slow down and try again in a few minutes',
} as const;

// Error groups for client-side handling
export const ERROR_GROUPS = {
  AUTH: Object.values(ApiErrorCode).filter(code => code.startsWith('AUTH')),
  VALIDATION: Object.values(ApiErrorCode).filter(code => code.startsWith('VAL')),
  RESOURCE: Object.values(ApiErrorCode).filter(code => code.startsWith('RES')),
  BUSINESS: Object.values(ApiErrorCode).filter(code => code.startsWith('BIZ')),
  PAYMENT: Object.values(ApiErrorCode).filter(code => code.startsWith('PAY')),
  FILE: Object.values(ApiErrorCode).filter(code => code.startsWith('FILE')),
  RATE_LIMIT: Object.values(ApiErrorCode).filter(code => code.startsWith('RATE')),
  SYSTEM: Object.values(ApiErrorCode).filter(code => code.startsWith('SYS')),
  AI: Object.values(ApiErrorCode).filter(code => code.startsWith('AI')),
} as const;