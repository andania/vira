/**
 * Notification Processing Job
 * Handles queued notifications
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { emailService } from '../../../lib/email/email.service';
import { smsService } from '../../../lib/sms/sms.service';
import { pushService } from '../../../lib/push/push.service';
import { NotificationType, NotificationPriority } from '@viraz/shared';

export interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: NotificationType;
  channel: 'push' | 'email' | 'sms' | 'in-app';
  title: string;
  body: string;
  data?: any;
  priority?: NotificationPriority;
}

export class NotificationJob {
  static async process(job: Job<NotificationJobData>) {
    const { notificationId, userId, channel, title, body, data, priority } = job.data;
    
    logger.info(`🔄 Processing notification ${notificationId} via ${channel}`);

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          devices: {
            where: { isActive: true },
          },
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Check user preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (preferences) {
        const channelPref = preferences[`${channel}Enabled`];
        if (!channelPref) {
          logger.debug(`User ${userId} has disabled ${channel} notifications`);
          await this.updateNotificationStatus(notificationId, 'skipped');
          return { status: 'skipped', reason: 'user_disabled' };
        }

        // Check quiet hours
        if (preferences.quietHoursStart && preferences.quietHoursEnd) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
          const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

          const currentTime = currentHour * 60 + currentMinute;
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          if (currentTime >= startTime && currentTime <= endTime) {
            logger.debug(`User ${userId} is in quiet hours, rescheduling notification`);
            await this.rescheduleNotification(notificationId);
            return { status: 'rescheduled', reason: 'quiet_hours' };
          }
        }
      }

      // Send notification based on channel
      let result;
      switch (channel) {
        case 'push':
          result = await this.sendPush(user, title, body, data);
          break;
        case 'email':
          result = await this.sendEmail(user, title, body, data);
          break;
        case 'sms':
          result = await this.sendSms(user, body);
          break;
        case 'in-app':
          result = await this.sendInApp(userId, title, body, data);
          break;
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, 'sent', result);

      logger.info(`✅ Notification ${notificationId} sent successfully via ${channel}`);
      return { status: 'sent', channel, result };

    } catch (error) {
      logger.error(`❌ Failed to send notification ${notificationId}:`, error);
      
      // Update notification status
      await this.updateNotificationStatus(notificationId, 'failed', null, error.message);
      
      // Retry logic
      if (job.attemptsMade < (job.opts?.attempts || 3)) {
        throw error; // Bull will retry
      }
      
      return { status: 'failed', error: error.message };
    }
  }

  private static async sendPush(user: any, title: string, body: string, data?: any) {
    const deviceTokens = user.devices
      .filter((d: any) => d.pushToken)
      .map((d: any) => d.pushToken);

    if (deviceTokens.length === 0) {
      throw new Error('No device tokens found');
    }

    return pushService.sendToDevices(deviceTokens, {
      title,
      body,
      data,
    });
  }

  private static async sendEmail(user: any, title: string, body: string, data?: any) {
    if (!user.email) {
      throw new Error('User has no email address');
    }

    return emailService.send({
      to: user.email,
      subject: title,
      html: body,
      text: body.replace(/<[^>]*>/g, ''),
    });
  }

  private static async sendSms(user: any, message: string) {
    if (!user.phone) {
      throw new Error('User has no phone number');
    }

    return smsService.send(user.phone, message);
  }

  private static async sendInApp(userId: string, title: string, body: string, data?: any) {
    return prisma.notification.create({
      data: {
        userId,
        type: data?.type || 'SYSTEM',
        title,
        body,
        data,
        isRead: false,
      },
    });
  }

  private static async updateNotificationStatus(
    notificationId: string,
    status: string,
    result?: any,
    error?: string
  ) {
    await prisma.notificationLog.create({
      data: {
        notificationId,
        status,
        result: result ? JSON.stringify(result) : null,
        error,
      },
    });
  }

  private static async rescheduleNotification(notificationId: string) {
    // Reschedule for after quiet hours
    const job = await NotificationJob.schedule(notificationId, 60 * 60 * 1000); // 1 hour
    return job;
  }

  static async schedule(notificationId: string, delayMs: number) {
    const queue = (await import('../bull.queue')).queues.notification;
    return queue.add(
      'send-notification',
      { notificationId },
      { delay: delayMs }
    );
  }
}

export default NotificationJob;