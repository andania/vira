/**
 * Email Notification Service
 * Handles sending email notifications via SMTP/SendGrid
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';

export interface EmailData {
  to: string;
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
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private templates: Map<string, HandlebarsTemplateFunction> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter() {
    try {
      if (config.smtpHost && config.smtpUser && config.smtpPass) {
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
        });

        logger.info('✅ Email transporter initialized');
      } else {
        logger.warn('⚠️ SMTP credentials not configured, email notifications disabled');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize email transporter:', error);
    }
  }

  /**
   * Load email templates
   */
  private loadTemplates() {
    const templateDir = path.join(__dirname, '../../../../../lib/email/templates');
    
    try {
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

      logger.info(`✅ Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('❌ Failed to load email templates:', error);
    }
  }

  /**
   * Send email
   */
  async send(data: EmailData): Promise<EmailResult> {
    if (!this.transporter) {
      return this.mockSend(data);
    }

    try {
      let html = data.html;
      let text = data.text;

      // Use template if provided
      if (data.template && this.templates.has(data.template)) {
        const template = this.templates.get(data.template)!;
        html = template(data.data || {});
        
        // Generate plain text version if not provided
        if (!text) {
          text = html.replace(/<[^>]*>/g, '');
        }
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${config.smtpFromName}" <${config.smtpFrom}>`,
        to: data.to,
        subject: data.subject,
        html,
        text,
        attachments: data.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log successful email
      await prisma.emailNotification.create({
        data: {
          userId: 'system', // Will be updated by calling service
          emailTo: data.to,
          subject: data.subject,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.debug(`Email sent to ${data.to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Error sending email:', error);

      // Log failed email
      await prisma.emailNotification.create({
        data: {
          userId: 'system',
          emailTo: data.to,
          subject: data.subject,
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
   * Send bulk emails
   */
  async sendBulk(emails: EmailData[]): Promise<EmailResult[]> {
    if (!this.transporter) {
      return emails.map(email => this.mockSend(email));
    }

    const results: EmailResult[] = [];

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push(result);
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
   * Send templated email
   */
  async sendTemplated(
    to: string,
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
   * Get default subject for template
   */
  private getDefaultSubject(templateName: string): string {
    const subjects: Record<string, string> = {
      welcome: 'Welcome to VIRAZ!',
      verification: 'Verify Your Email Address',
      'password-reset': 'Reset Your Password',
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
    };

    return subjects[templateName] || 'Notification from VIRAZ';
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Mock send for development
   */
  private mockSend(data: EmailData): EmailResult {
    logger.debug('📧 [MOCK] Email sent:', {
      to: data.to,
      subject: data.subject,
      template: data.template,
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  /**
   * Get email statistics
   */
  async getStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, sent, failed, byTemplate] = await Promise.all([
      prisma.emailNotification.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.emailNotification.count({
        where: {
          status: 'sent',
          createdAt: { gte: startDate },
        },
      }),
      prisma.emailNotification.count({
        where: {
          status: 'failed',
          createdAt: { gte: startDate },
        },
      }),
      prisma.emailNotification.groupBy({
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

export const emailService = new EmailService();