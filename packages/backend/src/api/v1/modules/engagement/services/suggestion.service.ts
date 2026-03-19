/**
 * Suggestion Service
 * Handles user suggestions and feedback for improvements
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { rewardService } from './reward.service';
import { DEFAULT_REWARD_WEIGHTS } from '@viraz/shared';

export interface SuggestionData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'brand';
  targetId: string;
  title: string;
  content: string;
  category: 'improvement' | 'bug' | 'feature' | 'content' | 'other';
}

export interface SuggestionFeedback {
  suggestionId: string;
  userId: string;
  vote: 'up' | 'down';
  comment?: string;
}

export class SuggestionService {
  /**
   * Create a new suggestion
   */
  async createSuggestion(data: SuggestionData) {
    try {
      const { userId, targetType, targetId, title, content, category } = data;

      // Check if target exists
      const targetExists = await this.checkTargetExists(targetType, targetId);
      if (!targetExists) {
        throw new Error(`${targetType} not found`);
      }

      // Check for duplicate suggestions (same user, same target, recent)
      const recentSuggestion = await prisma.suggestion.findFirst({
        where: {
          userId,
          targetType: targetType as any,
          targetId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentSuggestion) {
        throw new Error('You have already submitted a suggestion recently');
      }

      // Create suggestion
      const suggestion = await prisma.suggestion.create({
        data: {
          userId,
          targetType: targetType as any,
          targetId,
          title,
          content,
          category,
          status: 'pending',
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

      // Award CAP for suggestion
      await rewardService.awardReward({
        userId,
        action: 'suggest',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.suggest,
      });

      // Notify content owner
      await this.notifyContentOwner(targetType, targetId, suggestion);

      logger.info(`Suggestion created: ${suggestion.id}`);
      return suggestion;
    } catch (error) {
      logger.error('Error creating suggestion:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for a target
   */
  async getSuggestions(
    targetType: string,
    targetId: string,
    options: {
      status?: string;
      category?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'recent' | 'popular' | 'status';
    } = {}
  ) {
    try {
      const {
        status,
        category,
        limit = 20,
        offset = 0,
        sortBy = 'recent',
      } = options;

      const where: any = {
        targetType: targetType as any,
        targetId,
      };

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      let orderBy: any = { createdAt: 'desc' };
      if (sortBy === 'popular') {
        orderBy = { votes: { _count: 'desc' } };
      } else if (sortBy === 'status') {
        orderBy = [{ status: 'asc' }, { createdAt: 'desc' }];
      }

      const [suggestions, total] = await Promise.all([
        prisma.suggestion.findMany({
          where,
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
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.suggestion.count({ where }),
      ]);

      return {
        suggestions,
        total,
        hasMore: offset + suggestions.length < total,
      };
    } catch (error) {
      logger.error('Error getting suggestions:', error);
      throw error;
    }
  }

  /**
   * Get a single suggestion
   */
  async getSuggestion(suggestionId: string) {
    try {
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: suggestionId },
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
          votes: {
            include: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found');
      }

      return suggestion;
    } catch (error) {
      logger.error('Error getting suggestion:', error);
      throw error;
    }
  }

  /**
   * Update suggestion status (for content owners/admins)
   */
  async updateSuggestionStatus(
    suggestionId: string,
    userId: string,
    status: 'reviewed' | 'accepted' | 'rejected' | 'implemented',
    feedback?: string
  ) {
    try {
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: suggestionId },
        include: {
          targetType: true,
        },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found');
      }

      // Check authorization
      const isAuthorized = await this.checkAuthorization(suggestion, userId);
      if (!isAuthorized) {
        throw new Error('Not authorized to update suggestion status');
      }

      // Update suggestion
      const updated = await prisma.suggestion.update({
        where: { id: suggestionId },
        data: {
          status,
          ...(status === 'accepted' && { acceptedAt: new Date() }),
          ...(status === 'accepted' && { acceptedBy: userId }),
        },
      });

      // Award bonus if accepted
      if (status === 'accepted') {
        await rewardService.awardReward({
          userId: suggestion.userId,
          action: 'suggestion_accepted',
          targetType: suggestion.targetType,
          targetId: suggestion.targetId,
          amount: 100, // Bonus for accepted suggestion
        });

        // Send notification to suggester
        await notificationService.create({
          userId: suggestion.userId,
          type: 'ENGAGEMENT',
          title: '✨ Suggestion Accepted!',
          body: `Your suggestion "${suggestion.title}" has been accepted! You earned 100 CAP bonus.`,
          data: {
            screen: 'suggestions',
            action: 'view',
            id: suggestion.id,
          },
        });
      } else if (status === 'rejected' && feedback) {
        // Send feedback to suggester
        await notificationService.create({
          userId: suggestion.userId,
          type: 'ENGAGEMENT',
          title: '📝 Suggestion Update',
          body: `Your suggestion "${suggestion.title}" has been reviewed. Feedback: ${feedback}`,
          data: {
            screen: 'suggestions',
            action: 'view',
            id: suggestion.id,
          },
        });
      } else if (status === 'implemented') {
        // Award implementation bonus
        await rewardService.awardReward({
          userId: suggestion.userId,
          action: 'suggestion_implemented',
          targetType: suggestion.targetType,
          targetId: suggestion.targetId,
          amount: 200, // Bonus for implemented suggestion
        });

        await notificationService.create({
          userId: suggestion.userId,
          type: 'ENGAGEMENT',
          title: '🚀 Suggestion Implemented!',
          body: `Great news! Your suggestion "${suggestion.title}" has been implemented! You earned 200 CAP bonus.`,
          data: {
            screen: 'suggestions',
            action: 'view',
            id: suggestion.id,
          },
        });
      }

      logger.info(`Suggestion ${suggestionId} status updated to ${status}`);
      return updated;
    } catch (error) {
      logger.error('Error updating suggestion status:', error);
      throw error;
    }
  }

  /**
   * Vote on a suggestion
   */
  async voteSuggestion(suggestionId: string, userId: string, vote: 'up' | 'down') {
    try {
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: suggestionId },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found');
      }

      // Check if user already voted
      const existingVote = await prisma.suggestionVote.findUnique({
        where: {
          suggestionId_userId: {
            suggestionId,
            userId,
          },
        },
      });

      if (existingVote) {
        if (existingVote.vote === vote) {
          // Remove vote (toggle off)
          await prisma.suggestionVote.delete({
            where: {
              suggestionId_userId: {
                suggestionId,
                userId,
              },
            },
          });
          return { action: 'removed', vote: null };
        } else {
          // Change vote
          await prisma.suggestionVote.update({
            where: {
              suggestionId_userId: {
                suggestionId,
                userId,
              },
            },
            data: { vote },
          });
          return { action: 'changed', vote };
        }
      } else {
        // Create new vote
        await prisma.suggestionVote.create({
          data: {
            suggestionId,
            userId,
            vote,
          },
        });
        return { action: 'added', vote };
      }
    } catch (error) {
      logger.error('Error voting on suggestion:', error);
      throw error;
    }
  }

  /**
   * Add comment to suggestion
   */
  async addComment(suggestionId: string, userId: string, content: string) {
    try {
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: suggestionId },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found');
      }

      const comment = await prisma.suggestionComment.create({
        data: {
          suggestionId,
          userId,
          content,
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

      // Notify suggestion owner (if not self)
      if (suggestion.userId !== userId) {
        await notificationService.create({
          userId: suggestion.userId,
          type: 'ENGAGEMENT',
          title: '💬 New Comment on Your Suggestion',
          body: `${comment.user?.username || 'Someone'} commented on "${suggestion.title}"`,
          data: {
            screen: 'suggestions',
            action: 'view',
            id: suggestionId,
          },
        });
      }

      return comment;
    } catch (error) {
      logger.error('Error adding comment to suggestion:', error);
      throw error;
    }
  }

  /**
   * Get suggestion statistics
   */
  async getSuggestionStats(targetType: string, targetId: string) {
    try {
      const [total, byStatus, byCategory] = await Promise.all([
        prisma.suggestion.count({
          where: {
            targetType: targetType as any,
            targetId,
          },
        }),
        prisma.suggestion.groupBy({
          by: ['status'],
          where: {
            targetType: targetType as any,
            targetId,
          },
          _count: true,
        }),
        prisma.suggestion.groupBy({
          by: ['category'],
          where: {
            targetType: targetType as any,
            targetId,
          },
          _count: true,
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        byCategory: byCategory.reduce((acc, curr) => {
          acc[curr.category] = curr._count;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logger.error('Error getting suggestion stats:', error);
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
      case 'brand':
        return !!(await prisma.brand.findUnique({ where: { id: targetId } }));
      default:
        return false;
    }
  }

  /**
   * Check if user is authorized to update suggestion status
   */
  private async checkAuthorization(suggestion: any, userId: string): Promise<boolean> {
    // Check if user is content owner
    let contentOwnerId: string | null = null;

    switch (suggestion.targetType) {
      case 'ad':
        const ad = await prisma.ad.findUnique({
          where: { id: suggestion.targetId },
          include: { campaign: { include: { brand: true } } },
        });
        contentOwnerId = ad?.campaign?.brand?.sponsorId || null;
        break;
      case 'room':
        const room = await prisma.room.findUnique({
          where: { id: suggestion.targetId },
          include: { hosts: true },
        });
        contentOwnerId = room?.hosts[0]?.userId || null;
        break;
      case 'campaign':
        const campaign = await prisma.campaign.findUnique({
          where: { id: suggestion.targetId },
          include: { brand: true },
        });
        contentOwnerId = campaign?.brand?.sponsorId || null;
        break;
      case 'brand':
        const brand = await prisma.brand.findUnique({
          where: { id: suggestion.targetId },
        });
        contentOwnerId = brand?.sponsorId || null;
        break;
    }

    if (contentOwnerId === userId) return true;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    return user?.accountType === 'ADMIN';
  }

  /**
   * Notify content owner of new suggestion
   */
  private async notifyContentOwner(targetType: string, targetId: string, suggestion: any) {
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
      case 'brand':
        const brand = await prisma.brand.findUnique({
          where: { id: targetId },
        });
        ownerId = brand?.sponsorId || null;
        break;
    }

    if (ownerId && ownerId !== suggestion.userId) {
      await notificationService.create({
        userId: ownerId,
        type: 'ENGAGEMENT',
        title: '💡 New Suggestion',
        body: `${suggestion.user?.username || 'Someone'} suggested: ${suggestion.title}`,
        data: {
          screen: targetType,
          action: 'suggestions',
          id: targetId,
        },
      });
    }
  }
}

export const suggestionService = new SuggestionService();