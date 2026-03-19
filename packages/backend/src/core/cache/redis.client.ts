/**
 * Redis Cache Client
 * Singleton pattern for Redis connection with retry logic
 */

import Redis from 'ioredis';
import { logger } from '../logger';
import { config } from '../../config';

// Redis client instance
let redis: Redis;

// Connection options
const connectionOptions = {
  host: config.redisUrl.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(config.redisUrl.split(':')[2] || '6379'),
  password: config.redisPassword,
  db: config.redisDb,
  keyPrefix: config.redisKeyPrefix,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.info(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 10000,
  disconnectTimeout: 5000,
  commandTimeout: 5000,
};

// Initialize Redis client
if (config.nodeEnv === 'production') {
  redis = new Redis(connectionOptions);
} else {
  // In development, use global to prevent multiple instances during hot reload
  if (!(global as any).redis) {
    (global as any).redis = new Redis(connectionOptions);
  }
  redis = (global as any).redis;
}

// Redis event handlers
redis.on('connect', () => {
  logger.info('🔄 Redis connecting...');
});

redis.on('ready', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('❌ Redis error:', error);
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('🔄 Redis reconnecting...');
});

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    logger.info('✅ Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('❌ Redis connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('✅ Redis disconnected successfully');
  } catch (error) {
    logger.error('❌ Error disconnecting Redis:', error);
  }
};

// Cache helper functions
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for key ${key}:`, error);
      return -2;
    }
  },

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get or set cache (memoization)
   */
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  },

  /**
   * Clear all cache
   */
  async flush(): Promise<void> {
    try {
      await redis.flushdb();
      logger.info('✅ Cache flushed successfully');
    } catch (error) {
      logger.error('❌ Error flushing cache:', error);
    }
  },
};

export { redis };
export default redis;