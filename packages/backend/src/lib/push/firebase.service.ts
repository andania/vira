/**
 * Firebase Service
 * Low-level Firebase Admin SDK wrapper
 */

import admin from 'firebase-admin';
import { config } from '../../config';
import { logger } from '../../core/logger';

export interface FirebaseMessage {
  token?: string;
  topic?: string;
  condition?: string;
  notification?: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
}

export interface FirebaseBatchResponse {
  successCount: number;
  failureCount: number;
  responses: Array<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export class FirebaseService {
  private app: admin.app.App | null = null;
  private messaging: admin.messaging.Messaging | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase
   */
  private initialize() {
    try {
      if (config.firebaseProjectId && config.firebasePrivateKey && config.firebaseClientEmail) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebaseProjectId,
            privateKey: config.firebasePrivateKey.replace(/\\n/g, '\n'),
            clientEmail: config.firebaseClientEmail,
          }),
          databaseURL: config.firebaseDatabaseURL,
        });

        this.messaging = this.app.messaging();
        this.initialized = true;
        logger.info('✅ Firebase Admin SDK initialized');
      } else {
        logger.warn('⚠️ Firebase credentials not configured');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase:', error);
    }
  }

  /**
   * Send a message
   */
  async send(message: FirebaseMessage, dryRun: boolean = false): Promise<string> {
    if (!this.initialized || !this.messaging) {
      throw new Error('Firebase not initialized');
    }

    try {
      const result = await this.messaging.send(message, dryRun);
      return result;
    } catch (error) {
      logger.error('Firebase send error:', error);
      throw error;
    }
  }

  /**
   * Send a multicast message
   */
  async sendMulticast(
    tokens: string[],
    message: Omit<FirebaseMessage, 'token' | 'topic' | 'condition'>,
    dryRun: boolean = false
  ): Promise<FirebaseBatchResponse> {
    if (!this.initialized || !this.messaging) {
      throw new Error('Firebase not initialized');
    }

    try {
      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens,
        ...message,
      };

      const response = await this.messaging.sendEachForMulticast(multicastMessage, dryRun);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map(r => ({
          success: r.success,
          messageId: r.messageId,
          error: r.error?.message,
        })),
      };
    } catch (error) {
      logger.error('Firebase sendMulticast error:', error);
      throw error;
    }
  }

  /**
   * Send to topic
   */
  async sendToTopic(topic: string, message: Omit<FirebaseMessage, 'token' | 'topic' | 'condition'>): Promise<string> {
    return this.send({ ...message, topic });
  }

  /**
   * Send to condition
   */
  async sendToCondition(condition: string, message: Omit<FirebaseMessage, 'token' | 'topic' | 'condition'>): Promise<string> {
    return this.send({ ...message, condition });
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<admin.messaging.TopicManagementResponse> {
    if (!this.initialized || !this.messaging) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      return response;
    } catch (error) {
      logger.error('Firebase subscribeToTopic error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<admin.messaging.TopicManagementResponse> {
    if (!this.initialized || !this.messaging) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      return response;
    } catch (error) {
      logger.error('Firebase unsubscribeFromTopic error:', error);
      throw error;
    }
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized || !this.messaging) {
      return false;
    }

    try {
      await this.messaging.send(
        {
          token,
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
   * Get token info from IID
   */
  async getTokenInfo(token: string): Promise<any> {
    if (!this.initialized || !this.app) {
      throw new Error('Firebase not initialized');
    }

    try {
      // This would use Instance ID service
      // Simplified for now
      return null;
    } catch (error) {
      logger.error('Firebase getTokenInfo error:', error);
      throw error;
    }
  }

  /**
   * Create a custom Android config
   */
  createAndroidConfig(
    priority: 'high' | 'normal' = 'high',
    ttl: number = 3600,
    notification?: {
      sound?: string;
      clickAction?: string;
      channelId?: string;
    }
  ): admin.messaging.AndroidConfig {
    return {
      priority,
      ttl: ttl * 1000,
      notification: {
        sound: notification?.sound || 'default',
        clickAction: notification?.clickAction || 'OPEN_ACTIVITY',
        channelId: notification?.channelId || 'viraz_default',
      },
    };
  }

  /**
   * Create a custom APNs config
   */
  createApnsConfig(
    priority: 'high' | 'normal' = 'high',
    badge?: number,
    sound: string = 'default'
  ): admin.messaging.ApnsConfig {
    return {
      headers: {
        'apns-priority': priority === 'high' ? '10' : '5',
      },
      payload: {
        aps: {
          badge,
          sound,
          'mutable-content': 1,
        },
      },
    };
  }

  /**
   * Create a custom Webpush config
   */
  createWebpushConfig(
    urgency: 'high' | 'normal' | 'low' = 'normal',
    icon?: string,
    badge?: string
  ): admin.messaging.WebpushConfig {
    return {
      headers: {
        Urgency: urgency,
      },
      notification: {
        icon,
        badge,
        vibrate: [200, 100, 200],
      },
    };
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get app instance
   */
  getApp(): admin.app.App | null {
    return this.app;
  }

  /**
   * Get messaging instance
   */
  getMessaging(): admin.messaging.Messaging | null {
    return this.messaging;
  }
}

export const firebaseService = new FirebaseService();