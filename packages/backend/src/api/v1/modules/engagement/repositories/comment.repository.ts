/**
 * Comment Repository
 * Handles database operations for comments
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type CommentCreateInput = Prisma.CommentUncheckedCreateInput;
type CommentUpdateInput = Prisma.CommentUncheckedUpdateInput;

export class CommentRepository extends BaseRepository<any, CommentCreateInput, CommentUpdateInput> {
  protected modelName = 'comment';
  protected prismaModel = prisma.comment;

  /**
   * Find comments by target
   */
  async findByTarget(
    targetType: string,
    targetId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'recent' | 'popular';
      parentId?: string | null;
      includeReplies?: boolean;
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'recent',
      parentId = null,
      includeReplies = false,
    } = options;

    const where: any = {
      targetType: targetType as any,
      targetId,
      parentId: parentId === null ? null : parentId,
      isDeleted: false,
    };

    const orderBy = sortBy === 'recent' 
      ? { createdAt: 'desc' as const }
      : { likesCount: 'desc' as const };

    const comments = await prisma.comment.findMany({
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
        ...(includeReplies && {
          replies: {
            where: { isDeleted: false },
            take: 3,
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
        }),
        _count: {
          select: {
            replies: {
              where: { isDeleted: false },
            },
            likes: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    const total = await prisma.comment.count({ where });

    return { comments, total };
  }

  /**
   * Find comment by ID with details
   */
  async findByIdWithDetails(commentId: string) {
    return prisma.comment.findUnique({
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
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
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
        likes: {
          take: 5,
          select: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            replies: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });
  }

  /**
   * Find replies to a comment
   */
  async findReplies(commentId: string, limit: number = 20, offset: number = 0) {
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
  }

  /**
   * Find comments by user
   */
  async findByUser(userId: string, limit: number = 50, offset: number = 0) {
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { userId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          targetType: true,
          _count: {
            select: {
              likes: true,
              replies: {
                where: { isDeleted: false },
              },
            },
          },
        },
      }),
      prisma.comment.count({ where: { userId } }),
    ]);

    return { comments, total };
  }

  /**
   * Search comments
   */
  async search(query: string, limit: number = 50, offset: number = 0) {
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.comment.count({
        where: {
          content: { contains: query, mode: 'insensitive' },
          isDeleted: false,
        },
      }),
    ]);

    return { comments, total };
  }

  /**
   * Get comment count for target
   */
  async getCountByTarget(targetType: string, targetId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        targetType: targetType as any,
        targetId,
        isDeleted: false,
      },
    });
  }

  /**
   * Get recent comments for target
   */
  async getRecentByTarget(targetType: string, targetId: string, limit: number = 10) {
    return prisma.comment.findMany({
      where: {
        targetType: targetType as any,
        targetId,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get top commenters for target
   */
  async getTopCommenters(targetType: string, targetId: string, limit: number = 10) {
    const topCommenters = await prisma.comment.groupBy({
      by: ['userId'],
      where: {
        targetType: targetType as any,
        targetId,
        isDeleted: false,
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = topCommenters.map(c => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
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
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return topCommenters.map(c => ({
      userId: c.userId,
      username: userMap.get(c.userId)?.username,
      displayName: userMap.get(c.userId)?.profile?.displayName,
      avatarUrl: userMap.get(c.userId)?.profile?.avatarUrl,
      count: c._count,
    }));
  }

  /**
   * Get comment statistics for target
   */
  async getStats(targetType: string, targetId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last30Days, last7Days, avgPerDay, byUser] = await Promise.all([
      this.getCountByTarget(targetType, targetId),
      prisma.comment.count({
        where: {
          targetType: targetType as any,
          targetId,
          createdAt: { gte: thirtyDaysAgo },
          isDeleted: false,
        },
      }),
      prisma.comment.count({
        where: {
          targetType: targetType as any,
          targetId,
          createdAt: { gte: sevenDaysAgo },
          isDeleted: false,
        },
      }),
      prisma.comment.groupBy({
        by: ['createdAt'],
        where: {
          targetType: targetType as any,
          targetId,
          isDeleted: false,
        },
        _count: true,
      }),
      this.getTopCommenters(targetType, targetId, 5),
    ]);

    // Calculate average per day
    const daysWithComments = byUser.length;
    const avgPerDayCalc = daysWithComments > 0 ? Math.round(total / daysWithComments) : 0;

    return {
      total,
      last30Days,
      last7Days,
      averagePerDay: avgPerDayCalc,
      topCommenters: byUser,
    };
  }

  /**
   * Get comment threads (parent comments with their replies)
   */
  async getThreads(targetType: string, targetId: string, limit: number = 10, offset: number = 0) {
    const threads = await prisma.comment.findMany({
      where: {
        targetType: targetType as any,
        targetId,
        parentId: null,
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
        replies: {
          where: { isDeleted: false },
          take: 3,
          orderBy: { createdAt: 'asc' },
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
            replies: {
              where: { isDeleted: false },
            },
            likes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.comment.count({
      where: {
        targetType: targetType as any,
        targetId,
        parentId: null,
        isDeleted: false,
      },
    });

    return { threads, total };
  }

  /**
   * Check if user has commented on target
   */
  async hasUserCommented(userId: string, targetType: string, targetId: string): Promise<boolean> {
    const count = await prisma.comment.count({
      where: {
        userId,
        targetType: targetType as any,
        targetId,
        isDeleted: false,
      },
    });

    return count > 0;
  }

  /**
   * Get user's comment count on target
   */
  async getUserCommentCount(userId: string, targetType: string, targetId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        userId,
        targetType: targetType as any,
        targetId,
        isDeleted: false,
      },
    });
  }

  /**
   * Get latest comment timestamp for target
   */
  async getLatestCommentTimestamp(targetType: string, targetId: string): Promise<Date | null> {
    const latest = await prisma.comment.findFirst({
      where: {
        targetType: targetType as any,
        targetId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return latest?.createdAt || null;
  }

  /**
   * Bulk delete comments (soft delete)
   */
  async bulkSoftDelete(commentIds: string[]) {
    return prisma.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        isDeleted: true,
        content: '[deleted]',
      },
    });
  }

  /**
   * Get comments mentioning user
   */
  async getMentions(userId: string, limit: number = 50) {
    return prisma.comment.findMany({
      where: {
        mentions: {
          has: userId,
        },
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
        targetType: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get comment activity timeline
   */
  async getActivityTimeline(targetType: string, targetId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.comment.groupBy({
      by: ['createdAt'],
      where: {
        targetType: targetType as any,
        targetId,
        createdAt: { gte: startDate },
        isDeleted: false,
      },
      _count: true,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const timeline = new Map();
    
    for (const activity of activities) {
      const date = activity.createdAt.toISOString().split('T')[0];
      if (!timeline.has(date)) {
        timeline.set(date, {
          date,
          count: activity._count,
        });
      } else {
        timeline.get(date).count += activity._count;
      }
    }

    return Array.from(timeline.values());
  }
}

export const commentRepository = new CommentRepository();