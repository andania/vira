/**
 * Auth Middleware Index
 * Exports all authentication-related middleware
 */

export * from './auth.middleware';
export * from './rate-limit.middleware';

// Re-export commonly used middleware with convenient names
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  phoneVerificationRateLimiter,
  otpRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  ipRateLimiter,
  userRateLimiter,
  concurrentLimiter,
} from './rate-limit.middleware';

export const rateLimiters = {
  login: loginRateLimiter,
  register: registerRateLimiter,
  passwordReset: passwordResetRateLimiter,
  emailVerification: emailVerificationRateLimiter,
  phoneVerification: phoneVerificationRateLimiter,
  otp: otpRateLimiter,
  api: apiRateLimiter,
  strict: strictRateLimiter,
  ip: ipRateLimiter,
  user: userRateLimiter,
  concurrent: concurrentLimiter,
};

// Export types
export type { RateLimitConfig } from './rate-limit.middleware';