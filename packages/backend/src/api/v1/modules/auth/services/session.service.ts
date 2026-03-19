/**
 * Session Service
 * Handles user session management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addHours } from '@viraz/shared';

export interface SessionInfo {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  deviceInfo?: {
    type?: string;
    brand?: string;
    model?: string;
    os?: string;
    browser?: string;
  };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export class SessionService {
  /**
   * Create new session
   */
  async createSession(
    userId: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
    }
  ): Promise<SessionInfo> {
    try {
      const { ipAddress, userAgent, rememberMe = false } = data;

      // Generate tokens
      const sessionToken = uuidv4();
      const refreshToken = uuidv4();

      // Calculate expiry
      const expiresIn = rememberMe ? 30 : 7; // days
      const expiresAt = addDays(new Date(), expiresIn);

      // Get location from IP
      const location = await this.getLocationFromIP(ipAddress);

      // Parse user agent for device info
      const deviceInfo = this.parseUserAgent(userAgent);

      // Create session
      const session = await prisma.userSession.create({
        data: {
          userId,
          sessionToken,
          refreshToken,
          ipAddress,
          userAgent,
          location: location as any,
          deviceInfo: deviceInfo as any,
          expiresAt,
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Store in Redis for quick access
      await this.cacheSession(session);

      logger.info(`Session created for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session by token
   */
  async getSessionByToken(sessionToken: string): Promise<SessionInfo | null> {
    try {
      // Try Redis first
      const cached = await redis.get(`session:token:${sessionToken}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
      });

      if (session && session.isActive && session.expiresAt > new Date()) {
        await this.cacheSession(session);
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Error getting session by token:', error);
      return null;
    }
  }

  /**
   * Get session by refresh token
   */
  async getSessionByRefreshToken(refreshToken: string): Promise<SessionInfo | null> {
    try {
      // Try Redis first
      const cached = await redis.get(`session:refresh:${refreshToken}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const session = await prisma.userSession.findFirst({
        where: { refreshToken },
      });

      if (session && session.isActive && session.expiresAt > new Date()) {
        await this.cacheSession(session);
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Error getting session by refresh token:', error);
      return null;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivity: 'desc' },
      });

      return sessions;
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActivity: new Date() },
      });

      // Update cache if exists
      const session = await prisma.userSession.findUnique({
        where: { id: sessionId },
      });

      if (session) {
        await this.cacheSession(session);
      }
    } catch (error) {
      logger.error('Error updating session activity:', error);
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await prisma.userSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (session) {
        await prisma.userSession.update({
          where: { id: sessionId },
          data: { isActive: false },
        });

        // Remove from cache
        await redis.del(`session:token:${session.sessionToken}`);
        await redis.del(`session:refresh:${session.refreshToken}`);
      }
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true,
          ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
        },
      });

      for (const session of sessions) {
        await this.revokeSession(session.id, userId);
      }
    } catch (error) {
      logger.error('Error revoking all user sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.userSession.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: { isActive: false },
      });

      logger.info(`Cleaned up ${result.count} expired sessions`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  /**
   * Cache session in Redis
   */
  private async cacheSession(session: any): Promise<void> {
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    
    if (ttl > 0) {
      await redis.setex(
        `session:token:${session.sessionToken}`,
        ttl,
        JSON.stringify(session)
      );
      await redis.setex(
        `session:refresh:${session.refreshToken}`,
        ttl,
        JSON.stringify(session)
      );
    }
  }

  /**
   * Get location from IP address
   */
  private async getLocationFromIP(ip?: string): Promise<any> {
    if (!ip) return null;

    try {
      // Try cache first
      const cached = await redis.get(`geo:${ip}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Mock geolocation (in production, use a geolocation service)
      const location = {
        country: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
      };

      await redis.setex(`geo:${ip}`, 86400, JSON.stringify(location));
      return location;
    } catch (error) {
      logger.error('Error getting location from IP:', error);
      return null;
    }
  }

  /**
   * Parse user agent for device info
   */
  private parseUserAgent(userAgent?: string): any {
    if (!userAgent) return null;

    // Basic parsing - in production, use a proper UA parser library
    const deviceInfo: any = {};

    if (userAgent.includes('Mobile')) {
      deviceInfo.type = 'mobile';
    } else if (userAgent.includes('Tablet')) {
      deviceInfo.type = 'tablet';
    } else {
      deviceInfo.type = 'desktop';
    }

    if (userAgent.includes('Windows')) {
      deviceInfo.os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      deviceInfo.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      deviceInfo.os = 'Linux';
    } else if (userAgent.includes('Android')) {
      deviceInfo.os = 'Android';
    } else if (userAgent.includes('iOS')) {
      deviceInfo.os = 'iOS';
    }

    if (userAgent.includes('Chrome')) {
      deviceInfo.browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo.browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      deviceInfo.browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      deviceInfo.browser = 'Edge';
    }

    return deviceInfo;
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<boolean> {
    const session = await this.getSessionByToken(sessionToken);
    return !!session;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<any> {
    const sessions = await this.getUserSessions(userId);
    
    const deviceStats: Record<string, number> = {};
    const browserStats: Record<string, number> = {};

    for (const session of sessions) {
      const deviceInfo = session.deviceInfo as any;
      if (deviceInfo?.type) {
        deviceStats[deviceInfo.type] = (deviceStats[deviceInfo.type] || 0) + 1;
      }
      if (deviceInfo?.browser) {
        browserStats[deviceInfo.browser] = (browserStats[deviceInfo.browser] || 0) + 1;
      }
    }

    return {
      total: sessions.length,
      devices: deviceStats,
      browsers: browserStats,
    };
  }

  /**
   * Terminate all expired sessions
   */
  async terminateExpiredSessions(): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });
  }
}

export const sessionService = new SessionService();