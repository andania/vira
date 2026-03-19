/**
 * AI Fraud Detection Service
 * Advanced ML-based fraud detection algorithms
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';

export interface FraudScore {
  score: number; // 0-100
  confidence: number; // 0-1
  factors: FraudFactor[];
  recommendation: 'allow' | 'review' | 'block';
}

export interface FraudFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface UserBehaviorProfile {
  userId: string;
  avgSessionDuration: number;
  avgActionsPerSession: number;
  typicalHours: number[];
  typicalDevices: string[];
  typicalLocations: string[];
  engagementPattern: number[];
  anomalyScore: number;
}

export class FraudAIService {
  /**
   * Analyze user behavior for fraud
   */
  async analyzeUserBehavior(userId: string): Promise<FraudScore> {
    try {
      // Get user history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [sessions, engagements, transactions] = await Promise.all([
        prisma.userSession.findMany({
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.userEngagement.findMany({
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.capTransaction.findMany({
          where: {
            wallet: { userId },
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      // Build behavior profile
      const profile = await this.buildBehaviorProfile(userId, sessions, engagements, transactions);

      // Detect anomalies
      const factors: FraudFactor[] = [];

      // Check session anomalies
      const sessionFactor = this.analyzeSessions(sessions, profile);
      if (sessionFactor.score > 0) {
        factors.push(sessionFactor);
      }

      // Check engagement anomalies
      const engagementFactor = this.analyzeEngagements(engagements, profile);
      if (engagementFactor.score > 0) {
        factors.push(engagementFactor);
      }

      // Check transaction anomalies
      const transactionFactor = await this.analyzeTransactions(userId, transactions, profile);
      if (transactionFactor.score > 0) {
        factors.push(transactionFactor);
      }

      // Calculate overall score
      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      // Calculate confidence based on data volume
      const confidence = Math.min(
        (sessions.length + engagements.length + transactions.length) / 100,
        0.95
      );

      // Determine recommendation
      let recommendation: 'allow' | 'review' | 'block' = 'allow';
      if (overallScore > 70) {
        recommendation = 'block';
      } else if (overallScore > 40) {
        recommendation = 'review';
      }

      return {
        score: overallScore,
        confidence,
        factors,
        recommendation,
      };
    } catch (error) {
      logger.error('Error analyzing user behavior:', error);
      return {
        score: 0,
        confidence: 0,
        factors: [],
        recommendation: 'allow',
      };
    }
  }

  /**
   * Build user behavior profile
   */
  private async buildBehaviorProfile(
    userId: string,
    sessions: any[],
    engagements: any[],
    transactions: any[]
  ): Promise<UserBehaviorProfile> {
    // Calculate average session duration
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
      : 0;

    // Calculate average actions per session
    const actionsPerSession = sessions.length > 0
      ? engagements.length / sessions.length
      : 0;

    // Get typical active hours
    const hourCounts = new Array(24).fill(0);
    for (const session of sessions) {
      const hour = new Date(session.createdAt).getHours();
      hourCounts[hour]++;
    }
    const avgHour = hourCounts.reduce((sum, count, hour) => sum + hour * count, 0) / sessions.length || 12;
    const stdDevHour = Math.sqrt(
      hourCounts.reduce((sum, count, hour) => sum + count * Math.pow(hour - avgHour, 2), 0) / sessions.length
    );
    const typicalHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > sessions.length / 24) // Above average
      .map(h => h.hour);

    // Get typical devices
    const deviceCounts: Record<string, number> = {};
    for (const session of sessions) {
      if (session.deviceType) {
        deviceCounts[session.deviceType] = (deviceCounts[session.deviceType] || 0) + 1;
      }
    }
    const typicalDevices = Object.entries(deviceCounts)
      .filter(([, count]) => count > sessions.length * 0.2) // Used in >20% of sessions
      .map(([device]) => device);

    // Get typical locations
    const locationCounts: Record<string, number> = {};
    for (const session of sessions) {
      if (session.country) {
        locationCounts[session.country] = (locationCounts[session.country] || 0) + 1;
      }
    }
    const typicalLocations = Object.entries(locationCounts)
      .filter(([, count]) => count > sessions.length * 0.3) // Used in >30% of sessions
      .map(([location]) => location);

    // Create engagement pattern (hourly activity for 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const pattern = new Array(7 * 24).fill(0);
    for (const engagement of engagements) {
      const time = engagement.createdAt.getTime();
      if (time >= sevenDaysAgo.getTime()) {
        const hoursAgo = Math.floor((Date.now() - time) / (1000 * 60 * 60));
        if (hoursAgo < 7 * 24) {
          pattern[hoursAgo]++;
        }
      }
    }

    return {
      userId,
      avgSessionDuration,
      avgActionsPerSession: actionsPerSession,
      typicalHours,
      typicalDevices,
      typicalLocations,
      engagementPattern: pattern,
      anomalyScore: 0,
    };
  }

  /**
   * Analyze session anomalies
   */
  private analyzeSessions(sessions: any[], profile: UserBehaviorProfile): FraudFactor {
    let score = 0;
    const reasons: string[] = [];

    if (sessions.length === 0) {
      return { name: 'sessions', score: 0, weight: 1, description: 'No session data' };
    }

    // Check for impossible travel
    const travelScore = this.detectImpossibleTravel(sessions);
    if (travelScore > 0) {
      score += travelScore * 30;
      reasons.push('impossible travel detected');
    }

    // Check for session duration anomalies
    const recentSessions = sessions.slice(-5);
    const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
    if (avgDuration > profile.avgSessionDuration * 3) {
      score += 20;
      reasons.push('unusually long sessions');
    } else if (avgDuration < profile.avgSessionDuration * 0.1 && recentSessions.length > 3) {
      score += 15;
      reasons.push('unusually short sessions');
    }

    // Check for rapid session switching
    let rapidSwitches = 0;
    for (let i = 1; i < sessions.length; i++) {
      const timeDiff = sessions[i].createdAt.getTime() - sessions[i-1].createdAt.getTime();
      if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes between sessions
        rapidSwitches++;
      }
    }
    if (rapidSwitches > sessions.length * 0.3) {
      score += 25;
      reasons.push('rapid session switching');
    }

    return {
      name: 'session_analysis',
      score: Math.min(score, 100),
      weight: 2,
      description: reasons.join(', ') || 'normal session pattern',
    };
  }

  /**
   * Detect impossible travel between sessions
   */
  private detectImpossibleTravel(sessions: any[]): number {
    let maxScore = 0;

    for (let i = 1; i < sessions.length; i++) {
      const prev = sessions[i-1];
      const curr = sessions[i];

      if (!prev.country || !curr.country || prev.country === curr.country) {
        continue;
      }

      const timeDiff = (curr.createdAt.getTime() - prev.createdAt.getTime()) / (1000 * 60 * 60); // hours
      
      // If time difference is too short for travel between countries
      if (timeDiff < 2) { // Less than 2 hours
        maxScore = Math.max(maxScore, 50);
      } else if (timeDiff < 6) {
        maxScore = Math.max(maxScore, 30);
      } else if (timeDiff < 12) {
        maxScore = Math.max(maxScore, 15);
      }
    }

    return maxScore;
  }

  /**
   * Analyze engagement anomalies
   */
  private analyzeEngagements(engagements: any[], profile: UserBehaviorProfile): FraudFactor {
    let score = 0;
    const reasons: string[] = [];

    if (engagements.length === 0) {
      return { name: 'engagements', score: 0, weight: 1, description: 'No engagement data' };
    }

    // Check for burst activity
    const burstScore = this.detectBurstActivity(engagements);
    if (burstScore > 0) {
      score += burstScore * 30;
      reasons.push('burst activity detected');
    }

    // Check for repetitive patterns
    const patternScore = this.detectRepetitivePatterns(engagements);
    if (patternScore > 0) {
      score += patternScore * 25;
      reasons.push('repetitive engagement pattern');
    }

    // Check for abnormal timing
    const recentEngagements = engagements.slice(-10);
    let offHourCount = 0;
    for (const engagement of recentEngagements) {
      const hour = new Date(engagement.createdAt).getHours();
      if (!profile.typicalHours.includes(hour)) {
        offHourCount++;
      }
    }
    if (offHourCount > recentEngagements.length * 0.7) {
      score += 20;
      reasons.push('unusual activity hours');
    }

    return {
      name: 'engagement_analysis',
      score: Math.min(score, 100),
      weight: 1.5,
      description: reasons.join(', ') || 'normal engagement pattern',
    };
  }

  /**
   * Detect burst activity (many actions in short time)
   */
  private detectBurstActivity(engagements: any[]): number {
    const timeWindows: number[] = [];
    
    for (let i = 1; i < engagements.length; i++) {
      const timeDiff = engagements[i].createdAt.getTime() - engagements[i-1].createdAt.getTime();
      timeWindows.push(timeDiff / 1000); // seconds
    }

    if (timeWindows.length === 0) return 0;

    const avgWindow = timeWindows.reduce((a, b) => a + b, 0) / timeWindows.length;
    const stdDev = Math.sqrt(timeWindows.reduce((a, b) => a + Math.pow(b - avgWindow, 2), 0) / timeWindows.length);

    // Count how many are more than 3 std deviations below mean (very fast)
    const burstCount = timeWindows.filter(t => t < avgWindow - 3 * stdDev).length;
    
    return burstCount / timeWindows.length;
  }

  /**
   * Detect repetitive patterns (bot-like behavior)
   */
  private detectRepetitivePatterns(engagements: any[]): number {
    if (engagements.length < 10) return 0;

    // Check for exact timing patterns
    const intervals: number[] = [];
    for (let i = 1; i < engagements.length; i++) {
      intervals.push(engagements[i].createdAt.getTime() - engagements[i-1].createdAt.getTime());
    }

    // Check for repeated intervals (within 1 second tolerance)
    let repetitiveCount = 0;
    for (let i = 2; i < intervals.length; i++) {
      if (Math.abs(intervals[i] - intervals[i-1]) < 1000) { // Within 1 second
        repetitiveCount++;
      }
    }

    return repetitiveCount / intervals.length;
  }

  /**
   * Analyze transaction anomalies
   */
  private async analyzeTransactions(
    userId: string,
    transactions: any[],
    profile: UserBehaviorProfile
  ): Promise<FraudFactor> {
    let score = 0;
    const reasons: string[] = [];

    if (transactions.length === 0) {
      return { name: 'transactions', score: 0, weight: 2, description: 'No transaction data' };
    }

    // Check for unusual transaction amounts
    const amounts = transactions.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - avgAmount, 2), 0) / amounts.length);

    const recentTransactions = transactions.slice(-3);
    for (const tx of recentTransactions) {
      const amount = Math.abs(tx.amount);
      if (amount > avgAmount + 5 * stdDev) {
        score += 30;
        reasons.push('unusually large transaction');
        break;
      }
    }

    // Check for rapid transactions
    if (transactions.length > 5) {
      const recent = transactions.slice(-5);
      const timeSpan = recent[recent.length-1].createdAt.getTime() - recent[0].createdAt.getTime();
      if (timeSpan < 10 * 60 * 1000) { // Less than 10 minutes
        score += 25;
        reasons.push('rapid transaction sequence');
      }
    }

    // Check for round number patterns (common in fraud)
    const roundNumberCount = transactions.filter(t => Math.abs(t.amount) % 1000 === 0).length;
    if (roundNumberCount > transactions.length * 0.3) {
      score += 20;
      reasons.push('suspicious round number pattern');
    }

    return {
      name: 'transaction_analysis',
      score: Math.min(score, 100),
      weight: 2.5,
      description: reasons.join(', ') || 'normal transaction pattern',
    };
  }

  /**
   * Detect account takeover
   */
  async detectAccountTakeover(userId: string): Promise<FraudScore> {
    try {
      const factors: FraudFactor[] = [];

      // Check for multiple IPs in short time
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'asc' },
      });

      const ips = new Set(sessions.map(s => s.ipAddress));
      if (ips.size > 3) {
        factors.push({
          name: 'multiple_ips',
          score: Math.min(ips.size * 10, 50),
          weight: 2,
          description: `Login from ${ips.size} different IPs in 24h`,
        });
      }

      // Check for multiple devices
      const devices = new Set(sessions.map(s => s.deviceId));
      if (devices.size > 2) {
        factors.push({
          name: 'multiple_devices',
          score: Math.min(devices.size * 15, 50),
          weight: 1.5,
          description: `Used ${devices.size} different devices`,
        });
      }

      // Check for password change attempts
      const passwordAttempts = await prisma.loginAttempt.count({
        where: {
          email: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
          success: false,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (passwordAttempts > 5) {
        factors.push({
          name: 'failed_logins',
          score: Math.min(passwordAttempts * 5, 70),
          weight: 2,
          description: `${passwordAttempts} failed login attempts`,
        });
      }

      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      return {
        score: overallScore,
        confidence: Math.min(sessions.length / 10, 0.9),
        factors,
        recommendation: overallScore > 60 ? 'block' : overallScore > 30 ? 'review' : 'allow',
      };
    } catch (error) {
      logger.error('Error detecting account takeover:', error);
      return {
        score: 0,
        confidence: 0,
        factors: [],
        recommendation: 'allow',
      };
    }
  }

  /**
   * Detect click fraud
   */
  async detectClickFraud(adId: string): Promise<FraudScore> {
    try {
      const factors: FraudFactor[] = [];

      // Get recent clicks
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const clicks = await prisma.adClick.findMany({
        where: {
          adId,
          clickedAt: { gte: oneHourAgo },
        },
        include: {
          user: true,
        },
      });

      // Check for high click velocity
      if (clicks.length > 100) {
        factors.push({
          name: 'high_velocity',
          score: Math.min(clicks.length, 80),
          weight: 2,
          description: `${clicks.length} clicks in last hour`,
        });
      }

      // Check for repeat clickers
      const userClicks: Record<string, number> = {};
      for (const click of clicks) {
        if (click.userId) {
          userClicks[click.userId] = (userClicks[click.userId] || 0) + 1;
        }
      }

      const repeatUsers = Object.values(userClicks).filter(c => c > 5).length;
      if (repeatUsers > 10) {
        factors.push({
          name: 'repeat_clickers',
          score: Math.min(repeatUsers * 5, 60),
          weight: 1.5,
          description: `${repeatUsers} users clicked >5 times`,
        });
      }

      // Check for bot patterns (same IP, same time)
      const ipClicks: Record<string, number> = {};
      for (const click of clicks) {
        if (click.ipAddress) {
          ipClicks[click.ipAddress] = (ipClicks[click.ipAddress] || 0) + 1;
        }
      }

      const botIps = Object.entries(ipClicks).filter(([, count]) => count > 20).length;
      if (botIps > 0) {
        factors.push({
          name: 'potential_bot',
          score: Math.min(botIps * 20, 100),
          weight: 2.5,
          description: `${botIps} IPs with suspicious click patterns`,
        });
      }

      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      return {
        score: overallScore,
        confidence: Math.min(clicks.length / 500, 0.95),
        factors,
        recommendation: overallScore > 70 ? 'block' : overallScore > 40 ? 'review' : 'allow',
      };
    } catch (error) {
      logger.error('Error detecting click fraud:', error);
      return {
        score: 0,
        confidence: 0,
        factors: [],
        recommendation: 'allow',
      };
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(): Promise<any> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [totalAlerts, newAlerts, byType, avgScore] = await Promise.all([
        prisma.fraudAlert.count(),
        prisma.fraudAlert.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        prisma.fraudAlert.groupBy({
          by: ['alertType'],
          where: { createdAt: { gte: oneWeekAgo } },
          _count: true,
        }),
        prisma.fraudAlert.aggregate({
          where: { createdAt: { gte: oneWeekAgo } },
          _avg: { score: true },
        }),
      ]);

      return {
        totalAlerts,
        newAlerts,
        byType: byType.reduce((acc, curr) => {
          acc[curr.alertType] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        averageScore: avgScore._avg.score || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      throw error;
    }
  }
}

export const fraudAIService = new FraudAIService();