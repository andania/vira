/**
 * Seed Data - System Settings
 * Initial system configuration settings
 */

import { Prisma } from '@prisma/client';

export const systemSettings: Prisma.SystemSettingsCreateInput[] = [
  // Platform settings
  {
    settingKey: 'platform.name',
    settingValue: 'VIRAZ',
    settingType: 'string',
    description: 'Platform name',
    isPublic: true,
  },
  {
    settingKey: 'platform.url',
    settingValue: 'https://viraz.com',
    settingType: 'string',
    description: 'Platform URL',
    isPublic: true,
  },
  {
    settingKey: 'platform.support_email',
    settingValue: 'support@viraz.com',
    settingType: 'string',
    description: 'Support email address',
    isPublic: true,
  },
  {
    settingKey: 'platform.maintenance_mode',
    settingValue: 'false',
    settingType: 'boolean',
    description: 'Maintenance mode status',
    isPublic: false,
  },

  // CAP economy settings
  {
    settingKey: 'cap.initial_value',
    settingValue: '0.01',
    settingType: 'float',
    description: 'Initial CAP to USD value',
    isPublic: true,
  },
  {
    settingKey: 'cap.decay_rate_12m',
    settingValue: '10',
    settingType: 'integer',
    description: 'Decay rate after 12 months (%)',
    isPublic: true,
  },
  {
    settingKey: 'cap.decay_rate_24m',
    settingValue: '25',
    settingType: 'integer',
    description: 'Decay rate after 24 months (%)',
    isPublic: true,
  },
  {
    settingKey: 'cap.decay_rate_36m',
    settingValue: '50',
    settingType: 'integer',
    description: 'Decay rate after 36 months (%)',
    isPublic: true,
  },
  {
    settingKey: 'cap.stability_reserve_ratio',
    settingValue: '0.1',
    settingType: 'float',
    description: 'Stability reserve ratio (10%)',
    isPublic: false,
  },

  // Withdrawal settings
  {
    settingKey: 'withdrawal.min_amount',
    settingValue: '10',
    settingType: 'integer',
    description: 'Minimum withdrawal amount in USD',
    isPublic: true,
  },
  {
    settingKey: 'withdrawal.max_amount',
    settingValue: '5000',
    settingType: 'integer',
    description: 'Maximum withdrawal amount in USD',
    isPublic: true,
  },
  {
    settingKey: 'withdrawal.fee_percentage',
    settingValue: '2',
    settingType: 'integer',
    description: 'Withdrawal fee percentage',
    isPublic: true,
  },
  {
    settingKey: 'withdrawal.processing_time',
    settingValue: '1-3 business days',
    settingType: 'string',
    description: 'Withdrawal processing time',
    isPublic: true,
  },

  // Deposit settings
  {
    settingKey: 'deposit.min_amount',
    settingValue: '5',
    settingType: 'integer',
    description: 'Minimum deposit amount in USD',
    isPublic: true,
  },
  {
    settingKey: 'deposit.max_amount',
    settingValue: '10000',
    settingType: 'integer',
    description: 'Maximum deposit amount in USD',
    isPublic: true,
  },

  // Verification settings
  {
    settingKey: 'verification.email_required',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Require email verification',
    isPublic: true,
  },
  {
    settingKey: 'verification.phone_required',
    settingValue: 'false',
    settingType: 'boolean',
    description: 'Require phone verification',
    isPublic: true,
  },
  {
    settingKey: 'verification.email_token_expiry',
    settingValue: '24',
    settingType: 'integer',
    description: 'Email verification token expiry (hours)',
    isPublic: false,
  },
  {
    settingKey: 'verification.phone_code_expiry',
    settingValue: '10',
    settingType: 'integer',
    description: 'Phone verification code expiry (minutes)',
    isPublic: false,
  },

  // Security settings
  {
    settingKey: 'security.max_login_attempts',
    settingValue: '5',
    settingType: 'integer',
    description: 'Maximum login attempts before lockout',
    isPublic: false,
  },
  {
    settingKey: 'security.login_lockout_minutes',
    settingValue: '15',
    settingType: 'integer',
    description: 'Login lockout duration in minutes',
    isPublic: false,
  },
  {
    settingKey: 'security.password_min_length',
    settingValue: '8',
    settingType: 'integer',
    description: 'Minimum password length',
    isPublic: true,
  },
  {
    settingKey: 'security.session_timeout_minutes',
    settingValue: '30',
    settingType: 'integer',
    description: 'Session timeout in minutes',
    isPublic: false,
  },

  // Rate limiting
  {
    settingKey: 'ratelimit.public.requests',
    settingValue: '10',
    settingType: 'integer',
    description: 'Public endpoint rate limit (requests per minute)',
    isPublic: false,
  },
  {
    settingKey: 'ratelimit.authenticated.requests',
    settingValue: '100',
    settingType: 'integer',
    description: 'Authenticated endpoint rate limit (requests per minute)',
    isPublic: false,
  },
  {
    settingKey: 'ratelimit.sponsor.requests',
    settingValue: '500',
    settingType: 'integer',
    description: 'Sponsor endpoint rate limit (requests per minute)',
    isPublic: false,
  },
  {
    settingKey: 'ratelimit.admin.requests',
    settingValue: '1000',
    settingType: 'integer',
    description: 'Admin endpoint rate limit (requests per minute)',
    isPublic: false,
  },

  // Feature flags
  {
    settingKey: 'feature.2fa',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable two-factor authentication',
    isPublic: true,
  },
  {
    settingKey: 'feature.push_notifications',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable push notifications',
    isPublic: true,
  },
  {
    settingKey: 'feature.live_streaming',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable live streaming',
    isPublic: true,
  },
  {
    settingKey: 'feature.ai_recommendations',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable AI recommendations',
    isPublic: true,
  },
  {
    settingKey: 'feature.marketplace',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable marketplace',
    isPublic: true,
  },
  {
    settingKey: 'feature.gamification',
    settingValue: 'true',
    settingType: 'boolean',
    description: 'Enable gamification',
    isPublic: true,
  },

  // Commission settings
  {
    settingKey: 'commission.marketplace.seller',
    settingValue: '5',
    settingType: 'integer',
    description: 'Marketplace seller commission (%)',
    isPublic: true,
  },
  {
    settingKey: 'commission.cap_conversion',
    settingValue: '1',
    settingType: 'integer',
    description: 'CAP conversion fee (%)',
    isPublic: true,
  },

  // Email settings
  {
    settingKey: 'email.welcome_subject',
    settingValue: 'Welcome to VIRAZ!',
    settingType: 'string',
    description: 'Welcome email subject',
    isPublic: false,
  },
  {
    settingKey: 'email.verification_subject',
    settingValue: 'Verify Your Email Address',
    settingType: 'string',
    description: 'Email verification subject',
    isPublic: false,
  },
  {
    settingKey: 'email.password_reset_subject',
    settingValue: 'Reset Your Password',
    settingType: 'string',
    description: 'Password reset email subject',
    isPublic: false,
  },

  // SMS settings
  {
    settingKey: 'sms.verification_template',
    settingValue: 'Your VIRAZ verification code is: {{code}}',
    settingType: 'string',
    description: 'SMS verification template',
    isPublic: false,
  },
  {
    settingKey: 'sms.login_alert_template',
    settingValue: 'New login to your VIRAZ account from {{location}}',
    settingType: 'string',
    description: 'Login alert SMS template',
    isPublic: false,
  },

  // Push notification settings
  {
    settingKey: 'push.cap_earned_title',
    settingValue: '🎉 CAP Earned!',
    settingType: 'string',
    description: 'CAP earned notification title',
    isPublic: false,
  },
  {
    settingKey: 'push.live_start_title',
    settingValue: '🔴 Live Now',
    settingType: 'string',
    description: 'Live stream start notification title',
    isPublic: false,
  },
  {
    settingKey: 'push.achievement_title',
    settingValue: '🏆 Achievement Unlocked!',
    settingType: 'string',
    description: 'Achievement unlocked notification title',
    isPublic: false,
  },
];