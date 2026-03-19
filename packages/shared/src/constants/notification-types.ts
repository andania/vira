/**
 * Notification types and templates for VIRAZ platform
 */

import { NotificationType, NotificationPriority } from '../types/notification.types';

// Notification type display names
export const NOTIFICATION_TYPE_NAMES: Record<NotificationType, string> = {
  [NotificationType.FINANCIAL]: 'Financial',
  [NotificationType.ENGAGEMENT]: 'Engagement',
  [NotificationType.CAMPAIGN]: 'Campaign',
  [NotificationType.ROOM]: 'Room',
  [NotificationType.ACHIEVEMENT]: 'Achievement',
  [NotificationType.SYSTEM]: 'System',
  [NotificationType.AI]: 'AI Recommendation',
  [NotificationType.SOCIAL]: 'Social',
};

// Default priorities for each notification type
export const NOTIFICATION_DEFAULT_PRIORITIES: Record<NotificationType, NotificationPriority> = {
  [NotificationType.FINANCIAL]: NotificationPriority.HIGH,
  [NotificationType.ENGAGEMENT]: NotificationPriority.MEDIUM,
  [NotificationType.CAMPAIGN]: NotificationPriority.HIGH,
  [NotificationType.ROOM]: NotificationPriority.HIGH,
  [NotificationType.ACHIEVEMENT]: NotificationPriority.MEDIUM,
  [NotificationType.SYSTEM]: NotificationPriority.HIGH,
  [NotificationType.AI]: NotificationPriority.LOW,
  [NotificationType.SOCIAL]: NotificationPriority.MEDIUM,
};

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  // Financial notifications
  CAP_EARNED: {
    type: NotificationType.FINANCIAL,
    title: '🎉 CAP Earned!',
    body: 'You earned {{amount}} CAP from {{action}}',
    data: { screen: 'wallet', action: 'view_transactions' },
  },
  CAP_SPENT: {
    type: NotificationType.FINANCIAL,
    title: '💸 CAP Spent',
    body: 'You spent {{amount}} CAP on {{item}}',
    data: { screen: 'wallet', action: 'view_transactions' },
  },
  DEPOSIT_SUCCESS: {
    type: NotificationType.FINANCIAL,
    title: '✅ Deposit Successful',
    body: 'Your deposit of ${{amount}} has been processed. {{capAmount}} CAP added to your wallet.',
    data: { screen: 'wallet', action: 'view_balance' },
  },
  WITHDRAWAL_SUCCESS: {
    type: NotificationType.FINANCIAL,
    title: '💰 Withdrawal Processed',
    body: 'Your withdrawal of ${{amount}} has been processed. It may take 1-3 business days to arrive.',
    data: { screen: 'wallet', action: 'view_withdrawals' },
  },
  WITHDRAWAL_FAILED: {
    type: NotificationType.FINANCIAL,
    title: '❌ Withdrawal Failed',
    body: 'Your withdrawal of ${{amount}} failed. Reason: {{reason}}',
    data: { screen: 'wallet', action: 'view_withdrawals' },
  },
  CAP_DECAY_WARNING: {
    type: NotificationType.FINANCIAL,
    title: '⚠️ CAP Decay Warning',
    body: 'Your CAP balance will decay by {{percent}}% in {{days}} days due to inactivity. Log in to prevent decay.',
    data: { screen: 'wallet', action: 'view_balance' },
  },
  
  // Engagement notifications
  NEW_LIKE: {
    type: NotificationType.ENGAGEMENT,
    title: '❤️ New Like',
    body: '{{username}} liked your {{contentType}}',
    data: { screen: 'engagement', action: 'view' },
  },
  NEW_COMMENT: {
    type: NotificationType.ENGAGEMENT,
    title: '💬 New Comment',
    body: '{{username}} commented: "{{preview}}"',
    data: { screen: 'engagement', action: 'view' },
  },
  NEW_REPLY: {
    type: NotificationType.ENGAGEMENT,
    title: '↩️ New Reply',
    body: '{{username}} replied to your comment',
    data: { screen: 'engagement', action: 'view' },
  },
  MENTION: {
    type: NotificationType.ENGAGEMENT,
    title: '@ Mention',
    body: '{{username}} mentioned you in a {{contentType}}',
    data: { screen: 'engagement', action: 'view' },
  },
  SUGGESTION_ACCEPTED: {
    type: NotificationType.ENGAGEMENT,
    title: '✨ Suggestion Accepted',
    body: 'Your suggestion for {{brand}} has been accepted! You earned {{capAmount}} CAP.',
    data: { screen: 'engagement', action: 'view_suggestions' },
  },
  
  // Campaign notifications
  CAMPAIGN_START: {
    type: NotificationType.CAMPAIGN,
    title: '🚀 Campaign Started',
    body: 'Your campaign "{{campaignName}}" is now live!',
    data: { screen: 'campaign', action: 'view', id: '{{campaignId}}' },
  },
  CAMPAIGN_END: {
    type: NotificationType.CAMPAIGN,
    title: '🏁 Campaign Ended',
    body: 'Your campaign "{{campaignName}}" has ended. View results: {{impressions}} impressions, {{engagements}} engagements',
    data: { screen: 'campaign', action: 'analytics', id: '{{campaignId}}' },
  },
  CAMPAIGN_APPROVED: {
    type: NotificationType.CAMPAIGN,
    title: '✅ Campaign Approved',
    body: 'Your campaign "{{campaignName}}" has been approved and will start on {{startDate}}',
    data: { screen: 'campaign', action: 'view', id: '{{campaignId}}' },
  },
  CAMPAIGN_REJECTED: {
    type: NotificationType.CAMPAIGN,
    title: '❌ Campaign Rejected',
    body: 'Your campaign "{{campaignName}}" was rejected. Reason: {{reason}}',
    data: { screen: 'campaign', action: 'edit', id: '{{campaignId}}' },
  },
  BUDGET_LOW: {
    type: NotificationType.CAMPAIGN,
    title: '⚠️ Budget Running Low',
    body: 'Your campaign "{{campaignName}}" has used {{percent}}% of its budget. Add funds to continue.',
    data: { screen: 'campaign', action: 'budget', id: '{{campaignId}}' },
  },
  
  // Room notifications
  ROOM_STARTING: {
    type: NotificationType.ROOM,
    title: '🔴 Live Room Starting',
    body: '{{roomName}} with {{hostName}} starts in {{minutes}} minutes!',
    data: { screen: 'room', action: 'join', id: '{{roomId}}' },
  },
  ROOM_INVITE: {
    type: NotificationType.ROOM,
    title: '📨 Room Invitation',
    body: '{{username}} invited you to join "{{roomName}}"',
    data: { screen: 'room', action: 'join', id: '{{roomId}}' },
  },
  HOST_MENTION: {
    type: NotificationType.ROOM,
    title: '🎤 Host Mention',
    body: 'The host mentioned you in "{{roomName}}"',
    data: { screen: 'room', action: 'view', id: '{{roomId}}' },
  },
  ROOM_MILESTONE: {
    type: NotificationType.ROOM,
    title: '🎉 Room Milestone',
    body: '{{roomName}} just reached {{count}} participants!',
    data: { screen: 'room', action: 'join', id: '{{roomId}}' },
  },
  
  // Achievement notifications
  LEVEL_UP: {
    type: NotificationType.ACHIEVEMENT,
    title: '⬆️ Level Up!',
    body: 'Congratulations! You reached level {{level}}: {{rankName}}',
    data: { screen: 'profile', action: 'achievements' },
  },
  ACHIEVEMENT_EARNED: {
    type: NotificationType.ACHIEVEMENT,
    title: '🏆 Achievement Unlocked',
    body: 'You earned the "{{achievementName}}" achievement!',
    data: { screen: 'profile', action: 'achievements' },
  },
  BADGE_EARNED: {
    type: NotificationType.ACHIEVEMENT,
    title: '🎖️ New Badge',
    body: 'You earned the "{{badgeName}}" badge!',
    data: { screen: 'profile', action: 'badges' },
  },
  CHALLENGE_COMPLETE: {
    type: NotificationType.ACHIEVEMENT,
    title: '✅ Challenge Complete',
    body: 'You completed the "{{challengeName}}" challenge and earned {{reward}} CAP!',
    data: { screen: 'challenges', action: 'view' },
  },
  LEADERBOARD_RANK: {
    type: NotificationType.ACHIEVEMENT,
    title: '📊 Leaderboard Update',
    body: 'You are now #{{rank}} on the {{leaderboardType}} leaderboard!',
    data: { screen: 'leaderboard', action: 'view' },
  },
  
  // System notifications
  ACCOUNT_VERIFIED: {
    type: NotificationType.SYSTEM,
    title: '✅ Account Verified',
    body: 'Your account has been successfully verified. You can now access all features.',
    data: { screen: 'profile', action: 'settings' },
  },
  PASSWORD_CHANGED: {
    type: NotificationType.SYSTEM,
    title: '🔐 Password Changed',
    body: 'Your password was successfully changed. If you did not request this, please contact support immediately.',
    data: { screen: 'security', action: 'alerts' },
  },
  SUSPICIOUS_LOGIN: {
    type: NotificationType.SYSTEM,
    title: '⚠️ Suspicious Login Detected',
    body: 'New login from {{location}} on {{device}}. If this wasn\'t you, secure your account immediately.',
    data: { screen: 'security', action: 'alerts' },
    priority: NotificationPriority.HIGH,
  },
  MAINTENANCE_ALERT: {
    type: NotificationType.SYSTEM,
    title: '🔧 Scheduled Maintenance',
    body: 'VIRAZ will be undergoing maintenance on {{date}} from {{startTime}} to {{endTime}}.',
    data: { screen: 'home', action: 'alerts' },
  },
  
  // AI notifications
  AI_RECOMMENDATION: {
    type: NotificationType.AI,
    title: '🤖 Recommended for You',
    body: '{{recommendation}}',
    data: { screen: 'billboard', action: 'recommended' },
  },
  TRENDING_ALERT: {
    type: NotificationType.AI,
    title: '🔥 Trending Now',
    body: '{{contentName}} is trending in your area!',
    data: { screen: 'billboard', action: 'trending' },
  },
  PERSONALIZED_OFFER: {
    type: NotificationType.AI,
    title: '🎁 Special Offer',
    body: '{{brandName}} has a personalized offer just for you: {{offer}}',
    data: { screen: 'campaign', action: 'view', id: '{{campaignId}}' },
  },
  
  // Social notifications
  NEW_FOLLOWER: {
    type: NotificationType.SOCIAL,
    title: '👥 New Follower',
    body: '{{username}} started following you',
    data: { screen: 'profile', action: 'followers', id: '{{userId}}' },
  },
  FRIEND_JOINED: {
    type: NotificationType.SOCIAL,
    title: '👋 Friend Joined',
    body: '{{username}} just joined VIRAZ! Say hello?',
    data: { screen: 'profile', action: 'view', id: '{{userId}}' },
  },
  REFERRAL_BONUS: {
    type: NotificationType.SOCIAL,
    title: '🎁 Referral Bonus',
    body: 'You earned {{amount}} CAP because {{username}} joined VIRAZ!',
    data: { screen: 'wallet', action: 'view_transactions' },
  },
} as const;

// Email notification templates
export const EMAIL_TEMPLATES = {
  WELCOME: {
    subject: 'Welcome to VIRAZ!',
    template: 'welcome',
  },
  VERIFY_EMAIL: {
    subject: 'Verify Your Email Address',
    template: 'verification',
  },
  PASSWORD_RESET: {
    subject: 'Reset Your Password',
    template: 'password-reset',
  },
  WEEKLY_DIGEST: {
    subject: 'Your VIRAZ Weekly Digest',
    template: 'weekly-digest',
  },
  CAP_SUMMARY: {
    subject: 'CAP Earnings Summary',
    template: 'cap-summary',
  },
  SECURITY_ALERT: {
    subject: 'Security Alert: {{action}}',
    template: 'security-alert',
  },
} as const;

// SMS notification templates
export const SMS_TEMPLATES = {
  VERIFICATION: {
    template: 'Your VIRAZ verification code is: {{code}}',
  },
  LOGIN_ALERT: {
    template: 'New login to VIRAZ from {{location}}',
  },
  WITHDRAWAL: {
    template: 'Your withdrawal of ${{amount}} has been processed',
  },
  LIVE_START: {
    template: '🔴 {{roomName}} is live now! Join at {{url}}',
  },
} as const;

// Push notification channels
export const PUSH_CHANNELS = {
  DEFAULT: 'default',
  FINANCIAL: 'financial',
  SOCIAL: 'social',
  PROMOTIONAL: 'promotional',
} as const;

// Notification quiet hours
export const DEFAULT_QUIET_HOURS = {
  start: '22:00', // 10 PM
  end: '08:00', // 8 AM
} as const;

// Re-engagement strategies (based on PRD Section 2.13.7)
export const RE_ENGAGEMENT_STRATEGIES = {
  '3_days': {
    channel: 'push',
    message: '🔥 New campaigns from your favorite brands are waiting!',
    incentive: null,
  },
  '7_days': {
    channel: 'email',
    message: '🎁 You have {{capAmount}} CAP waiting to be earned!',
    incentive: { type: 'bonus', amount: 50 },
  },
  '14_days': {
    channel: 'email+sms',
    message: '💰 Don\'t let your CAP decay! Log in to prevent loss.',
    incentive: { type: 'decay-protection', days: 30 },
  },
  '30_days': {
    channel: 'all',
    message: '👋 We miss you! Here\'s 100 CAP to welcome you back.',
    incentive: { type: 'bonus', amount: 100 },
  },
} as const;