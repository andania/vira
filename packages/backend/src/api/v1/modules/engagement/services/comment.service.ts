/**
 * Comment Service
 * Handles comment operations and management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { moderationService } from '../../../admin/services/moderation.service';

export interface CommentData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'product';
  targetId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(data: CommentData) {
    try {
      const { userId, targetType, targetId, content, parentId } = data;

      // Check if target exists
      const targetExists = await this.checkTargetExists(targetType, targetId);
      if (!targetExists) {
        throw new Error(`${targetType} not found`);
      }

      // Check if parent comment exists (if replying)
      if (parentId) {
        const parentExists = await prisma.comment.findUnique({
          where: { id: parentId },
        });
        if (!parentExists) {
          throw new Error('Parent comment not found');
        }
      }

      // Moderate content
      const moderationResult = await moderationService.moderateContent(content, 'comment');
      if (moderationResult.flagged) {
        throw new Error('Comment contains inappropriate content');
      }

      // Extract mentions from content
      const mentions = this.extractMentions(content);

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          userId,
          targetType: targetType as any,
          targetId,
          content,
          parentId,
          mentions,
        },
        include: {
          user: {
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
        },
      });

      // Update comment count in cache
      await this.updateCommentCount(targetType, targetId, 1);

      // Handle mentions
      if (mentions.length > 0) {
        await this.handleMentions(mentions, comment);
      }

      // Notify parent comment owner (if replying)
      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
        });
        if (parentComment && parentComment.userId !== userId) {
          await notificationService.create({
            userId: parentComment.userId,
            type: 'ENGAGEMENT',
            title: '↩️ New Reply',
            body: `${comment.user?.username || 'Someone'} replied to your comment`,
            data: {
              screen: 'engagement',
              action: 'view',
              id: comment.id,
            },
          });
        }
      }

      // Notify content owner
      await this.notifyContentOwner(targetType, targetId, userId, comment);

      logger.info(`Comment created: ${comment.id}`);
      return comment;
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a target
   */
  async getComments(
    targetType: string,
    targetId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'recent' | 'popular';
      parentId?: string | null;
    } = {}
  ) {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'recent',
        parentId = null,
      } = options;

      const where: any = {
        targetType: targetType as any,
        targetId,
        parentId: parentId === null ? null : parentId,
        isDeleted: false,
      };

      const orderBy = sortBy === 'recent' 
        ? { createdAt: 'desc' as const }
        : { likes: { _count: 'desc' as const } };

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            user: {
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
            _count: {
              select: {
                replies: true,
                likes: true,
              },
            },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.comment.count({ where }),
      ]);

      // Get like status for current user (if authenticated)
      // This would be implemented with a separate query

      return {
        comments,
        total,
        hasMore: offset + comments.length < total,
      };
    } catch (error) {
      logger.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Get a single comment
   */
  async getComment(commentId: string) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          user: {
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
          replies: {
            take: 5,
            orderBy: { createdAt: 'desc' },
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
          },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
        },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      return comment;
    } catch (error) {
      logger.error('Error getting comment:', error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, data: UpdateCommentData) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new Error('Not authorized to update this comment');
      }

      // Moderate updated content
      const moderationResult = await moderationService.moderateContent(data.content, 'comment');
      if (moderationResult.flagged) {
        throw new Error('Comment contains inappropriate content');
      }

      // Extract new mentions
      const mentions = this.extractMentions(data.content);

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: {
          content: data.content,
          mentions,
          isEdited: true,
          updatedAt: new Date(),
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

      logger.info(`Comment updated: ${commentId}`);
      return updated;
    } catch (error) {
      logger.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      // Check if user is authorized (comment owner, content owner, or admin)
      const isAuthorized = await this.checkDeleteAuthorization(comment, userId);
      if (!isAuthorized) {
        throw new Error('Not authorized to delete this comment');
      }

      // Soft delete
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          content: '[deleted]',
        },
      });

      // Update comment count in cache
      await this.updateCommentCount(comment.targetType, comment.targetId, -1);

      logger.info(`Comment deleted: ${commentId}`);
    } catch (error) {
      logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a comment
   */
  async toggleLike(commentId: string, userId: string) {
    try {
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'comment',
            targetId: commentId,
          },
        },
      });

      if (existingLike) {
        await prisma.like.delete({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: 'comment',
              targetId: commentId,
            },
          },
        });
        return { action: 'unliked' };
      } else {
        await prisma.like.create({
          data: {
            userId,
            targetType: 'comment',
            targetId: commentId,
          },
        });
        return { action: 'liked' };
      }
    } catch (error) {
      logger.error('Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Report a comment
   */
  async reportComment(commentId: string, userId: string, reason: string, description?: string) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedContentType: 'comment',
          reportedContentId: commentId,
          reportType: reason,
          description,
          status: 'pending',
        },
      });

      logger.info(`Comment reported: ${commentId}`);
      return report;
    } catch (error) {
      logger.error('Error reporting comment:', error);
      throw error;
    }
  }

  /**
   * Get comment replies
   */
  async getReplies(commentId: string, limit: number = 20, offset: number = 0) {
    try {
      const [replies, total] = await Promise.all([
        prisma.comment.findMany({
          where: {
            parentId: commentId,
            isDeleted: false,
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
          orderBy: { createdAt: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.comment.count({
          where: { parentId: commentId },
        }),
      ]);

      return { replies, total };
    } catch (error) {
      logger.error('Error getting comment replies:', error);
      throw error;
    }
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
      default:
        return false;
    }
  }

  /**
   * Check if user is authorized to delete comment
   */
  private async checkDeleteAuthorization(comment: any, userId: string): Promise<boolean> {
    if (comment.userId === userId) return true;

    // Check if user is content owner
    let contentOwnerId: string | null = null;

    switch (comment.targetType) {
      case 'ad':
        const ad = await prisma.ad.findUnique({
          where: { id: comment.targetId },
          include: { campaign: { include: { brand: true } } },
        });
        contentOwnerId = ad?.campaign?.brand?.sponsorId || null;
        break;
      case 'room':
        const room = await prisma.room.findUnique({
          where: { id: comment.targetId },
          include: { hosts: true },
        });
        contentOwnerId = room?.hosts[0]?.userId || null;
        break;
      case 'campaign':
        const campaign = await prisma.campaign.findUnique({
          where: { id: comment.targetId },
          include: { brand: true },
        });
        contentOwnerId = campaign?.brand?.sponsorId || null;
        break;
      case 'product':
        const product = await prisma.product.findUnique({
          where: { id: comment.targetId },
          include: { brand: true },
        });
        contentOwnerId = product?.brand?.sponsorId || null;
        break;
    }

    if (contentOwnerId === userId) return true;

    // Check if user is admin (simplified)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    return user?.accountType === 'ADMIN';
  }

  /**
   * Update comment count in cache
   */
  private async updateCommentCount(targetType: string, targetId: string, increment: number) {
    const key = `comment:count:${targetType}:${targetId}`;
    await redis.hincrby(key, 'total', increment);
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return [];

    return matches.map(m => m.substring(1)); // Remove @ symbol
  }

  /**
   * Handle mentions in comments
   */
  private async handleMentions(mentions: string[], comment: any) {
    // Get user IDs from usernames
    const users = await prisma.user.findMany({
      where: { username: { in: mentions } },
      select: { id: true, username: true },
    });

    for (const user of users) {
      if (user.id === comment.userId) continue; // Don't notify self

      await notificationService.create({
        userId: user.id,
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
   * Notify content owner of new comment
   */
  private async notifyContentOwner(
    targetType: string,
    targetId: string,
    commenterId: string,
    comment: any
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

    if (ownerId && ownerId !== commenterId) {
      await notificationService.create({
        userId: ownerId,
        type: 'ENGAGEMENT',
        title: '💬 New Comment',
        body: `${comment.user?.username || 'Someone'} commented on your ${targetType}`,
        data: {
          screen: targetType,
          action: 'view',
          id: targetId,
        },
      });
    }
  }
}

export const commentService = new CommentService();