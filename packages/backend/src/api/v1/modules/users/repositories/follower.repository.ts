/**
 * Follower Repository
 * Handles database operations for user follows
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type FollowCreateInput = Prisma.UserFollowUncheckedCreateInput;

export class FollowerRepository extends BaseRepository<any, FollowCreateInput, any> {
  protected modelName = 'userFollow';
  protected prismaModel = prisma.userFollow;

  /**
   * Find follow relationship
   */
  async findFollow(followerId: string, followingId: string) {
    return prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  /**
   * Get followers with details
   */
  async getFollowers(userId: string, limit: number, offset: number) {
    const [followers, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
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
                  totalFollowers: true,
                  totalCapEarned: true,
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { followedAt: 'desc' },
      }),
      prisma.userFollow.count({
        where: { followingId: userId },
      }),
    ]);

    return {
      followers: followers.map(f => ({
        ...f.follower,
        followedAt: f.followedAt,
      })),
      total,
    };
  }

  /**
   * Get following with details
   */
  async getFollowing(userId: string, limit: number, offset: number) {
    const [following, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followerId: userId },
        include: {
          following: {
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
                  totalFollowers: true,
                  totalCapEarned: true,
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { followedAt: 'desc' },
      }),
      prisma.userFollow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      following: following.map(f => ({
        ...f.following,
        followedAt: f.followedAt,
      })),
      total,
    };
  }

  /**
   * Get follower counts for multiple users
   */
  async getFollowerCounts(userIds: string[]) {
    const counts = await prisma.userFollow.groupBy({
      by: ['followingId'],
      where: {
        followingId: { in: userIds },
      },
      _count: true,
    });

    return counts.reduce((acc, curr) => {
      acc[curr.followingId] = curr._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get mutual follow status
   */
  async getMutualFollowStatus(userId1: string, userId2: string) {
    const [follow1, follow2] = await Promise.all([
      this.findFollow(userId1, userId2),
      this.findFollow(userId2, userId1),
    ]);

    return {
      user1FollowsUser2: !!follow1,
      user2FollowsUser1: !!follow2,
      mutual: !!(follow1 && follow2),
    };
  }

  /**
   * Get follower suggestions based on mutual connections
   */
  async getSuggestions(userId: string, limit: number) {
    // Get users that the current user follows
    const following = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Exclude self

    // Find users followed by people the current user follows
    const suggestions = await prisma.userFollow.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: followingIds },
      },
      select: {
        following: {
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
                totalFollowers: true,
                engagementRate: true,
              },
            },
            _count: {
              select: {
                followers: true,
              },
            },
          },
        },
      },
      distinct: ['followingId'],
      take: limit,
    });

    return suggestions.map(s => s.following);
  }
}

export const followerRepository = new FollowerRepository();