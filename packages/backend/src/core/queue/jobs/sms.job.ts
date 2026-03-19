/**
 * SMS Processing Job
 * Handles queued SMS messages
 */

import { Job } from 'bull';
import { logger } from '../../logger';
import { smsService } from '../../../lib/sms/sms.service';
import { prisma } from '../../database/client';

export interface SmsJobData {
  smsId: string;
  to: string;
  message: string;
  template?: string;
  data?: any;
}

export class SmsJob {
  static async process(job: Job<SmsJobData>) {
    const { smsId, to, message, template, data } = job.data;
    
    logger.info(`🔄 Processing SMS ${smsId} to ${to}`);

    try {
      // Update status to processing
      await prisma.smsNotification.update({
        where: { id: smsId },
        data: { status: 'processing' },
      });

      // Send SMS
      const result = await smsService.send(to, message, template, data);

      // Update success status
      await prisma.smsNotification.update({
        where: { id: smsId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.info(`✅ SMS ${smsId} sent successfully`);
      return { status: 'sent', messageId: result.sid };

    } catch (error) {
      logger.error(`❌ Failed to send SMS ${smsId}:`, error);

      // Update failure status
      await prisma.smsNotification.update({
        where: { id: smsId },
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

export default SmsJob;