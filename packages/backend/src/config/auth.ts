/**
 * Authentication Configuration
 * JWT, OAuth, and security settings
 */

import { config } from './index';

export const authConfig = {
  // JWT settings
  jwt: {
    secret: config.jwtSecret,
    refreshSecret: config.jwtRefreshSecret,
    accessExpiry: config.jwtAccessExpiry,
    refreshExpiry: config.jwtRefreshExpiry,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    algorithm: 'HS256' as const,
  },

  // Password settings
  password: {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: config.bcryptRounds,
  },

  // Session settings
  session: {
    maxActiveSessions: 5,
    extendOnActivity: true,
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // 2FA settings
  twoFactor: {
    enabled: config.features.enable2FA,
    methods: ['app', 'sms', 'email'] as const,
    issuer: 'VIRAZ',
    codeLength: 6,
    codeExpiry: 5 * 60 * 1000, // 5 minutes
    backupCodesCount: 10,
  },

  // OAuth providers
  oauth: {
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackUrl: '/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    },
    facebook: {
      appId: config.facebookAppId,
      appSecret: config.facebookAppSecret,
      callbackUrl: '/api/v1/auth/facebook/callback',
      scope: ['email', 'public_profile'],
    },
    apple: {
      clientId: config.appleClientId,
      teamId: config.appleTeamId,
      keyId: config.appleKeyId,
      privateKey: config.applePrivateKey,
      callbackUrl: '/api/v1/auth/apple/callback',
      scope: ['email', 'name'],
    },
  },

  // Rate limiting for auth endpoints
  rateLimits: {
    login: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
    register: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 registrations per hour
    verifyEmail: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 verification attempts per hour
    verifyPhone: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 SMS attempts per hour
    passwordReset: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 reset requests per hour
  },

  // Verification settings
  verification: {
    email: {
      enabled: config.features.enableEmailVerification,
      tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
      codeLength: 6,
    },
    phone: {
      enabled: config.features.enablePhoneVerification,
      tokenExpiry: 10 * 60 * 1000, // 10 minutes
      codeLength: 6,
      maxAttempts: 3,
    },
  },

  // Account security
  security: {
    maxLoginAttempts: config.maxLoginAttempts,
    lockoutTime: config.loginLockoutTime,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    allowMultipleSessions: true,
    enforcePasswordHistory: 5,
    passwordExpiryDays: 90,
  },
};

export default authConfig;