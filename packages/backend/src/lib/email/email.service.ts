/**
 * Email Service
 * Handles sending emails via SMTP/SendGrid
 */

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { logger } from '../../core/logger';
import { redis } from '../../core/cache/redis.client';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    cid?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateFunction> = new Map();
  private defaultFrom: string;
  private defaultFromName: string;

  constructor() {
    this.defaultFrom = config.smtpFrom;
    this.defaultFromName = config.smtpFromName;
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        logger.error('SMTP connection failed:', error);
      } else {
        logger.info('SMTP connection established');
      }
    });
  }

  /**
   * Load email templates
   */
  private loadTemplates() {
    const templateDir = path.join(__dirname, 'templates');
    
    try {
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }

      const files = fs.readdirSync(templateDir);
      
      for (const file of files) {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const templatePath = path.join(templateDir, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(templateName, handlebars.compile(templateContent));
          logger.debug(`Loaded email template: ${templateName}`);
        }
      }

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  /**
   * Send email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const {
        to,
        subject,
        template,
        data = {},
        html,
        text,
        attachments,
        cc,
        bcc,
        replyTo,
      } = options;

      // Generate HTML from template if provided
      let finalHtml = html;
      let finalText = text;

      if (template && this.templates.has(template)) {
        const templateFn = this.templates.get(template)!;
        finalHtml = templateFn(data);
        
        // Generate plain text version if not provided
        if (!finalText) {
          finalText = finalHtml.replace(/<[^>]*>/g, '');
        }
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${this.defaultFromName}" <${this.defaultFrom}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: finalHtml,
        text: finalText,
        attachments,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.debug(`Email sent to ${to}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send templated email
   */
  async sendTemplated(
    to: string | string[],
    templateName: string,
    data: Record<string, any>,
    subject?: string
  ): Promise<EmailResult> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      return {
        success: false,
        error: `Template "${templateName}" not found`,
      };
    }

    const html = template(data);
    const text = html.replace(/<[^>]*>/g, '');

    return this.send({
      to,
      subject: subject || this.getDefaultSubject(templateName),
      html,
      text,
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push(result);
        
        // Rate limiting delay
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
   * Get default subject for template
   */
  private getDefaultSubject(templateName: string): string {
    const subjects: Record<string, string> = {
      welcome: 'Welcome to VIRAZ!',
      verification: 'Verify Your Email Address',
      'password-reset': 'Reset Your Password',
      'password-changed': 'Your Password Has Been Changed',
      'cap-earned': '🎉 You Earned CAP!',
      withdrawal: 'Withdrawal Processed',
      deposit: 'Deposit Confirmed',
      'campaign-start': '🚀 Campaign Started',
      'campaign-end': '🏁 Campaign Ended',
      'room-invite': 'You\'re Invited to a Room!',
      achievement: '🏆 Achievement Unlocked!',
      'security-alert': '🔐 Security Alert',
      're-engagement': '👋 We Miss You at VIRAZ!',
      'weekly-digest': 'Your VIRAZ Weekly Digest',
      'order-confirmation': 'Order Confirmation',
      'order-shipped': 'Your Order Has Shipped',
      'order-delivered': 'Your Order Has Been Delivered',
      'review-request': 'How Was Your Purchase?',
    };

    return subjects[templateName] || 'Notification from VIRAZ';
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Get email statistics
   */
  async getStats(days: number = 30): Promise<any> {
    // This would track actual email stats in production
    return {
      total: 0,
      sent: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
    };
  }

  /**
   * Add template
   */
  addTemplate(name: string, content: string): void {
    this.templates.set(name, handlebars.compile(content));
    logger.info(`Added email template: ${name}`);
  }

  /**
   * Remove template
   */
  removeTemplate(name: string): void {
    this.templates.delete(name);
    logger.info(`Removed email template: ${name}`);
  }

  /**
   * Get all template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }
}

export const emailService = new EmailService();