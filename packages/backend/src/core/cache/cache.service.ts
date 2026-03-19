/**
 * Cache Service
 * Higher-level caching operations for different data types
 */

import { cache } from './redis.client';
import { logger } from '../logger';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheService {
  private readonly defaultTTL = 3600; // 1 hour

  /**
   * Cache user data
   */
  async cacheUser(userId: string, data: any, options: CacheOptions = {}) {
    const key = `user:${userId}`;
    const ttl = options.ttl || this.defaultTTL;
    await cache.set(key, data, ttl);
    
    if (options.tags) {
      await this.tagKey(key, options.tags);
    }
  }

  /**
   * Get cached user
   */
  async getUser(userId: string) {
    return cache.get(`user:${userId}`);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string) {
    await cache.del(`user:${userId}`);
    await cache.delPattern(`user:${userId}:*`);
  }

  /**
   * Cache session
   */
  async cacheSession(sessionId: string, data: any, ttl: number = 86400) { // 24 hours
    await cache.set(`session:${sessionId}`, data, ttl);
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string) {
    return cache.get(`session:${sessionId}`);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string) {
    await cache.del(`session:${sessionId}`);
  }

  /**
   * Cache campaign data
   */
  async cacheCampaign(campaignId: string, data: any, options: CacheOptions = {}) {
    const key = `campaign:${campaignId}`;
    const ttl = options.ttl || this.defaultTTL;
    await cache.set(key, data, ttl);
    
    if (options.tags) {
      await this.tagKey(key, options.tags);
    }
  }

  /**
   * Get cached campaign
   */
  async getCampaign(campaignId: string) {
    return cache.get(`campaign:${campaignId}`);
  }

  /**
   * Invalidate campaign cache
   */
  async invalidateCampaign(campaignId: string) {
    await cache.del(`campaign:${campaignId}`);
    await cache.delPattern(`campaign:${campaignId}:*`);
  }

  /**
   * Cache room data
   */
  async cacheRoom(roomId: string, data: any, options: CacheOptions = {}) {
    const key = `room:${roomId}`;
    const ttl = options.ttl || 300; // 5 minutes default for rooms (real-time)
    await cache.set(key, data, ttl);
    
    if (options.tags) {
      await this.tagKey(key, options.tags);
    }
  }

  /**
   * Get cached room
   */
  async getRoom(roomId: string) {
    return cache.get(`room:${roomId}`);
  }

  /**
   * Invalidate room cache
   */
  async invalidateRoom(roomId: string) {
    await cache.del(`room:${roomId}`);
    await cache.delPattern(`room:${roomId}:*`);
  }

  /**
   * Cache product data
   */
  async cacheProduct(productId: string, data: any, options: CacheOptions = {}) {
    const key = `product:${productId}`;
    const ttl = options.ttl || this.defaultTTL;
    await cache.set(key, data, ttl);
    
    if (options.tags) {
      await this.tagKey(key, options.tags);
    }
  }

  /**
   * Get cached product
   */
  async getProduct(productId: string) {
    return cache.get(`product:${productId}`);
  }

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string) {
    await cache.del(`product:${productId}`);
    await cache.delPattern(`product:${productId}:*`);
  }

  /**
   * Cache rate limit
   */
  async cacheRateLimit(key: string, limit: number, ttl: number = 60) {
    const current = await cache.incr(`ratelimit:${key}`);
    if (current === 1) {
      await cache.set(`ratelimit:${key}`, current, ttl);
    }
    return current;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(key: string, limit: number): Promise<boolean> {
    const current = await cache.get<number>(`ratelimit:${key}`);
    return !current || current < limit;
  }

  /**
   * Get rate limit remaining
   */
  async getRateLimitRemaining(key: string, limit: number): Promise<number> {
    const current = await cache.get<number>(`ratelimit:${key}`);
    return current ? Math.max(0, limit - current) : limit;
  }

  /**
   * Cache leaderboard
   */
  async cacheLeaderboard(type: string, data: any[], ttl: number = 3600) {
    await cache.set(`leaderboard:${type}`, data, ttl);
  }

  /**
   * Get cached leaderboard
   */
  async getLeaderboard(type: string) {
    return cache.get(`leaderboard:${type}`);
  }

  /**
   * Cache billboard feed for user
   */
  async cacheUserFeed(userId: string, data: any[], ttl: number = 300) { // 5 minutes
    await cache.set(`feed:${userId}`, data, ttl);
  }

  /**
   * Get cached user feed
   */
  async getUserFeed(userId: string) {
    return cache.get(`feed:${userId}`);
  }

  /**
   * Invalidate user feed
   */
  async invalidateUserFeed(userId: string) {
    await cache.del(`feed:${userId}`);
  }

  /**
   * Tag a key for group invalidation
   */
  private async tagKey(key: string, tags: string[]) {
    for (const tag of tags) {
      await cache.sadd(`tag:${tag}`, key);
    }
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: string) {
    const keys = await cache.get<string[]>(`tag:${tag}`);
    if (keys && Array.isArray(keys)) {
      for (const key of keys) {
        await cache.del(key);
      }
    }
    await cache.del(`tag:${tag}`);
  }

  /**
   * Clear all cache
   */
  async clear() {
    await cache.flush();
  }
}

export const cacheService = new CacheService();
export default cacheService;