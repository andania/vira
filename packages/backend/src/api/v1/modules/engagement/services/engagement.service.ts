/**
 * Engagement Service
 * Handles user engagement actions (likes, comments, shares, etc.)
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { rewardService } from './reward.service';
import { DEFAULT_REWARD_WEIGHTS } from '@viraz/shared';

export interface EngagementData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'product' | 'comment' | 'brand';
  targetId: string;
  action: 'like' | 'comment' | 'share' | 'click' | 'view' | 'save' | 'report';
  metadata?: Record<string, any>;
}

export interface CommentData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'product';
  targetId: string;
  content: string;
  parentId?: string;
  mentions?: string[];
}

export class EngagementService {
  /**
   * Process engagement action
   */
  async processEngagement(data: EngagementData) {
    try {
      const { userId, targetType, targetId, action, metadata } = data;

      // Check for duplicate (prevent spam)
      const recentEngagement = await this.checkDuplicateEngagement(userId, targetType, targetId, action);
      if (recentEngagement) {
        return { success: false, message: 'Action already performed recently' };
      }

      let result;

      switch (action) {
        case 'like':
          result = await this.toggleLike(userId, targetType, targetId);
          break;
        case 'comment':
          // Comments are handled separately via createComment
          return { success: false, message: 'Use createComment for comments' };
        case 'share':
          result = await this.createShare(userId, targetType, targetId, metadata);
          break;
        case 'click':
          result = await this.trackClick(userId, targetType, targetId, metadata);
          break;
        case 'view':
          result = await this.trackView(userId, targetType, targetId, metadata);
          break;
        case 'save':
          result = await this.toggleSave(userId, targetType, targetId);
          break;
        case 'report':
          result = await this.createReport(userId, targetType, targetId, metadata);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Award CAP for engagement
      if (result.success && action !== 'view' && action !== 'report') {
        const rewardAmount = DEFAULT_REWARD_WEIGHTS[action as keyof typeof DEFAULT_REWARD_WEIGHTS] || 0;
        if (rewardAmount > 0) {
          await rewardService.awardReward({
            userId,
            action,
            targetType,
            targetId,
            amount: rewardAmount,
          });
        }
      }

      // Update engagement counts in cache
      await this.updateEngagementCounts(targetType, targetId, action);

      logger.info(`Engagement processed: ${userId} - ${action} on ${targetType}:${targetId}`);
      return result;
    } catch (error) {
      logger.error('Error processing engagement:', error);
      throw error;
    }
  }

  /**
   * Create comment
   */
  async createComment(data: CommentData) {
    try {
      const { userId, targetType, targetId, content, parentId, mentions } = data;

      // Check if target exists
      const targetExists = await this.checkTargetExists(targetType, targetId);
      if (!targetExists) {
        throw new Error(`${targetType} not found`);
      }

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          userId,
          targetType,
          targetId,
          content,
          parentId,
          mentions: mentions || [],
        },
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
        },
      });

      // Award CAP for comment
      await rewardService.awardReward({
        userId,
        action: 'comment',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.comment,
      });

      // Update comment count
      await this.updateEngagementCounts(targetType, targetId, 'comment');

      // Handle mentions
      if (mentions && mentions.length > 0) {
        await this.handleMentions(mentions, comment);
      }

      // Notify content owner
      await this.notifyContentOwner(targetType, targetId, 'comment', userId, content);

      logger.info(`Comment created: ${comment.id}`);
      return { success: true, data: comment };
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Toggle like
   */
  private async toggleLike(userId: string, targetType: string, targetId: string) {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: targetType as any,
          targetId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: targetType as any,
            targetId,
          },
        },
      });
      return { success: true, action: 'unliked' };
    } else {
      // Like
      const like = await prisma.like.create({
        data: {
          userId,
          targetType: targetType as any,
          targetId,
        },
      });
      return { success: true, action: 'liked', data: like };
    }
  }

  /**
   * Create share
   */
  private async createShare(userId: string, targetType: string, targetId: string, metadata?: any) {
    const share = await prisma.share.create({
      data: {
        userId,
        targetType: targetType as any,
        targetId,
        platform: metadata?.platform || 'internal',
        shareUrl: metadata?.shareUrl,
      },
    });

    return { success: true, data: share };
  }

  /**
   * Track click
   */
  private async trackClick(userId: string, targetType: string, targetId: string, metadata?: any) {
    const click = await prisma.contentClick.create({
      data: {
        userId,
        targetType: targetType as any,
        targetId,
        destinationUrl: metadata?.url,
        timeSpentSeconds: metadata?.timeSpent,
      },
    });

    return { success: true, data: click };
  }

  /**
   * Track view
   */
  private async trackView(userId: string, targetType: string, targetId: string, metadata?: any) {
    const view = await prisma.contentView.create({
      data: {
        userId,
        targetType: targetType as any,
        targetId,
        viewDuration: metadata?.duration,
        viewedPercentage: metadata?.percentage,
        completed: metadata?.completed || false,
      },
    });

    return { success: true, data: view };
  }

  /**
   * Toggle save
   */
  private async toggleSave(userId: string, targetType: string, targetId: string) {
    // Check if already saved
    const existingSave = await prisma.savedItem.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: targetType as any,
          targetId,
        },
      },
    });

    if (existingSave) {
      // Unsave
      await prisma.savedItem.delete({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: targetType as any,
            targetId,
          },
        },
      });
      return { success: true, action: 'unsaved' };
    } else {
      // Save
      const saved = await prisma.savedItem.create({
        data: {
          userId,
          targetType: targetType as any,
          targetId,
        },
      });
      return { success: true, action: 'saved', data: saved };
    }
  }

  /**
   * Create report
   */
  private async createReport(userId: string, targetType: string, targetId: string, metadata?: any) {
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedContentType: targetType,
        reportedContentId: targetId,
        reportType: metadata?.reportType || 'other',
        description: metadata?.description,
        evidenceUrls: metadata?.evidenceUrls,
      },
    });

    return { success: true, data: report };
  }

  /**
   * Check for duplicate engagement
   */
  private async checkDuplicateEngagement(
    userId: string,
    targetType: string,
    targetId: string,
    action: string
  ): Promise<boolean> {
    const key = `engagement:duplicate:${userId}:${targetType}:${targetId}:${action}`;
    const exists = await redis.get(key);
    
    if (exists) {
      return true;
    }

    // Set cooldown based on action
    let cooldown = 5; // seconds
    switch (action) {
      case 'like':
        cooldown = 2;
        break;
      case 'share':
        cooldown = 10;
        break;
      case 'click':
        cooldown = 1;
        break;
      case 'view':
        cooldown = 60; // 1 minute
        break;
    }

    await redis.setex(key, cooldown, '1');
    return false;
  }

  /**
   * Check if target exists
   */
  private async checkTargetExists(targetType: string, targetId: string): Promise<boolean> {
    switch (targetType) {
      case 'ad':
        return !!(await prisma.ad.findUnique({ where: { id: targetId } }));
      case 'room':
        return !!(await prisma.room.findUnique({ where: { id: targetId } }));
      case 'campaign':
        return !!(await prisma.campaign.findUnique({ where: { id: targetId } }));
      case 'product':
        return !!(await prisma.product.findUnique({ where: { id: targetId } }));
      case 'brand':
        return !!(await prisma.brand.findUnique({ where: { id: targetId } }));
      default:
        return false;
    }
  }

  /**
   * Update engagement counts in cache
   */
  private async updateEngagementCounts(targetType: string, targetId: string, action: string) {
    const key = `engagement:counts:${targetType}:${targetId}`;
    await redis.hincrby(key, action, 1);
    await redis.expire(key, 86400); // 24 hours
  }

  /**
   * Handle mentions in comments
   */
  private async handleMentions(mentions: string[], comment: any) {
    for (const mentionedId of mentions) {
      if (mentionedId === comment.userId) continue; // Don't notify self

      await notificationService.create({
        userId: mentionedId,
        type: 'ENGAGEMENT',
        title: '📨 You were mentioned',
        body: `${comment.user?.username || 'Someone'} mentioned you in a comment`,
        data: {
          screen: 'engagement',
          action: 'view',
          id: comment.id,
        },
      });
    }
  }

  /**
   * Notify content owner of engagement
   */
  private async notifyContentOwner(
    targetType: string,
    targetId: string,
    action: string,
    actorId: string,
    extra?: string
  ) {
    let ownerId: string | null = null;

    switch (targetType) {
      case 'ad':
        const ad = await prisma.ad.findUnique({
          where: { id: targetId },
          include: { campaign: { include: { brand: true } } },
        });
        ownerId = ad?.campaign?.brand?.sponsorId || null;
        break;
      case 'room':
        const room = await prisma.room.findUnique({
          where: { id: targetId },
          include: { hosts: true },
        });
        ownerId = room?.hosts[0]?.userId || null;
        break;
      case 'campaign':
        const campaign = await prisma.campaign.findUnique({
          where: { id: targetId },
          include: { brand: true },
        });
        ownerId = campaign?.brand?.sponsorId || null;
        break;
      case 'product':
        const product = await prisma.product.findUnique({
          where: { id: targetId },
          include: { brand: true },
        });
        ownerId = product?.brand?.sponsorId || null;
        break;
    }

    if (ownerId && ownerId !== actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { username: true },
      });

      let title = '';
      let body = '';

      switch (action) {
        case 'like':
          title = '❤️ New Like';
          body = `${actor?.username} liked your ${targetType}`;
          break;
        case 'comment':
          title = '💬 New Comment';
          body = `${actor?.username} commented: ${extra?.substring(0, 50)}...`;
          break;
        case 'share':
          title = '📤 New Share';
          body = `${actor?.username} shared your ${targetType}`;
          break;
      }

      await notificationService.create({
        userId: ownerId,
        type: 'ENGAGEMENT',
        title,
        body,
        data: {
          screen: targetType,
          action: 'view',
          id: targetId,
        },
      });
    }
  }

  /**
   * Get engagement counts for target
   */
  async getEngagementCounts(targetType: string, targetId: string) {
    const cacheKey = `engagement:counts:${targetType}:${targetId}`;
    const cached = await redis.hgetall(cacheKey);
    
    if (Object.keys(cached).length > 0) {
      return {
        likes: parseInt(cached.likes || '0'),
        comments: parseInt(cached.comments || '0'),
        shares: parseInt(cached.shares || '0'),
        views: parseInt(cached.views || '0'),
        saves: parseInt(cached.saves || '0'),
      };
    }

    // Get from database
    const [likes, comments, shares, views, saves] = await Promise.all([
      prisma.like.count({ where: { targetType: targetType as any, targetId } }),
      prisma.comment.count({ where: { targetType: targetType as any, targetId } }),
      prisma.share.count({ where: { targetType: targetType as any, targetId } }),
      prisma.contentView.count({ where: { targetType: targetType as any, targetId } }),
      prisma.savedItem.count({ where: { targetType: targetType as any, targetId } }),
    ]);

    const counts = { likes, comments, shares, views, saves };
    
    // Cache for 5 minutes
    await redis.hmset(cacheKey, counts);
    await redis.expire(cacheKey, 300);

    return counts;
  }

  /**
   * Get user's engagement history
   */
  async getUserEngagement(userId: string, limit: number = 50, offset: number = 0) {
    const [engagements, total] = await Promise.all([
      prisma.userEngagement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
        },
      }),
      prisma.userEngagement.count({ where: { userId } }),
    ]);

    return { engagements, total };
  }
}

export const engagementService = new EngagementService();