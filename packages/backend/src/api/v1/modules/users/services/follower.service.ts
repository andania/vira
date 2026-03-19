/**
 * Follower Service
 * Handles user follow/unfollow operations
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { notificationService } from '../../../notifications/services/notification.service';

export class FollowerService {
  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string) {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: followingId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create follow relationship
      const follow = await prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // Update follower counts
      await Promise.all([
        prisma.userStatistics.update({
          where: { userId: followerId },
          data: { totalFollowing: { increment: 1 } },
        }),
        prisma.userStatistics.update({
          where: { userId: followingId },
          data: { totalFollowers: { increment: 1 } },
        }),
      ]);

      // Invalidate caches
      await cacheService.invalidateUser(followerId);
      await cacheService.invalidateUser(followingId);

      // Send notification
      const follower = await prisma.user.findUnique({
        where: { id: followerId },
        select: { username: true },
      });

      await notificationService.create({
        userId: followingId,
        type: 'SOCIAL',
        title: '👥 New Follower',
        body: `${follower?.username} started following you`,
        data: {
          screen: 'profile',
          action: 'view',
          id: followerId,
        },
      });

      logger.info(`User ${followerId} followed user ${followingId}`);
      return follow;
    } catch (error) {
      logger.error('Error following user:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string) {
    try {
      // Delete follow relationship
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      // Update follower counts
      await Promise.all([
        prisma.userStatistics.update({
          where: { userId: followerId },
          data: { totalFollowing: { decrement: 1 } },
        }),
        prisma.userStatistics.update({
          where: { userId: followingId },
          data: { totalFollowers: { decrement: 1 } },
        }),
      ]);

      // Invalidate caches
      await cacheService.invalidateUser(followerId);
      await cacheService.invalidateUser(followingId);

      logger.info(`User ${followerId} unfollowed user ${followingId}`);
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      throw error;
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      return !!follow;
    } catch (error) {
      logger.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get followers list
   */
  async getFollowers(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const followers = await prisma.userFollow.findMany({
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
      });

      const total = await prisma.userFollow.count({
        where: { followingId: userId },
      });

      return {
        followers: followers.map(f => ({
          ...f.follower,
          followedAt: f.followedAt,
        })),
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting followers:', error);
      throw error;
    }
  }

  /**
   * Get following list
   */
  async getFollowing(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const following = await prisma.userFollow.findMany({
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
      });

      const total = await prisma.userFollow.count({
        where: { followerId: userId },
      });

      return {
        following: following.map(f => ({
          ...f.following,
          followedAt: f.followedAt,
        })),
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting following:', error);
      throw error;
    }
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  async getMutualFollowers(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const [userFollowsOther, otherFollowsUser] = await Promise.all([
        this.isFollowing(userId, otherUserId),
        this.isFollowing(otherUserId, userId),
      ]);

      return userFollowsOther && otherFollowsUser;
    } catch (error) {
      logger.error('Error checking mutual followers:', error);
      return false;
    }
  }

  /**
   * Get follower suggestions
   */
  async getFollowerSuggestions(userId: string, limit: number = 10) {
    try {
      // Get users that the current user is not following
      const following = await prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      const followingIds = following.map(f => f.followingId);
      followingIds.push(userId); // Exclude self

      // Find popular users with high engagement
      const suggestions = await prisma.user.findMany({
        where: {
          id: { notIn: followingIds },
          status: 'ACTIVE',
        },
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
              engagementRate: true,
            },
          },
          _count: {
            select: {
              followers: true,
            },
          },
        },
        orderBy: [
          { statistics: { totalFollowers: 'desc' } },
          { statistics: { engagementRate: 'desc' } },
        ],
        take: limit,
      });

      return suggestions;
    } catch (error) {
      logger.error('Error getting follower suggestions:', error);
      throw error;
    }
  }

  /**
   * Get follower count
   */
  async getFollowerCount(userId: string): Promise<number> {
    try {
      const count = await prisma.userFollow.count({
        where: { followingId: userId },
      });
      return count;
    } catch (error) {
      logger.error('Error getting follower count:', error);
      return 0;
    }
  }

  /**
   * Get following count
   */
  async getFollowingCount(userId: string): Promise<number> {
    try {
      const count = await prisma.userFollow.count({
        where: { followerId: userId },
      });
      return count;
    } catch (error) {
      logger.error('Error getting following count:', error);
      return 0;
    }
  }
}

export const followerService = new FollowerService();
export default followerService;