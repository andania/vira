/**
 * SMS Service
 * Handles sending SMS via Twilio and other providers
 */

import twilio from 'twilio';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { redis } from '../../../core/cache/redis.client';
import { prisma } from '../../../core/database/client';

export interface SmsData {
  to: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
  from?: string;
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
  to?: string;
}

export interface SmsTemplate {
  name: string;
  content: string;
  variables: string[];
}

export class SmsService {
  private client: twilio.Twilio | null = null;
  private templates: Map<string, SmsTemplate> = new Map();

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
      withdrawal: 'Your withdrawal of ${{amount}} has been processed and will arrive in {{time}}',
      deposit: 'Your deposit of ${{amount}} has been confirmed. {{capAmount}} CAP added to your wallet.',
      'cap-low': 'Your CAP balance is running low ({{balance}}). Earn more by engaging with ads!',
      'live-start': '🔴 {{roomName}} is live now! Join at {{url}}',
      'campaign-alert': 'Your campaign "{{campaignName}}" has reached {{percent}}% of its goal!',
      'security-alert': 'Security alert: {{action}} on your VIRAZ account. If this wasn\'t you, contact support.',
      'order-confirmed': 'Your order #{{orderNumber}} has been confirmed. Track at {{trackingUrl}}',
      'order-shipped': 'Your order #{{orderNumber}} has shipped! Tracking: {{trackingNumber}}',
      'order-delivered': 'Your order #{{orderNumber}} has been delivered. Enjoy!',
      'room-reminder': 'Reminder: {{roomName}} starts in {{minutes}} minutes! Join at {{url}}',
      'friend-invite': '{{friendName}} invited you to join VIRAZ! Sign up at {{inviteUrl}}',
      'cap-earned': '🎉 You earned {{amount}} CAP from {{action}}! Total balance: {{balance}}',
      'achievement': '🏆 Achievement unlocked: {{achievement}}! You earned {{reward}} CAP.',
    };

    for (const [name, content] of Object.entries(templates)) {
      // Extract variables from template (e.g., {{code}} -> code)
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables: string[] = [];
      let match;
      while ((match = variableRegex.exec(content)) !== null) {
        variables.push(match[1]);
      }

      this.templates.set(name, {
        name,
        content,
        variables: [...new Set(variables)], // Remove duplicates
      });
    }

    logger.info(`✅ Loaded ${this.templates.size} SMS templates`);
  }

  /**
   * Send SMS
   */
  async send(data: SmsData): Promise<SmsResult> {
    try {
      const { to, message, template, data: templateData = {}, from } = data;

      // Validate phone number
      if (!this.isValidPhoneNumber(to)) {
        return {
          success: false,
          error: 'Invalid phone number format',
          to,
        };
      }

      let finalMessage = message;

      // Use template if provided
      if (template && this.templates.has(template)) {
        finalMessage = this.renderTemplate(template, templateData);
      }

      // Check rate limits
      const canSend = await this.checkRateLimit(to);
      if (!canSend) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          to,
        };
      }

      // If Twilio is configured, send real SMS
      if (this.client && config.twilioPhoneNumber) {
        const result = await this.client.messages.create({
          body: finalMessage,
          to,
          from: from || config.twilioPhoneNumber,
          statusCallback: `${config.apiUrl}/api/v1/webhooks/sms/status`,
        });

        // Log successful SMS
        await this.logSms(to, finalMessage, template, true, result.sid);

        logger.debug(`SMS sent to ${to}: ${result.sid}`);

        return {
          success: true,
          sid: result.sid,
          to,
        };
      } else {
        // Mock mode for development
        return this.mockSend(to, finalMessage, template);
      }
    } catch (error) {
      logger.error('Error sending SMS:', error);

      // Log failed SMS
      await this.logSms(data.to, data.message, data.template, false, undefined, error.message);

      return {
        success: false,
        error: error.message,
        to: data.to,
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

        // Rate limiting delay between sends
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          to,
        });
      }
    }

    return results;
  }

  /**
   * Send templated SMS
   */
  async sendTemplated(
    to: string,
    templateName: string,
    data: Record<string, any>
  ): Promise<SmsResult> {
    if (!this.templates.has(templateName)) {
      return {
        success: false,
        error: `Template "${templateName}" not found`,
        to,
      };
    }

    return this.send({
      to,
      template: templateName,
      data,
    });
  }

  /**
   * Render template with data
   */
  private renderTemplate(templateName: string, data: Record<string, any>): string {
    const template = this.templates.get(templateName);

    if (!template) {
      return '';
    }

    let rendered = template.content;
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    return rendered;
  }

  /**
   * Check rate limit for phone number
   */
  private async checkRateLimit(phoneNumber: string): Promise<boolean> {
    const key = `sms:ratelimit:${phoneNumber}`;
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;

    // Max 5 SMS per hour per number
    if (count >= 5) {
      return false;
    }

    if (count === 0) {
      await redis.setex(key, 3600, '1');
    } else {
      await redis.incr(key);
    }

    return true;
  }

  /**
   * Log SMS to database
   */
  private async logSms(
    to: string,
    message: string,
    template?: string,
    success: boolean = true,
    sid?: string,
    error?: string
  ): Promise<void> {
    try {
      await prisma.smsNotification.create({
        data: {
          phoneNumber: to,
          message,
          templateName: template,
          status: success ? 'sent' : 'failed',
          providerSid: sid,
          errorMessage: error,
          createdAt: new Date(),
        },
      });
    } catch (dbError) {
      logger.error('Error logging SMS to database:', dbError);
    }
  }

  /**
   * Mock send for development
   */
  private mockSend(to: string, message: string, template?: string): SmsResult {
    logger.debug('📱 [MOCK] SMS sent:', {
      to,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      template,
    });

    return {
      success: true,
      sid: `mock-${Date.now()}`,
      to,
    };
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phone: string, defaultCountry: string = 'US'): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If already has country code, assume it's correct
    if (phone.startsWith('+')) {
      return `+${digits}`;
    }

    // Add default country code (simplified - in production use a proper library)
    if (digits.length === 10) {
      return `+1${digits}`; // US/Canada
    }

    return `+${digits}`;
  }

  /**
   * Get all available templates
   */
  getTemplates(): SmsTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add a new template
   */
  addTemplate(name: string, content: string): void {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      variables.push(match[1]);
    }

    this.templates.set(name, {
      name,
      content,
      variables: [...new Set(variables)],
    });

    logger.info(`Added SMS template: ${name}`);
  }

  /**
   * Remove a template
   */
  removeTemplate(name: string): void {
    this.templates.delete(name);
    logger.info(`Removed SMS template: ${name}`);
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(sid: string): Promise<any> {
    if (!this.client) {
      return null;
    }

    try {
      const message = await this.client.messages(sid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      logger.error('Error getting delivery status:', error);
      return null;
    }
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

  /**
   * Verify SMS configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Try to fetch account info to verify credentials
      await this.client.api.accounts(config.twilioAccountSid!).fetch();
      return true;
    } catch (error) {
      logger.error('SMS connection verification failed:', error);
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<number | null> {
    if (!this.client) {
      return null;
    }

    try {
      const account = await this.client.api.accounts(config.twilioAccountSid!).fetch();
      // This is simplified - actual balance may require additional API calls
      return parseFloat(account.balance || '0');
    } catch (error) {
      logger.error('Error getting SMS balance:', error);
      return null;
    }
  }
}

export const smsService = new SmsService();