/**
 * Fraud Detection Service
 * Handles fraud detection and prevention
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { walletService } from '../../wallet/services/wallet.service';

export interface FraudRule {
  id: string;
  name: string;
  ruleType: string;
  conditions: any;
  action: 'flag' | 'block' | 'review' | 'notify';
  priority: number;
  isActive: boolean;
}

export interface FraudAlert {
  id: string;
  alertType: string;
  userId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  score: number;
  details: any;
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive';
  createdAt: Date;
}

export class FraudService {
  /**
   * Analyze transaction for fraud
   */
  async analyzeTransaction(
    userId: string,
    amount: number,
    type: string,
    metadata: any = {}
  ): Promise<{ score: number; reasons: string[]; action: string }> {
    try {
      const reasons: string[] = [];
      let score = 0;

      // Rule 1: Check transaction velocity
      const velocityScore = await this.checkTransactionVelocity(userId);
      score += velocityScore.score;
      if (velocityScore.reason) reasons.push(velocityScore.reason);

      // Rule 2: Check amount anomalies
      const amountScore = await this.checkAmountAnomaly(userId, amount);
      score += amountScore.score;
      if (amountScore.reason) reasons.push(amountScore.reason);

      // Rule 3: Check geographic anomalies
      if (metadata.ipAddress) {
        const geoScore = await this.checkGeographicAnomaly(userId, metadata.ipAddress);
        score += geoScore.score;
        if (geoScore.reason) reasons.push(geoScore.reason);
      }

      // Rule 4: Check device fingerprint
      if (metadata.deviceFingerprint) {
        const deviceScore = await this.checkDeviceAnomaly(userId, metadata.deviceFingerprint);
        score += deviceScore.score;
        if (deviceScore.reason) reasons.push(deviceScore.reason);
      }

      // Rule 5: Check user history
      const historyScore = await this.checkUserHistory(userId);
      score += historyScore.score;
      if (historyScore.reason) reasons.push(historyScore.reason);

      // Determine action based on score
      let action = 'allow';
      if (score >= 80) {
        action = 'block';
      } else if (score >= 60) {
        action = 'review';
      } else if (score >= 40) {
        action = 'flag';
      }

      // Log high-risk transactions
      if (score >= 50) {
        await this.createFraudAlert({
          userId,
          alertType: 'suspicious_transaction',
          score,
          details: {
            amount,
            type,
            reasons,
            metadata,
          },
          ipAddress: metadata.ipAddress,
          deviceFingerprint: metadata.deviceFingerprint,
        });
      }

      return { score, reasons, action };
    } catch (error) {
      logger.error('Error analyzing transaction:', error);
      return { score: 0, reasons: ['Analysis error'], action: 'allow' };
    }
  }

  /**
   * Check transaction velocity
   */
  private async checkTransactionVelocity(userId: string): Promise<{ score: number; reason?: string }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentTransactions = await prisma.capTransaction.count({
      where: {
        wallet: { userId },
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentTransactions > 20) {
      return { score: 30, reason: 'Extreme transaction velocity' };
    } else if (recentTransactions > 10) {
      return { score: 15, reason: 'High transaction velocity' };
    } else if (recentTransactions > 5) {
      return { score: 5, reason: 'Moderate transaction velocity' };
    }

    return { score: 0 };
  }

  /**
   * Check amount anomaly
   */
  private async checkAmountAnomaly(userId: string, amount: number): Promise<{ score: number; reason?: string }> {
    const userStats = await prisma.userStatistics.findUnique({
      where: { userId },
    });

    if (!userStats) {
      return { score: 0 };
    }

    const avgTransaction = userStats.averageTransactionAmount || 0;
    const stdDev = userStats.transactionStdDev || avgTransaction * 0.5;

    if (avgTransaction > 0) {
      const zScore = Math.abs(amount - avgTransaction) / stdDev;

      if (zScore > 5) {
        return { score: 40, reason: 'Extreme amount anomaly' };
      } else if (zScore > 3) {
        return { score: 25, reason: 'Significant amount anomaly' };
      } else if (zScore > 2) {
        return { score: 10, reason: 'Moderate amount anomaly' };
      }
    }

    return { score: 0 };
  }

  /**
   * Check geographic anomaly
   */
  private async checkGeographicAnomaly(
    userId: string,
    ipAddress: string
  ): Promise<{ score: number; reason?: string }> {
    const lastSession = await prisma.userSession.findFirst({
      where: { userId },
      orderBy: { lastActivity: 'desc' },
    });

    if (!lastSession?.ipAddress) {
      return { score: 0 };
    }

    // Get geolocation for both IPs (simplified)
    const oldLocation = await this.getGeoLocation(lastSession.ipAddress);
    const newLocation = await this.getGeoLocation(ipAddress);

    if (!oldLocation || !newLocation) {
      return { score: 0 };
    }

    const distance = this.calculateDistance(
      oldLocation.lat,
      oldLocation.lon,
      newLocation.lat,
      newLocation.lon
    );

    const timeDiff = Date.now() - new Date(lastSession.lastActivity).getTime();
    const hoursSinceLastActivity = timeDiff / (1000 * 60 * 60);

    if (distance > 1000 && hoursSinceLastActivity < 2) {
      return { score: 50, reason: 'Impossible travel detected' };
    } else if (distance > 500 && hoursSinceLastActivity < 4) {
      return { score: 30, reason: 'Suspicious geographic movement' };
    } else if (oldLocation.country !== newLocation.country && hoursSinceLastActivity < 24) {
      return { score: 20, reason: 'Country mismatch' };
    }

    return { score: 0 };
  }

  /**
   * Check device anomaly
   */
  private async checkDeviceAnomaly(
    userId: string,
    deviceFingerprint: string
  ): Promise<{ score: number; reason?: string }> {
    const knownDevices = await prisma.userDevice.findMany({
      where: { userId },
    });

    if (knownDevices.length === 0) {
      return { score: 10, reason: 'New device' };
    }

    const isKnown = knownDevices.some(d => d.deviceFingerprint === deviceFingerprint);

    if (!isKnown) {
      // Check if device is blacklisted
      const blacklisted = await prisma.blacklistedDevice.findUnique({
        where: { deviceFingerprint },
      });

      if (blacklisted) {
        return { score: 80, reason: 'Blacklisted device' };
      }

      return { score: 20, reason: 'New device' };
    }

    return { score: 0 };
  }

  /**
   * Check user history
   */
  private async checkUserHistory(userId: string): Promise<{ score: number; reason?: string }> {
    const [pastFraud, reports, suspiciousActivity] = await Promise.all([
      prisma.fraudAlert.count({
        where: {
          userId,
          status: 'confirmed',
        },
      }),
      prisma.report.count({
        where: {
          reportedUserId: userId,
          status: 'confirmed',
        },
      }),
      prisma.fraudAlert.count({
        where: {
          userId,
          status: 'investigating',
        },
      }),
    ]);

    let score = 0;
    const reasons: string[] = [];

    if (pastFraud > 0) {
      score += pastFraud * 20;
      reasons.push(`${pastFraud} past fraud incidents`);
    }

    if (reports > 2) {
      score += reports * 10;
      reasons.push(`${reports} confirmed reports`);
    }

    if (suspiciousActivity > 0) {
      score += suspiciousActivity * 15;
      reasons.push(`${suspiciousActivity} ongoing investigations`);
    }

    return {
      score: Math.min(score, 100),
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  }

  /**
   * Create fraud alert
   */
  async createFraudAlert(data: {
    userId?: string;
    alertType: string;
    score: number;
    details: any;
    ipAddress?: string;
    deviceFingerprint?: string;
  }) {
    try {
      const alert = await prisma.fraudAlert.create({
        data: {
          userId: data.userId,
          alertType: data.alertType,
          score: data.score,
          details: data.details,
          ipAddress: data.ipAddress,
          deviceFingerprint: data.deviceFingerprint,
          status: data.score >= 80 ? 'confirmed' : 'investigating',
        },
      });

      // Take immediate action for high-risk alerts
      if (data.score >= 80 && data.userId) {
        await this.handleHighRiskAlert(alert);
      }

      // Notify admins
      await this.notifyAdmins(alert);

      logger.info(`Fraud alert created: ${alert.id} (score: ${data.score})`);
      return alert;
    } catch (error) {
      logger.error('Error creating fraud alert:', error);
      throw error;
    }
  }

  /**
   * Handle high-risk alert
   */
  private async handleHighRiskAlert(alert: any) {
    if (alert.userId) {
      // Freeze wallet
      await walletService.freezeWallet(
        alert.userId,
        `Automatically frozen due to fraud alert (score: ${alert.score})`
      );

      // Invalidate sessions
      await prisma.userSession.updateMany({
        where: { userId: alert.userId },
        data: { isActive: false },
      });

      // Notify user
      await notificationService.create({
        userId: alert.userId,
        type: 'SYSTEM',
        priority: 'high',
        title: '🔒 Account Frozen',
        body: 'Your account has been temporarily frozen due to suspicious activity. Please contact support.',
        data: {
          screen: 'support',
          action: 'contact',
        },
      });
    }
  }

  /**
   * Notify admins of fraud alert
   */
  private async notifyAdmins(alert: any) {
    // Get admin users
    const admins = await prisma.user.findMany({
      where: { accountType: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await notificationService.create({
        userId: admin.id,
        type: 'SYSTEM',
        priority: 'high',
        title: '🚨 Fraud Alert',
        body: `New fraud alert (score: ${alert.score}) - ${alert.alertType}`,
        data: {
          screen: 'admin',
          action: 'fraud',
          id: alert.id,
        },
      });
    }
  }

  /**
   * Get fraud alerts
   */
  async getFraudAlerts(
    filters: {
      status?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const {
        status,
        userId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = filters;

      const where: any = {};

      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [alerts, total] = await Promise.all([
        prisma.fraudAlert.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        }),
        prisma.fraudAlert.count({ where }),
      ]);

      return { alerts, total };
    } catch (error) {
      logger.error('Error getting fraud alerts:', error);
      throw error;
    }
  }

  /**
   * Update fraud alert status
   */
  async updateAlertStatus(alertId: string, status: string, notes?: string) {
    try {
      const alert = await prisma.fraudAlert.update({
        where: { id: alertId },
        data: {
          status,
          resolvedAt: status === 'resolved' ? new Date() : undefined,
        },
      });

      // If false positive, unfreeze wallet if it was frozen
      if (status === 'false_positive' && alert.userId) {
        await walletService.unfreezeWallet(alert.userId);
      }

      logger.info(`Fraud alert ${alertId} status updated to ${status}`);
      return alert;
    } catch (error) {
      logger.error('Error updating fraud alert status:', error);
      throw error;
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [total, byStatus, byType, todayCount, avgScore] = await Promise.all([
        prisma.fraudAlert.count(),
        prisma.fraudAlert.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.fraudAlert.groupBy({
          by: ['alertType'],
          _count: true,
          orderBy: {
            _count: {
              alertType: 'desc',
            },
          },
          take: 5,
        }),
        prisma.fraudAlert.count({
          where: {
            createdAt: { gte: today },
          },
        }),
        prisma.fraudAlert.aggregate({
          _avg: { score: true },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        topTypes: byType.map(t => ({
          type: t.alertType,
          count: t._count,
        })),
        today: todayCount,
        averageScore: avgScore._avg.score || 0,
      };
    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      throw error;
    }
  }

  /**
   * Get geo location from IP (mock)
   */
  private async getGeoLocation(ip: string): Promise<{ lat: number; lon: number; country: string } | null> {
    // This would call a geolocation service
    // Mock implementation
    return {
      lat: Math.random() * 180 - 90,
      lon: Math.random() * 360 - 180,
      country: 'US',
    };
  }

  /**
   * Calculate distance between coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get blacklisted items
   */
  async getBlacklistedItems() {
    try {
      const [users, devices, ips] = await Promise.all([
        prisma.blacklistedUser.findMany({
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        }),
        prisma.blacklistedDevice.findMany(),
        prisma.blockedIp.findMany(),
      ]);

      return {
        users,
        devices,
        ips,
      };
    } catch (error) {
      logger.error('Error getting blacklisted items:', error);
      throw error;
    }
  }

  /**
   * Add to blacklist
   */
  async addToBlacklist(type: 'user' | 'device' | 'ip', value: string, reason: string) {
    try {
      switch (type) {
        case 'user':
          await prisma.blacklistedUser.create({
            data: {
              userId: value,
              reason,
            },
          });
          // Ban the user
          await prisma.user.update({
            where: { id: value },
            data: { status: 'BANNED' },
          });
          break;
        case 'device':
          await prisma.blacklistedDevice.create({
            data: {
              deviceFingerprint: value,
              reason,
            },
          });
          break;
        case 'ip':
          await prisma.blockedIp.create({
            data: {
              ipAddress: value,
              reason,
            },
          });
          break;
      }

      logger.info(`Added to blacklist: ${type} - ${value}`);
    } catch (error) {
      logger.error('Error adding to blacklist:', error);
      throw error;
    }
  }

  /**
   * Remove from blacklist
   */
  async removeFromBlacklist(type: 'user' | 'device' | 'ip', value: string) {
    try {
      switch (type) {
        case 'user':
          await prisma.blacklistedUser.delete({
            where: { userId: value },
          });
          // Unban the user
          await prisma.user.update({
            where: { id: value },
            data: { status: 'ACTIVE' },
          });
          break;
        case 'device':
          await prisma.blacklistedDevice.delete({
            where: { deviceFingerprint: value },
          });
          break;
        case 'ip':
          await prisma.blockedIp.delete({
            where: { ipAddress: value },
          });
          break;
      }

      logger.info(`Removed from blacklist: ${type} - ${value}`);
    } catch (error) {
      logger.error('Error removing from blacklist:', error);
      throw error;
    }
  }
}

export const fraudService = new FraudService();