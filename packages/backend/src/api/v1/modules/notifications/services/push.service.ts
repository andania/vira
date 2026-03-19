/**
 * Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import * as admin from 'firebase-admin';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  badge?: number;
  sound?: string;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class PushService {
  private firebaseApp: admin.app.App | null = null;
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
        this.firebaseApp = admin.initializeApp({
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
   * Send push notification to a device
   */
  async sendToDevice(deviceToken: string, notification: PushNotificationData): Promise<PushResult> {
    if (!this.initialized || !this.firebaseApp) {
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
        data: notification.data as { [key: string]: string },
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
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(deviceTokens: string[], notification: PushNotificationData): Promise<PushResult[]> {
    if (!this.initialized || !this.firebaseApp) {
      return deviceTokens.map(token => this.mockSend(token, notification));
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data as { [key: string]: string },
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
      
      for (let i = 0; i < response.responses.length; i++) {
        const resp = response.responses[i];
        results.push({
          success: resp.success,
          messageId: resp.messageId,
          error: resp.error?.message,
        });
      }

      // Track failures for token cleanup
      await this.handleFailedTokens(deviceTokens, results);

      return results;
    } catch (error) {
      logger.error('Error sending multicast push notifications:', error);
      return deviceTokens.map(() => ({
        success: false,
        error: error.message,
      }));
    }
  }

  /**
   * Send notification to topic
   */
  async sendToTopic(topic: string, notification: PushNotificationData): Promise<PushResult> {
    if (!this.initialized || !this.firebaseApp) {
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
        data: notification.data as { [key: string]: string },
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
   * Subscribe device to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized || !this.firebaseApp) {
      return true;
    }

    try {
      await admin.messaging().subscribeToTopic(deviceTokens, topic);
      return true;
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized || !this.firebaseApp) {
      return true;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(deviceTokens, topic);
      return true;
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      return false;
    }
  }

  /**
   * Handle failed tokens (cleanup)
   */
  private async handleFailedTokens(tokens: string[], results: PushResult[]): Promise<void> {
    const failedTokens: string[] = [];
    
    for (let i = 0; i < results.length; i++) {
      if (!results[i].success) {
        const error = results[i].error;
        // Check for permanent failures
        if (error?.includes('NotRegistered') || error?.includes('InvalidRegistration')) {
          failedTokens.push(tokens[i]);
        }
      }
    }

    if (failedTokens.length > 0) {
      // Mark tokens as inactive in database
      await prisma.userDevice.updateMany({
        where: {
          pushToken: { in: failedTokens },
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Marked ${failedTokens.length} inactive push tokens`);
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
    };
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
  async registerDevice(userId: string, deviceToken: string, deviceInfo: any): Promise<void> {
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
}

export const pushService = new PushService();