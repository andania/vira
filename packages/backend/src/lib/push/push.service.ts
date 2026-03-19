/**
 * Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import { prisma } from '../../../core/database/client';
import { redis } from '../../../core/cache/redis.client';
import { logger } from '../../../core/logger';
import { config } from '../../../config';
import admin from 'firebase-admin';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
  badge?: number;
  sound?: string;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  collapseKey?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deviceToken?: string;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  results: PushResult[];
}

export class PushService {
  private initialized: boolean = false;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase() {
    try {
      if (config.firebaseProjectId && config.firebasePrivateKey && config.firebaseClientEmail) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebaseProjectId,
            privateKey: config.firebasePrivateKey.replace(/\\n/g, '\n'),
            clientEmail: config.firebaseClientEmail,
          }),
        });
        this.initialized = true;
        logger.info('✅ Firebase Admin SDK initialized');
      } else {
        logger.warn('⚠️ Firebase credentials not configured, push notifications disabled');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(deviceToken: string, notification: PushNotificationData): Promise<PushResult> {
    if (!this.initialized) {
      return this.mockSend(deviceToken, notification);
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          ttl: notification.ttl ? notification.ttl * 1000 : 3600000, // 1 hour default
          notification: {
            sound: notification.sound || 'default',
            clickAction: 'OPEN_ACTIVITY',
            channelId: 'viraz_default',
          },
        },
        apns: {
          headers: {
            'apns-priority': notification.priority === 'high' ? '10' : '5',
          },
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge,
              sound: notification.sound || 'default',
              'mutable-content': 1,
            },
          },
        },
        webpush: {
          headers: {
            Urgency: notification.priority === 'high' ? 'high' : 'normal',
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.image || '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            vibrate: [200, 100, 200],
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      return {
        success: true,
        messageId: response,
        deviceToken,
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      
      // Handle specific error codes
      if (error.code === 'messaging/registration-token-not-registered') {
        await this.markTokenAsInvalid(deviceToken);
      }

      return {
        success: false,
        error: error.message,
        deviceToken,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(deviceTokens: string[], notification: PushNotificationData): Promise<MulticastResult> {
    if (!this.initialized || deviceTokens.length === 0) {
      return {
        successCount: 0,
        failureCount: deviceTokens.length,
        results: deviceTokens.map(token => this.mockSend(token, notification)),
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          ttl: notification.ttl ? notification.ttl * 1000 : 3600000,
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge,
              sound: notification.sound || 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      const results: PushResult[] = [];
      const invalidTokens: string[] = [];

      for (let i = 0; i < response.responses.length; i++) {
        const resp = response.responses[i];
        const token = deviceTokens[i];

        if (resp.success) {
          results.push({
            success: true,
            messageId: resp.messageId,
            deviceToken: token,
          });
        } else {
          results.push({
            success: false,
            error: resp.error?.message,
            deviceToken: token,
          });

          // Track invalid tokens
          if (resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
          }
        }
      }

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        await this.markTokensAsInvalid(invalidTokens);
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
      };
    } catch (error) {
      logger.error('Error sending multicast push notifications:', error);
      
      return {
        successCount: 0,
        failureCount: deviceTokens.length,
        results: deviceTokens.map(token => ({
          success: false,
          error: error.message,
          deviceToken: token,
        })),
      };
    }
  }

  /**
   * Send notification to topic
   */
  async sendToTopic(topic: string, notification: PushNotificationData): Promise<PushResult> {
    if (!this.initialized) {
      return { success: true, messageId: 'mock-topic-message' };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
        },
      };

      const response = await admin.messaging().send(message);
      
      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification to condition
   */
  async sendToCondition(condition: string, notification: PushNotificationData): Promise<PushResult> {
    if (!this.initialized) {
      return { success: true, messageId: 'mock-condition-message' };
    }

    try {
      const message: admin.messaging.Message = {
        condition,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data,
      };

      const response = await admin.messaging().send(message);
      
      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      logger.error('Error sending condition notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe devices to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(deviceTokens, topic);
      
      if (response.failureCount > 0) {
        logger.warn(`Failed to subscribe ${response.failureCount} devices to topic ${topic}`);
      }

      return response.failureCount === 0;
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe devices from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(deviceTokens, topic);
      
      if (response.failureCount > 0) {
        logger.warn(`Failed to unsubscribe ${response.failureCount} devices from topic ${topic}`);
      }

      return response.failureCount === 0;
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      return false;
    }
  }

  /**
   * Mark token as invalid in database
   */
  private async markTokenAsInvalid(token: string): Promise<void> {
    try {
      await prisma.userDevice.updateMany({
        where: { pushToken: token },
        data: { isActive: false },
      });

      logger.info(`Marked push token as invalid: ${token.substring(0, 10)}...`);
    } catch (error) {
      logger.error('Error marking token as invalid:', error);
    }
  }

  /**
   * Mark multiple tokens as invalid
   */
  private async markTokensAsInvalid(tokens: string[]): Promise<void> {
    try {
      await prisma.userDevice.updateMany({
        where: { pushToken: { in: tokens } },
        data: { isActive: false },
      });

      logger.info(`Marked ${tokens.length} push tokens as invalid`);
    } catch (error) {
      logger.error('Error marking tokens as invalid:', error);
    }
  }

  /**
   * Get user's active devices
   */
  async getUserDevices(userId: string): Promise<string[]> {
    try {
      const devices = await prisma.userDevice.findMany({
        where: {
          userId,
          isActive: true,
          pushToken: { not: null },
        },
        select: {
          pushToken: true,
        },
      });

      return devices.map(d => d.pushToken!).filter(Boolean);
    } catch (error) {
      logger.error('Error getting user devices:', error);
      return [];
    }
  }

  /**
   * Register device token
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    deviceInfo: {
      fingerprint: string;
      name?: string;
      type?: string;
      platform?: string;
    }
  ): Promise<void> {
    try {
      await prisma.userDevice.upsert({
        where: {
          userId_deviceFingerprint: {
            userId,
            deviceFingerprint: deviceInfo.fingerprint,
          },
        },
        update: {
          pushToken: deviceToken,
          lastUsed: new Date(),
          isActive: true,
          deviceName: deviceInfo.name,
          deviceType: deviceInfo.type,
          platform: deviceInfo.platform,
        },
        create: {
          userId,
          deviceFingerprint: deviceInfo.fingerprint,
          deviceName: deviceInfo.name,
          deviceType: deviceInfo.type,
          platform: deviceInfo.platform,
          pushToken: deviceToken,
          isActive: true,
        },
      });

      logger.info(`Device registered for user ${userId}`);
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(userId: string, deviceToken: string): Promise<void> {
    try {
      await prisma.userDevice.updateMany({
        where: {
          userId,
          pushToken: deviceToken,
        },
        data: {
          isActive: false,
          pushToken: null,
        },
      });

      logger.info(`Device unregistered for user ${userId}`);
    } catch (error) {
      logger.error('Error unregistering device:', error);
      throw error;
    }
  }

  /**
   * Mock send for development
   */
  private mockSend(deviceToken: string, notification: PushNotificationData): PushResult {
    logger.debug('📱 [MOCK] Push notification sent:', {
      token: deviceToken.substring(0, 10) + '...',
      title: notification.title,
    });
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      deviceToken,
    };
  }

  /**
   * Validate device token
   */
  async validateDeviceToken(deviceToken: string): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      // Send a dry run message to validate token
      await admin.messaging().send(
        {
          token: deviceToken,
          data: { validate: 'true' },
        },
        true // dry run
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(deviceToken: string): Promise<any> {
    // This would get device info from IID API
    // Simplified for now
    return null;
  }

  /**
   * Clean up inactive devices
   */
  async cleanupInactiveDevices(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await prisma.userDevice.updateMany({
        where: {
          lastUsed: { lt: cutoffDate },
          isActive: true,
        },
        data: { isActive: false },
      });

      logger.info(`Cleaned up ${result.count} inactive devices`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up inactive devices:', error);
      return 0;
    }
  }
}

export const pushService = new PushService();