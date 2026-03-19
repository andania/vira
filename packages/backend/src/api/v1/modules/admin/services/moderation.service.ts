/**
 * Moderation Service
 * Handles content moderation and report management
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { ApiErrorCode } from '@viraz/shared';

export interface ModerationAction {
  id: string;
  moderatorId: string;
  targetUserId?: string;
  targetContentType?: string;
  targetContentId?: string;
  actionType: 'warning' | 'mute' | 'suspend' | 'ban' | 'content_removal';
  duration?: number;
  reason: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedContentType?: string;
  reportedContentId?: string;
  reportType: string;
  description?: string;
  evidenceUrls?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
}

export class ModerationService {
  /**
   * Get moderation queue
   */
  async getModerationQueue(
    filters: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { type, status = 'pending', limit = 50, offset = 0 } = filters;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (type && type !== 'all') {
        switch (type) {
          case 'rooms':
            where.reportedContentType = 'room';
            break;
          case 'messages':
            where.reportedContentType = 'message';
            break;
          case 'users':
            where.reportedUserId = { not: null };
            break;
        }
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          take: limit,
          skip: offset,
          include: {
            reporter: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
            reportedUser: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        }),
        prisma.report.count({ where }),
      ]);

      return { reports, total };
    } catch (error) {
      logger.error('Error getting moderation queue:', error);
      throw error;
    }
  }

  /**
   * Get report details
   */
  async getReportDetails(reportId: string) {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
              statistics: {
                select: {
                  totalReports: true,
                },
              },
            },
          },
          evidence: true,
        },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // Get reported content if applicable
      let content = null;
      if (report.reportedContentType && report.reportedContentId) {
        switch (report.reportedContentType) {
          case 'room':
            content = await prisma.room.findUnique({
              where: { id: report.reportedContentId },
              include: {
                brand: true,
                hosts: {
                  include: {
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            });
            break;
          case 'message':
            content = await prisma.roomMessage.findUnique({
              where: { id: report.reportedContentId },
              include: {
                user: {
                  select: {
                    username: true,
                    profile: {
                      select: {
                        displayName: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
                room: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });
            break;
          case 'comment':
            content = await prisma.comment.findUnique({
              where: { id: report.reportedContentId },
              include: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            });
            break;
        }
      }

      return {
        ...report,
        content,
      };
    } catch (error) {
      logger.error('Error getting report details:', error);
      throw error;
    }
  }

  /**
   * Resolve report
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    resolution: string,
    action?: string
  ) {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // Update report status
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'resolved',
          resolvedBy: moderatorId,
          resolvedAt: new Date(),
          resolutionNotes: resolution,
        },
      });

      // Take action if specified
      if (action && report.reportedUserId) {
        await this.takeAction({
          moderatorId,
          targetUserId: report.reportedUserId,
          actionType: action as any,
          reason: resolution,
        });
      }

      // Notify reporter
      await notificationService.create({
        userId: report.reporterId,
        type: 'SYSTEM',
        title: '📋 Report Resolved',
        body: 'Your report has been reviewed and resolved.',
        data: {
          screen: 'support',
          action: 'reports',
        },
      });

      logger.info(`Report ${reportId} resolved by ${moderatorId}`);
    } catch (error) {
      logger.error('Error resolving report:', error);
      throw error;
    }
  }

  /**
   * Dismiss report
   */
  async dismissReport(reportId: string, moderatorId: string, reason: string) {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'dismissed',
          resolvedBy: moderatorId,
          resolvedAt: new Date(),
          resolutionNotes: reason,
        },
      });

      logger.info(`Report ${reportId} dismissed by ${moderatorId}`);
    } catch (error) {
      logger.error('Error dismissing report:', error);
      throw error;
    }
  }

  /**
   * Take moderation action against user
   */
  async takeAction(data: {
    moderatorId: string;
    targetUserId: string;
    actionType: 'warning' | 'mute' | 'suspend' | 'ban';
    duration?: number;
    reason: string;
  }) {
    try {
      const { moderatorId, targetUserId, actionType, duration, reason } = data;

      const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined;

      // Create action record
      const action = await prisma.moderationAction.create({
        data: {
          moderatorId,
          targetUserId,
          actionType,
          duration: duration ? duration * 60 * 60 * 1000 : null,
          reason,
          expiresAt,
        },
      });

      // Apply action
      switch (actionType) {
        case 'warning':
          await this.issueWarning(targetUserId, reason);
          break;
        case 'mute':
          await this.muteUser(targetUserId, duration);
          break;
        case 'suspend':
          await this.suspendUser(targetUserId, reason, duration);
          break;
        case 'ban':
          await this.banUser(targetUserId, reason);
          break;
      }

      // Notify user
      await notificationService.create({
        userId: targetUserId,
        type: 'SYSTEM',
        priority: 'high',
        title: `⚠️ Account ${actionType}`,
        body: reason,
        data: {
          screen: 'support',
          action: 'appeal',
        },
      });

      logger.info(`Moderation action taken against user ${targetUserId}: ${actionType}`);
      return action;
    } catch (error) {
      logger.error('Error taking moderation action:', error);
      throw error;
    }
  }

  /**
   * Issue warning to user
   */
  private async issueWarning(userId: string, reason: string) {
    // Update warning count
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        warnings: {
          increment: 1,
        },
      },
      create: {
        userId,
        warnings: 1,
      },
    });
  }

  /**
   * Mute user
   */
  private async muteUser(userId: string, duration?: number) {
    // Mute implementation (could be in Redis)
    const muteKey = `muted:${userId}`;
    if (duration) {
      await redis.setex(muteKey, duration * 60 * 60, '1');
    } else {
      await redis.set(muteKey, '1');
    }
  }

  /**
   * Suspend user
   */
  private async suspendUser(userId: string, reason: string, duration?: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
      },
    });

    // Schedule unsuspension if duration provided
    if (duration) {
      // This would be handled by a background job
      logger.info(`User ${userId} will be unsuspended in ${duration} hours`);
    }
  }

  /**
   * Ban user
   */
  private async banUser(userId: string, reason: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BANNED',
      },
    });

    await prisma.blacklistedUser.create({
      data: {
        userId,
        reason,
      },
    });
  }

  /**
   * Remove moderation action
   */
  async removeAction(actionId: string) {
    try {
      const action = await prisma.moderationAction.findUnique({
        where: { id: actionId },
      });

      if (!action) {
        throw new Error('Action not found');
      }

      // Reverse the action
      switch (action.actionType) {
        case 'mute':
          await redis.del(`muted:${action.targetUserId}`);
          break;
        case 'suspend':
          await prisma.user.update({
            where: { id: action.targetUserId },
            data: { status: 'ACTIVE' },
          });
          break;
      }

      await prisma.moderationAction.delete({
        where: { id: actionId },
      });

      logger.info(`Moderation action ${actionId} removed`);
    } catch (error) {
      logger.error('Error removing moderation action:', error);
      throw error;
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats() {
    try {
      const [
        pendingReports,
        resolvedToday,
        actionsToday,
        topReported,
        topReporters,
      ] = await Promise.all([
        prisma.report.count({
          where: { status: 'pending' },
        }),
        prisma.report.count({
          where: {
            status: 'resolved',
            resolvedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.moderationAction.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.report.groupBy({
          by: ['reportedUserId'],
          where: { reportedUserId: { not: null } },
          _count: true,
          orderBy: {
            _count: {
              reportedUserId: 'desc',
            },
          },
          take: 5,
        }),
        prisma.report.groupBy({
          by: ['reporterId'],
          _count: true,
          orderBy: {
            _count: {
              reporterId: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      // Get user details for top lists
      const topReportedIds = topReported.map(r => r.reportedUserId).filter(Boolean);
      const topReporterIds = topReporters.map(r => r.reporterId);

      const [reportedUsers, reporters] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: topReportedIds as string[] } },
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        }),
        prisma.user.findMany({
          where: { id: { in: topReporterIds } },
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        }),
      ]);

      const reportedMap = new Map(reportedUsers.map(u => [u.id, u]));
      const reporterMap = new Map(reporters.map(u => [u.id, u]));

      return {
        overview: {
          pendingReports,
          resolvedToday,
          actionsToday,
        },
        topReported: topReported.map(r => ({
          userId: r.reportedUserId,
          username: reportedMap.get(r.reportedUserId as string)?.username,
          displayName: reportedMap.get(r.reportedUserId as string)?.profile?.displayName,
          count: r._count,
        })),
        topReporters: topReporters.map(r => ({
          userId: r.reporterId,
          username: reporterMap.get(r.reporterId)?.username,
          displayName: reporterMap.get(r.reporterId)?.profile?.displayName,
          count: r._count,
        })),
      };
    } catch (error) {
      logger.error('Error getting moderation stats:', error);
      throw error;
    }
  }

  /**
   * Moderate content (automated)
   */
  async moderateContent(content: string, type: string): Promise<{
    flagged: boolean;
    reasons?: string[];
    confidence?: number;
  }> {
    // This would integrate with an AI moderation service
    // Simplified version for now
    const flaggedWords = ['spam', 'abuse', 'hate', 'violence'];
    const found = flaggedWords.filter(word => 
      content.toLowerCase().includes(word)
    );

    return {
      flagged: found.length > 0,
      reasons: found.length > 0 ? found : undefined,
      confidence: found.length > 0 ? 0.8 : 0,
    };
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const [actions, total] = await Promise.all([
        prisma.moderationAction.findMany({
          where: { targetUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            moderator: {
              select: {
                username: true,
              },
            },
          },
        }),
        prisma.moderationAction.count({ where: { targetUserId: userId } }),
      ]);

      return { actions, total };
    } catch (error) {
      logger.error('Error getting user moderation history:', error);
      throw error;
    }
  }

  /**
   * Get room moderation history
   */
  async getRoomModerationHistory(roomId: string, limit: number = 50, offset: number = 0) {
    try {
      const [actions, total] = await Promise.all([
        prisma.roomModerationAction.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            moderator: {
              select: {
                username: true,
              },
            },
            targetUser: {
              select: {
                username: true,
              },
            },
          },
        }),
        prisma.roomModerationAction.count({ where: { roomId } }),
      ]);

      return { actions, total };
    } catch (error) {
      logger.error('Error getting room moderation history:', error);
      throw error;
    }
  }
}

export const moderationService = new ModerationService();