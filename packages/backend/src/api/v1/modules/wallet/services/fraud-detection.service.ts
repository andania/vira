/**
 * Fraud Detection Service
 * Detects and prevents fraudulent transactions and activities
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { walletService } from './wallet.service';

export interface FraudScore {
  score: number; // 0-100 (higher = more likely fraud)
  reasons: string[];
  confidence: number;
  action: 'allow' | 'flag' | 'block' | 'review';
}

export interface TransactionAnalysis {
  transactionId: string;
  userId: string;
  amount: number;
  type: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  timestamp: Date;
}

export class FraudDetectionService {
  /**
   * Analyze transaction for fraud
   */
  async analyzeTransaction(
    userId: string,
    amount: number,
    type: string,
    metadata: any = {}
  ): Promise<FraudScore> {
    try {
      const reasons: string[] = [];
      let score = 0;
      let confidence = 1.0;

      // Rule 1: Check transaction velocity
      const velocityScore = await this.checkTransactionVelocity(userId);
      score += velocityScore.score;
      if (velocityScore.reason) reasons.push(velocityScore.reason);
      confidence *= velocityScore.confidence;

      // Rule 2: Check amount anomalies
      const amountScore = await this.checkAmountAnomaly(userId, amount, type);
      score += amountScore.score;
      if (amountScore.reason) reasons.push(amountScore.reason);
      confidence *= amountScore.confidence;

      // Rule 3: Check geographic anomalies
      if (metadata.ipAddress) {
        const geoScore = await this.checkGeographicAnomaly(userId, metadata.ipAddress);
        score += geoScore.score;
        if (geoScore.reason) reasons.push(geoScore.reason);
        confidence *= geoScore.confidence;
      }

      // Rule 4: Check device fingerprint
      if (metadata.deviceFingerprint) {
        const deviceScore = await this.checkDeviceAnomaly(userId, metadata.deviceFingerprint);
        score += deviceScore.score;
        if (deviceScore.reason) reasons.push(deviceScore.reason);
        confidence *= deviceScore.confidence;
      }

      // Rule 5: Check against known fraud patterns
      const patternScore = await this.checkFraudPatterns(userId, amount, type);
      score += patternScore.score;
      if (patternScore.reason) reasons.push(patternScore.reason);
      confidence *= patternScore.confidence;

      // Determine action based on score
      let action: 'allow' | 'flag' | 'block' | 'review' = 'allow';
      
      if (score >= 80) {
        action = 'block';
      } else if (score >= 60) {
        action = 'review';
      } else if (score >= 40) {
        action = 'flag';
      }

      // Log high-risk transactions
      if (score >= 50) {
        await this.logSuspiciousActivity(userId, {
          score,
          reasons,
          amount,
          type,
          metadata,
          action,
        });
      }

      return {
        score,
        reasons,
        confidence,
        action,
      };
    } catch (error) {
      logger.error('Error analyzing transaction:', error);
      // On error, allow transaction but flag for review
      return {
        score: 30,
        reasons: ['Analysis error'],
        confidence: 0.5,
        action: 'flag',
      };
    }
  }

  /**
   * Check transaction velocity (too many transactions in short time)
   */
  private async checkTransactionVelocity(userId: string): Promise<{ score: number; reason?: string; confidence: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [hourlyCount, dailyCount] = await Promise.all([
      prisma.capTransaction.count({
        where: {
          wallet: { userId },
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.capTransaction.count({
        where: {
          wallet: { userId },
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    let score = 0;
    let reason: string | undefined;

    if (hourlyCount > 10) {
      score += 30;
      reason = 'Unusual transaction velocity (10+ per hour)';
    } else if (hourlyCount > 5) {
      score += 15;
      reason = 'High transaction frequency';
    }

    if (dailyCount > 50) {
      score += 20;
      reason = reason ? `${reason}, 50+ transactions per day` : '50+ transactions per day';
    }

    return { score, reason, confidence: 0.9 };
  }

  /**
   * Check for amount anomalies
   */
  private async checkAmountAnomaly(
    userId: string,
    amount: number,
    type: string
  ): Promise<{ score: number; reason?: string; confidence: number }> {
    // Get user's transaction history
    const transactions = await prisma.capTransaction.findMany({
      where: {
        wallet: { userId },
        type: type as any,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (transactions.length === 0) {
      return { score: 0, confidence: 1.0 };
    }

    // Calculate average and standard deviation
    const amounts = transactions.map(t => Math.abs(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / amounts.length
    );

    // Check if amount is outlier (> 3 standard deviations)
    const zScore = Math.abs(amount - avg) / (stdDev || 1);

    let score = 0;
    let reason: string | undefined;

    if (zScore > 5) {
      score += 40;
      reason = 'Extreme amount anomaly';
    } else if (zScore > 3) {
      score += 25;
      reason = 'Significant amount anomaly';
    } else if (zScore > 2) {
      score += 10;
      reason = 'Moderate amount anomaly';
    }

    return { score, reason, confidence: 0.85 };
  }

  /**
   * Check for geographic anomalies
   */
  private async checkGeographicAnomaly(
    userId: string,
    ipAddress: string
  ): Promise<{ score: number; reason?: string; confidence: number }> {
    try {
      // Get user's last known location
      const lastSession = await prisma.userSession.findFirst({
        where: { userId },
        orderBy: { lastActivity: 'desc' },
      });

      if (!lastSession?.ipAddress) {
        return { score: 0, confidence: 0.7 };
      }

      // Get geolocation for both IPs
      const [oldLocation, newLocation] = await Promise.all([
        this.getGeoLocation(lastSession.ipAddress),
        this.getGeoLocation(ipAddress),
      ]);

      if (!oldLocation || !newLocation) {
        return { score: 0, confidence: 0.5 };
      }

      // Calculate distance (simplified)
      const distance = this.calculateDistance(
        oldLocation.lat,
        oldLocation.lon,
        newLocation.lat,
        newLocation.lon
      );

      const timeDiff = Date.now() - new Date(lastSession.lastActivity).getTime();
      const hoursSinceLastActivity = timeDiff / (1000 * 60 * 60);

      let score = 0;
      let reason: string | undefined;

      // Impossible travel detection
      if (distance > 1000 && hoursSinceLastActivity < 2) {
        score += 50;
        reason = `Impossible travel detected (${Math.round(distance)}km in ${Math.round(hoursSinceLastActivity)}h)`;
      } else if (distance > 500 && hoursSinceLastActivity < 4) {
        score += 30;
        reason = 'Suspicious geographic movement';
      }

      // Country mismatch
      if (oldLocation.country !== newLocation.country && hoursSinceLastActivity < 24) {
        score += 20;
        reason = reason ? `${reason}, country mismatch` : 'Country mismatch from recent activity';
      }

      return { score, reason, confidence: 0.8 };
    } catch (error) {
      logger.error('Error checking geographic anomaly:', error);
      return { score: 0, confidence: 0.5 };
    }
  }

  /**
   * Check for device anomalies
   */
  private async checkDeviceAnomaly(
    userId: string,
    deviceFingerprint: string
  ): Promise<{ score: number; reason?: string; confidence: number }> {
    // Get user's known devices
    const knownDevices = await prisma.userDevice.findMany({
      where: { userId },
    });

    if (knownDevices.length === 0) {
      return { score: 0, confidence: 0.7 };
    }

    const isKnownDevice = knownDevices.some(d => d.deviceFingerprint === deviceFingerprint);

    if (!isKnownDevice) {
      // Check if this device has been associated with fraud
      const fraudCount = await prisma.fraudAlert.count({
        where: {
          deviceFingerprint,
          status: 'confirmed',
        },
      });

      if (fraudCount > 0) {
        return {
          score: 60,
          reason: 'Device associated with confirmed fraud',
          confidence: 0.95,
        };
      }

      return {
        score: 20,
        reason: 'New device detected',
        confidence: 0.7,
      };
    }

    return { score: 0, confidence: 0.9 };
  }

  /**
   * Check against known fraud patterns
   */
  private async checkFraudPatterns(
    userId: string,
    amount: number,
    type: string
  ): Promise<{ score: number; reason?: string; confidence: number }> {
    // Check if user is in blacklist
    const blacklisted = await prisma.blacklistedUser.findUnique({
      where: { userId },
    });

    if (blacklisted) {
      return {
        score: 100,
        reason: 'User is blacklisted',
        confidence: 1.0,
      };
    }

    // Check for round number patterns (common in fraud)
    if (amount % 1000 === 0 && amount > 10000) {
      return {
        score: 15,
        reason: 'Suspicious round amount',
        confidence: 0.6,
      };
    }

    // Check for rapid succession of same-type transactions
    const recentTransactions = await prisma.capTransaction.findMany({
      where: {
        wallet: { userId },
        type: type as any,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
    });

    if (recentTransactions.length >= 3) {
      return {
        score: 25,
        reason: 'Rapid succession of same-type transactions',
        confidence: 0.75,
      };
    }

    return { score: 0, confidence: 1.0 };
  }

  /**
   * Log suspicious activity
   */
  private async logSuspiciousActivity(
    userId: string,
    data: any
  ): Promise<void> {
    try {
      // Create fraud alert
      const alert = await prisma.fraudAlert.create({
        data: {
          userId,
          alertType: this.determineAlertType(data),
          score: data.score,
          details: data,
          status: data.score >= 80 ? 'confirmed' : 'investigating',
        },
      });

      // Notify admin if high risk
      if (data.score >= 70) {
        await notificationService.create({
          userId: 'admin', // This would be sent to admin queue
          type: 'SYSTEM',
          priority: 'HIGH',
          title: '🚨 High Risk Fraud Alert',
          body: `User ${userId} triggered fraud alert with score ${data.score}`,
          data: {
            screen: 'admin',
            action: 'fraud',
            id: alert.id,
          },
        });
      }

      // Freeze wallet if critical
      if (data.score >= 90 && data.action === 'block') {
        await walletService.freezeWallet(
          userId,
          `Automatically frozen due to fraud detection (score: ${data.score})`
        );
      }

      logger.warn(`Suspicious activity logged for user ${userId}`, data);
    } catch (error) {
      logger.error('Error logging suspicious activity:', error);
    }
  }

  /**
   * Determine alert type from data
   */
  private determineAlertType(data: any): string {
    if (data.reasons?.some((r: string) => r.includes('Impossible travel'))) {
      return 'impossible_travel';
    }
    if (data.reasons?.some((r: string) => r.includes('amount anomaly'))) {
      return 'amount_anomaly';
    }
    if (data.reasons?.some((r: string) => r.includes('velocity'))) {
      return 'velocity_anomaly';
    }
    if (data.reasons?.some((r: string) => r.includes('device'))) {
      return 'device_anomaly';
    }
    return 'unusual_pattern';
  }

  /**
   * Get geolocation from IP
   */
  private async getGeoLocation(ip: string): Promise<{ lat: number; lon: number; country: string } | null> {
    try {
      // Try cache first
      const cached = await redis.get(`geo:${ip}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Use IP geolocation service
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        const result = {
          lat: data.lat,
          lon: data.lon,
          country: data.countryCode,
        };
        
        // Cache for 24 hours
        await redis.setex(`geo:${ip}`, 86400, JSON.stringify(result));
        
        return result;
      }
    } catch (error) {
      logger.error('Error getting geolocation:', error);
    }
    return null;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
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
   * Get fraud statistics
   */
  async getFraudStatistics(): Promise<any> {
    try {
      const [
        totalAlerts,
        pendingAlerts,
        confirmedFraud,
        falsePositives,
        topReasons,
      ] = await Promise.all([
        prisma.fraudAlert.count(),
        prisma.fraudAlert.count({ where: { status: 'investigating' } }),
        prisma.fraudAlert.count({ where: { status: 'confirmed' } }),
        prisma.fraudAlert.count({ where: { status: 'false_positive' } }),
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
      ]);

      return {
        totalAlerts,
        pendingAlerts,
        confirmedFraud,
        falsePositives,
        topReasons: topReasons.map(r => ({
          type: r.alertType,
          count: r._count,
        })),
        accuracy: totalAlerts > 0 
          ? (confirmedFraud / (confirmedFraud + falsePositives)) * 100 
          : 0,
      };
    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      throw error;
    }
  }
}

export const fraudDetectionService = new FraudDetectionService();