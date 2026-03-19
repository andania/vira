/**
 * Push Notification Processing Job
 * Handles queued push notifications
 */

import { Job } from 'bull';
import { logger } from '../../logger';
import { pushService } from '../../../lib/push/push.service';
import { prisma } from '../../database/client';

export interface PushJobData {
  pushId: string;
  userId: string;
  deviceTokens: string[];
  title: string;
  body: string;
  data?: any;
}

export class PushJob {
  static async process(job: Job<PushJobData>) {
    const { pushId, userId, deviceTokens, title, body, data } = job.data;
    
    logger.info(`🔄 Processing push notification ${pushId} for user ${userId}`);

    try {
      // Update status to processing
      await prisma.pushNotification.update({
        where: { id: pushId },
        data: { status: 'processing' },
      });

      // Send push notification
      const result = await pushService.sendToDevices(deviceTokens, {
        title,
        body,
        data,
      });

      // Update success status
      await prisma.pushNotification.update({
        where: { id: pushId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.info(`✅ Push notification ${pushId} sent successfully`);
      return { status: 'sent', results: result };

    } catch (error) {
      logger.error(`❌ Failed to send push notification ${pushId}:`, error);

      // Update failure status
      await prisma.pushNotification.update({
        where: { id: pushId },
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

export default PushJob;