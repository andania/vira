/**
 * Email Processing Job
 * Handles queued emails
 */

import { Job } from 'bull';
import { logger } from '../../logger';
import { emailService } from '../../../lib/email/email.service';
import { prisma } from '../../database/client';

export interface EmailJobData {
  emailId: string;
  to: string;
  subject: string;
  template?: string;
  data?: any;
  html?: string;
  text?: string;
  attachments?: any[];
}

export class EmailJob {
  static async process(job: Job<EmailJobData>) {
    const { emailId, to, subject, template, data, html, text, attachments } = job.data;
    
    logger.info(`🔄 Processing email ${emailId} to ${to}`);

    try {
      // Update status to processing
      await prisma.emailNotification.update({
        where: { id: emailId },
        data: { status: 'processing' },
      });

      // Send email
      const result = await emailService.send({
        to,
        subject,
        template,
        data,
        html,
        text,
        attachments,
      });

      // Update success status
      await prisma.emailNotification.update({
        where: { id: emailId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.info(`✅ Email ${emailId} sent successfully`);
      return { status: 'sent', messageId: result.messageId };

    } catch (error) {
      logger.error(`❌ Failed to send email ${emailId}:`, error);

      // Update failure status
      await prisma.emailNotification.update({
        where: { id: emailId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          retryCount: {
            increment: 1,
          },
        },
      });

      // Retry logic
      if (job.attemptsMade < (job.opts?.attempts || 3)) {
        throw error; // Bull will retry
      }

      return { status: 'failed', error: error.message };
    }
  }
}

export default EmailJob;