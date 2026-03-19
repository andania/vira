/**
 * Cleanup Job
 * Removes old data, temp files, and performs maintenance
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { storageService } from '../../../lib/storage/storage.service';
import { subDays, subMonths } from '@viraz/shared';

export interface CleanupJobData {
  olderThan?: number; // days
  types?: ('sessions' | 'logs' | 'notifications' | 'tempFiles' | 'softDeleted')[];
  dryRun?: boolean;
}

export class CleanupJob {
  static async process(job: Job<CleanupJobData>) {
    const { olderThan = 30, types = ['sessions', 'logs', 'notifications', 'tempFiles', 'softDeleted'], dryRun = false } = job.data;
    
    logger.info(`🔄 Starting cleanup job (older than: ${olderThan} days, types: ${types.join(', ')}, dryRun: ${dryRun})`);

    try {
      const results: any = {};

      // Clean up old sessions
      if (types.includes('sessions')) {
        results.sessions = await this.cleanupSessions(olderThan, dryRun);
      }

      // Clean up old logs
      if (types.includes('logs')) {
        results.logs = await this.cleanupLogs(olderThan, dryRun);
      }

      // Clean up old notifications
      if (types.includes('notifications')) {
        results.notifications = await this.cleanupNotifications(olderThan, dryRun);
      }

      // Clean up temp files
      if (types.includes('tempFiles')) {
        results.tempFiles = await this.cleanupTempFiles(olderThan, dryRun);
      }

      // Permanently delete soft deleted records
      if (types.includes('softDeleted')) {
        results.softDeleted = await this.cleanupSoftDeleted(olderThan, dryRun);
      }

      logger.info('✅ Cleanup job completed', results);
      return results;

    } catch (error) {
      logger.error('❌ Cleanup job failed:', error);
      throw error;
    }
  }

  private static async cleanupSessions(olderThan: number, dryRun: boolean) {
    const cutoffDate = subDays(new Date(), olderThan);

    const expiredSessions = await prisma.userSession.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { lastActivity: { lt: cutoffDate } },
        ],
      },
      select: { id: true },
    });

    if (!dryRun && expiredSessions.length > 0) {
      await prisma.userSession.deleteMany({
        where: {
          id: { in: expiredSessions.map(s => s.id) },
        },
      });
    }

    return {
      action: dryRun ? 'would_delete' : 'deleted',
      count: expiredSessions.length,
    };
  }

  private static async cleanupLogs(olderThan: number, dryRun: boolean) {
    const cutoffDate = subMonths(new Date(), olderThan);

    // Clean up old audit logs
    const oldAuditLogs = await prisma.auditLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (!dryRun && oldAuditLogs > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
    }

    // Clean up old activity logs
    const oldActivityLogs = await prisma.userActivityLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (!dryRun && oldActivityLogs > 0) {
      await prisma.userActivityLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
    }

    // Clean up old error logs
    const oldErrorLogs = await prisma.errorLog.count({
      where: {
        createdAt: { lt: cutoffDate },
        resolved: true, // Only remove resolved errors
      },
    });

    if (!dryRun && oldErrorLogs > 0) {
      await prisma.errorLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          resolved: true,
        },
      });
    }

    return {
      action: dryRun ? 'would_delete' : 'deleted',
      auditLogs: oldAuditLogs,
      activityLogs: oldActivityLogs,
      errorLogs: oldErrorLogs,
    };
  }

  private static async cleanupNotifications(olderThan: number, dryRun: boolean) {
    const cutoffDate = subMonths(new Date(), olderThan);

    // Clean up old notifications that have been read
    const oldNotifications = await prisma.notification.count({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    if (!dryRun && oldNotifications > 0) {
      await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true,
        },
      });
    }

    // Clean up old notification logs
    const oldNotificationLogs = await prisma.notificationLog.count({
      where: {
        sentAt: { lt: cutoffDate },
      },
    });

    if (!dryRun && oldNotificationLogs > 0) {
      await prisma.notificationLog.deleteMany({
        where: {
          sentAt: { lt: cutoffDate },
        },
      });
    }

    return {
      action: dryRun ? 'would_delete' : 'deleted',
      notifications: oldNotifications,
      logs: oldNotificationLogs,
    };
  }

  private static async cleanupTempFiles(olderThan: number, dryRun: boolean) {
    const cutoffDate = subDays(new Date(), 1); // Temp files older than 1 day

    // Get list of temp files from database
    const tempFiles = await prisma.fileRecord.findMany({
      where: {
        isTemp: true,
        createdAt: { lt: cutoffDate },
      },
    });

    if (!dryRun && tempFiles.length > 0) {
      // Delete from storage
      for (const file of tempFiles) {
        try {
          await storageService.delete(file.path);
        } catch (error) {
          logger.error(`Failed to delete temp file ${file.path}:`, error);
        }
      }

      // Delete records
      await prisma.fileRecord.deleteMany({
        where: {
          id: { in: tempFiles.map(f => f.id) },
        },
      });
    }

    return {
      action: dryRun ? 'would_delete' : 'deleted',
      count: tempFiles.length,
    };
  }

  private static async cleanupSoftDeleted(olderThan: number, dryRun: boolean) {
    const cutoffDate = subMonths(new Date(), olderThan);
    const results: any = {};

    // Users soft deleted for more than X months
    const oldDeletedUsers = await prisma.user.findMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (!dryRun && oldDeletedUsers.length > 0) {
      // First delete related records
      for (const user of oldDeletedUsers) {
        await prisma.$transaction([
          prisma.userProfile.deleteMany({ where: { userId: user.id } }),
          prisma.userPreferences.deleteMany({ where: { userId: user.id } }),
          prisma.userSession.deleteMany({ where: { userId: user.id } }),
          prisma.capWallet.deleteMany({ where: { userId: user.id } }),
          prisma.notification.deleteMany({ where: { userId: user.id } }),
          // Finally delete the user
          prisma.user.delete({ where: { id: user.id } }),
        ]);
      }
    }
    results.users = oldDeletedUsers.length;

    // Campaigns soft deleted for more than X months
    const oldDeletedCampaigns = await prisma.campaign.findMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (!dryRun && oldDeletedCampaigns.length > 0) {
      for (const campaign of oldDeletedCampaigns) {
        await prisma.$transaction([
          prisma.ad.deleteMany({ where: { campaignId: campaign.id } }),
          prisma.campaignTarget.deleteMany({ where: { campaignId: campaign.id } }),
          prisma.campaignBudget.deleteMany({ where: { campaignId: campaign.id } }),
          prisma.campaignMetric.deleteMany({ where: { campaignId: campaign.id } }),
          prisma.campaign.delete({ where: { id: campaign.id } }),
        ]);
      }
    }
    results.campaigns = oldDeletedCampaigns.length;

    // Products soft deleted for more than X months
    const oldDeletedProducts = await prisma.product.findMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (!dryRun && oldDeletedProducts.length > 0) {
      for (const product of oldDeletedProducts) {
        await prisma.$transaction([
          prisma.productImage.deleteMany({ where: { productId: product.id } }),
          prisma.productVariant.deleteMany({ where: { productId: product.id } }),
          prisma.productReview.deleteMany({ where: { productId: product.id } }),
          prisma.product.delete({ where: { id: product.id } }),
        ]);
      }
    }
    results.products = oldDeletedProducts.length;

    return {
      action: dryRun ? 'would_delete' : 'deleted',
      ...results,
    };
  }
}

export default CleanupJob;