/**
 * Suggestion Repository
 * Handles database operations for suggestions
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class SuggestionRepository extends BaseRepository<any, any, any> {
  protected modelName = 'suggestion';
  protected prismaModel = prisma.suggestion;

  /**
   * Get suggestions for a target with filtering
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
              comments: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.suggestion.count({ where }),
    ]);

    return { suggestions, total };
  }

  /**
   * Get a single suggestion with all relations
   */
  async getSuggestionWithDetails(suggestionId: string) {
    return prisma.suggestion.findUnique({
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
                    displayName: true,
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
  }

  /**
   * Get user's suggestions
   */
  async getUserSuggestions(userId: string, limit: number = 50, offset: number = 0) {
    const [suggestions, total] = await Promise.all([
      prisma.suggestion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.suggestion.count({ where: { userId } }),
    ]);

    return { suggestions, total };
  }

  /**
   * Get vote count for suggestion
   */
  async getVoteCount(suggestionId: string) {
    const votes = await prisma.suggestionVote.groupBy({
      by: ['vote'],
      where: { suggestionId },
      _count: true,
    });

    const result = {
      up: 0,
      down: 0,
      total: 0,
    };

    for (const vote of votes) {
      result[vote.vote] = vote._count;
      result.total += vote._count;
    }

    return result;
  }

  /**
   * Check if user has voted on suggestion
   */
  async hasUserVoted(suggestionId: string, userId: string) {
    const vote = await prisma.suggestionVote.findUnique({
      where: {
        suggestionId_userId: {
          suggestionId,
          userId,
        },
      },
    });

    return vote ? vote.vote : null;
  }

  /**
   * Get suggestion statistics
   */
  async getSuggestionStats(targetType: string, targetId: string) {
    const [total, byStatus, byCategory, averageResponseTime] = await Promise.all([
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
      prisma.suggestion.aggregate({
        where: {
          targetType: targetType as any,
          targetId,
          status: { in: ['accepted', 'rejected', 'implemented'] },
        },
        _avg: {
          // Calculate average response time
        },
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
      averageResponseTime: averageResponseTime._avg || 0,
    };
  }

  /**
   * Get trending suggestions
   */
  async getTrendingSuggestions(limit: number = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return prisma.suggestion.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: { in: ['pending', 'reviewed'] },
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
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
      orderBy: [
        {
          votes: {
            _count: 'desc',
          },
        },
        {
          comments: {
            _count: 'desc',
          },
        },
      ],
      take: limit,
    });
  }
}

export const suggestionRepository = new SuggestionRepository();