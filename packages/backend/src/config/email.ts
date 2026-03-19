/**
 * Email Configuration
 * SMTP settings and email templates
 */

import { config } from './index';

export const emailConfig = {
  // SMTP settings
  smtp: {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  },

  // Default sender
  from: {
    email: config.smtpFrom,
    name: config.smtpFromName,
  },

  // Reply-to address
  replyTo: {
    email: 'support@viraz.com',
    name: 'VIRAZ Support',
  },

  // Email templates
  templates: {
    welcome: {
      subject: 'Welcome to VIRAZ!',
      template: 'welcome',
      variables: ['name', 'username'],
    },
    verification: {
      subject: 'Verify Your Email Address',
      template: 'verification',
      variables: ['name', 'code', 'link'],
    },
    passwordReset: {
      subject: 'Reset Your Password',
      template: 'password-reset',
      variables: ['name', 'link'],
    },
    capEarned: {
      subject: '🎉 You Earned CAP!',
      template: 'cap-earned',
      variables: ['name', 'amount', 'action', 'total'],
    },
    withdrawal: {
      subject: 'Withdrawal Processed',
      template: 'withdrawal',
      variables: ['name', 'amount', 'status', 'estimatedDate'],
    },
    deposit: {
      subject: 'Deposit Confirmed',
      template: 'deposit',
      variables: ['name', 'amount', 'capAmount', 'balance'],
    },
    campaignStart: {
      subject: '🚀 Campaign Started',
      template: 'campaign-start',
      variables: ['name', 'campaignName', 'startDate', 'endDate'],
    },
    campaignEnd: {
      subject: '🏁 Campaign Ended',
      template: 'campaign-end',
      variables: ['name', 'campaignName', 'impressions', 'engagements', 'roi'],
    },
    roomInvite: {
      subject: 'You\'re Invited to a Room!',
      template: 'room-invite',
      variables: ['inviter', 'roomName', 'brand', 'link'],
    },
    achievement: {
      subject: '🏆 Achievement Unlocked!',
      template: 'achievement',
      variables: ['name', 'achievement', 'description', 'reward'],
    },
    securityAlert: {
      subject: '🔐 Security Alert',
      template: 'security-alert',
      variables: ['name', 'event', 'location', 'device', 'time'],
    },
    reEngagement: {
      subject: '👋 We Miss You at VIRAZ!',
      template: 're-engagement',
      variables: ['name', 'daysAway', 'capWaiting', 'incentive'],
    },
    weeklyDigest: {
      subject: 'Your VIRAZ Weekly Digest',
      template: 'weekly-digest',
      variables: ['name', 'capEarned', 'engagements', 'topBrands', 'achievements'],
    },
  },

  // Queue settings
  queue: {
    enabled: true,
    concurrent: 5,
    retryAttempts: 3,
    retryDelay: 60, // 60 seconds
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    maxPerUser: 50, // Max 50 emails per user per day
    maxPerHour: 1000, // Max 1000 emails per hour globally
    maxPerDay: 10000, // Max 10000 emails per day
  },

  // Bounce handling
  bounce: {
    enabled: true,
    maxBounces: 3,
    actionAfterMax: 'mark_inactive',
    checkInterval: 60 * 60, // Check every hour
  },

  // Testing
  testMode: config.nodeEnv === 'development',
  previewEmails: config.nodeEnv === 'development',
  logToConsole: config.nodeEnv === 'development',
};

export default emailConfig;