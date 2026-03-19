/**
 * Redis Configuration
 * Cache, session, and queue settings
 */

import { config } from './index';

export const redisConfig = {
  // Connection settings
  url: config.redisUrl,
  password: config.redisPassword,
  db: config.redisDb,
  keyPrefix: config.redisKeyPrefix,

  // Connection pool
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  },

  // Retry strategy
  retryStrategy: {
    maxAttempts: 10,
    initialDelay: 100,
    maxDelay: 3000,
    factor: 2,
  },

  // Cache settings
  cache: {
    defaultTTL: 3600, // 1 hour
    userTTL: 7200, // 2 hours
    sessionTTL: 86400, // 24 hours
    campaignTTL: 1800, // 30 minutes
    roomTTL: 300, // 5 minutes
    feedTTL: 300, // 5 minutes
    leaderboardTTL: 3600, // 1 hour
  },

  // Session settings
  session: {
    prefix: 'sess:',
    ttl: 86400, // 24 hours
    rolling: true,
    touchAfter: 300, // 5 minutes
  },

  // Rate limiting
  rateLimit: {
    prefix: 'rl:',
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.public,
  },

  // Queue settings
  queue: {
    prefix: 'queue:',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  },

  // Pub/Sub settings
  pubsub: {
    prefix: 'ps:',
    channels: {
      userUpdates: 'user:updates',
      roomUpdates: 'room:updates',
      campaignUpdates: 'campaign:updates',
      systemAlerts: 'system:alerts',
    },
  },

  // Monitoring
  monitoring: {
    enabled: true,
    interval: 60, // Check every 60 seconds
    warningThreshold: 1000, // Warning if >1000 commands/sec
    criticalThreshold: 5000, // Critical if >5000 commands/sec
  },
};

export default redisConfig;