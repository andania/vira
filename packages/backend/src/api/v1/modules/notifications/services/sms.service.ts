/**
 * SMS Notification Service
 * Handles sending SMS notifications via Twilio
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import twilio from 'twilio';

export interface SmsData {
  to: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export class SmsService {
  private client: twilio.Twilio | null = null;
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTwilio();
    this.loadTemplates();
  }

  /**
   * Initialize Twilio client
   */
  private initializeTwilio() {
    try {
      if (config.twilioAccountSid && config.twilioAuthToken) {
        this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
        logger.info('✅ Twilio client initialized');
      } else {
        logger.warn('⚠️ Twilio credentials not configured, SMS notifications disabled');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Load SMS templates
   */
  private loadTemplates() {
    const templates: Record<string, string> = {
      verification: 'Your VIRAZ verification code is: {{code}}',
      'login-alert': 'New login to your VIRAZ account from {{location}} on {{device}}',
      withdrawal: 'Your withdrawal of ${{amount}} has been processed',
      'cap-low': 'Your CAP balance is running low ({{balance}}). Earn more by engaging with ads!',
      'live-start': '🔴 {{roomName}} is live now! Join at {{url}}',
      deposit: 'Your deposit of ${{amount}} has been confirmed. {{capAmount}} CAP added.',
      'campaign-alert': 'Your campaign "{{campaignName}}" has reached {{percent}}% of its goal!',
      'security-alert': 'Security alert: {{action}} on your VIRAZ account.',
    };

    for (const [key, value] of Object.entries(templates)) {
      this.templates.set(key, value);
    }

    logger.info(`✅ Loaded ${this.templates.size} SMS templates`);
  }

  /**
   * Send SMS
   */
  async send(data: SmsData): Promise<SmsResult> {
    if (!this.client || !config.twilioPhoneNumber) {
      return this.mockSend(data);
    }

    try {
      let message = data.message;

      // Use template if provided
      if (data.template && this.templates.has(data.template)) {
        message = this.renderTemplate(data.template, data.data || {});
      }

      const result = await this.client.messages.create({
        body: message,
        to: data.to,
        from: config.twilioPhoneNumber,
        statusCallback: process.env.SMS_STATUS_CALLBACK_URL,
      });

      // Log successful SMS
      await prisma.smsNotification.create({
        data: {
          userId: 'system', // Will be updated by calling service
          phoneNumber: data.to,
          message,
          templateName: data.template,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.debug(`SMS sent to ${data.to}: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
      };
    } catch (error) {
      logger.error('Error sending SMS:', error);

      // Log failed SMS
      await prisma.smsNotification.create({
        data: {
          userId: 'system',
          phoneNumber: data.to,
          message: data.message,
          status: 'failed',
          errorMessage: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulk(recipients: string[], data: Omit<SmsData, 'to'>): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    for (const to of recipients) {
      try {
        const result = await this.send({ to, ...data });
        results.push(result);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Render template with data
   */
  private renderTemplate(templateName: string, data: Record<string, any>): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      return '';
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Mock send for development
   */
  private mockSend(data: SmsData): SmsResult {
    logger.debug('📱 [MOCK] SMS sent:', {
      to: data.to,
      message: data.message.substring(0, 50) + '...',
      template: data.template,
    });

    return {
      success: true,
      sid: `mock-${Date.now()}`,
    };
  }

  /**
   * Verify phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  /**
   * Get SMS statistics
   */
  async getStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, sent, failed, byTemplate] = await Promise.all([
      prisma.smsNotification.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.smsNotification.count({
        where: {
          status: 'sent',
          createdAt: { gte: startDate },
        },
      }),
      prisma.smsNotification.count({
        where: {
          status: 'failed',
          createdAt: { gte: startDate },
        },
      }),
      prisma.smsNotification.groupBy({
        by: ['templateName'],
        where: {
          createdAt: { gte: startDate },
          templateName: { not: null },
        },
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? (sent / total) * 100 : 0,
      byTemplate: byTemplate.map(t => ({
        template: t.templateName,
        count: t._count,
      })),
    };
  }
}

export const smsService = new SmsService();