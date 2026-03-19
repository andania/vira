/**
 * Push Notification Configuration
 * Firebase Cloud Messaging settings
 */

import { config } from './index';

export const pushConfig = {
  // Provider settings
  provider: 'firebase', // firebase, onesignal

  // Firebase Cloud Messaging
  firebase: {
    projectId: config.firebaseProjectId,
    privateKey: config.firebasePrivateKey,
    clientEmail: config.firebaseClientEmail,
    databaseURL: process.env.FIREBASE_DATABASE_URL,

    // Android specific
    android: {
      priority: 'high',
      ttl: 3600, // 1 hour
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId: 'viraz_default',
      },
    },

    // iOS specific
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
        },
      },
    },

    // Web specific
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
      },
    },
  },

  // OneSignal (alternative)
  onesignal: {
    appId: process.env.ONESIGNAL_APP_ID,
    apiKey: process.env.ONESIGNAL_API_KEY,
    safariWebId: process.env.ONESIGNAL_SAFARI_ID,
  },

  // Push notification templates
  templates: {
    capEarned: {
      title: '🎉 CAP Earned!',
      body: 'You earned {{amount}} CAP from {{action}}',
      data: { screen: 'wallet' },
    },
    newFollower: {
      title: '👥 New Follower',
      body: '{{username}} started following you',
      data: { screen: 'profile' },
    },
    comment: {
      title: '💬 New Comment',
      body: '{{username}} commented: "{{preview}}"',
      data: { screen: 'engagement' },
    },
    like: {
      title: '❤️ New Like',
      body: '{{username}} liked your {{contentType}}',
      data: { screen: 'engagement' },
    },
    roomStart: {
      title: '🔴 Live Now',
      body: '{{roomName}} with {{hostName}} is live!',
      data: { screen: 'room' },
    },
    roomInvite: {
      title: '📨 Room Invitation',
      body: '{{username}} invited you to join {{roomName}}',
      data: { screen: 'room' },
    },
    achievement: {
      title: '🏆 Achievement Unlocked!',
      body: 'You earned "{{achievementName}}"',
      data: { screen: 'achievements' },
    },
    levelUp: {
      title: '⬆️ Level Up!',
      body: 'You reached level {{level}}: {{rankName}}',
      data: { screen: 'profile' },
    },
    campaignUpdate: {
      title: '📊 Campaign Update',
      body: '{{campaignName}}: {{update}}',
      data: { screen: 'campaign' },
    },
    depositSuccess: {
      title: '✅ Deposit Successful',
      body: '${{amount}} added to your wallet',
      data: { screen: 'wallet' },
    },
    withdrawalSuccess: {
      title: '💰 Withdrawal Processed',
      body: 'Your withdrawal of ${{amount}} is on its way',
      data: { screen: 'wallet' },
    },
    systemAlert: {
      title: '⚠️ System Alert',
      body: '{{message}}',
      data: { screen: 'alerts' },
      priority: 'high',
    },
  },

  // Queue settings
  queue: {
    enabled: true,
    concurrent: 20,
    retryAttempts: 3,
    retryDelay: 30, // 30 seconds
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    maxPerUser: 100, // Max 100 push notifications per user per day
    maxPerDevice: 50, // Max 50 per device per day
  },

  // Device management
  devices: {
    maxPerUser: 10,
    inactiveThreshold: 30, // Days before marking device inactive
    pruneInactive: true,
  },

  // Topics / Segments
  topics: {
    all: 'all',
    users: 'users',
    sponsors: 'sponsors',
    byInterest: 'interest_', // Prefix for interest-based topics
    byLocation: 'location_', // Prefix for location-based topics
  },

  // Testing
  testMode: config.nodeEnv === 'development',
  dryRun: config.nodeEnv === 'development',
  logToConsole: config.nodeEnv === 'development',
};

export default pushConfig;