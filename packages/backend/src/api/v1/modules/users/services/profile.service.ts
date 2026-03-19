/**
 * Profile Service
 * Handles user profile operations
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { storageService } from '../../../../../lib/storage/storage.service';
import { userService } from './user.service';

export interface UpdateAvatarData {
  file: Express.Multer.File;
}

export interface UpdateCoverData {
  file: Express.Multer.File;
}

export class ProfileService {
  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, data: UpdateAvatarData) {
    try {
      // Upload to storage
      const uploadResult = await storageService.upload(data.file, {
        folder: 'avatars',
        resize: { width: 200, height: 200 },
      });

      // Get current avatar to delete later
      const currentProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { avatarUrl: true },
      });

      // Update profile
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { avatarUrl: uploadResult.url },
        create: {
          userId,
          avatarUrl: uploadResult.url,
        },
      });

      // Delete old avatar if exists
      if (currentProfile?.avatarUrl) {
        await storageService.delete(currentProfile.avatarUrl).catch(() => {
          // Ignore deletion errors
        });
      }

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Avatar updated for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating avatar:', error);
      throw error;
    }
  }

  /**
   * Update user cover image
   */
  async updateCover(userId: string, data: UpdateCoverData) {
    try {
      // Upload to storage
      const uploadResult = await storageService.upload(data.file, {
        folder: 'covers',
        resize: { width: 1200, height: 400 },
      });

      // Get current cover to delete later
      const currentProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { coverUrl: true },
      });

      // Update profile
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { coverUrl: uploadResult.url },
        create: {
          userId,
          coverUrl: uploadResult.url,
        },
      });

      // Delete old cover if exists
      if (currentProfile?.coverUrl) {
        await storageService.delete(currentProfile.coverUrl).catch(() => {
          // Ignore deletion errors
        });
      }

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Cover updated for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating cover:', error);
      throw error;
    }
  }

  /**
   * Update profile interests
   */
  async updateInterests(userId: string, interests: string[]) {
    try {
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { interests },
        create: {
          userId,
          interests,
        },
      });

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Interests updated for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating interests:', error);
      throw error;
    }
  }

  /**
   * Get profile by user ID
   */
  async getProfile(userId: string) {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      return profile;
    } catch (error) {
      logger.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Get public profile for viewing
   */
  async getPublicProfile(userId: string, viewerId?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          statistics: {
            select: {
              totalFollowers: true,
              totalFollowing: true,
              totalCapEarned: true,
              totalRoomsJoined: true,
              totalSuggestionsAccepted: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if viewer is following this user
      let isFollowing = false;
      if (viewerId && viewerId !== userId) {
        const follow = await prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: userId,
            },
          },
        });
        isFollowing = !!follow;
      }

      const { password, email, phone, ...safeUser } = user;

      return {
        ...safeUser,
        isFollowing,
        isOwnProfile: viewerId === userId,
      };
    } catch (error) {
      logger.error('Error getting public profile:', error);
      throw error;
    }
  }

  /**
   * Get profile views
   */
  async getProfileViews(userId: string) {
    try {
      const views = await prisma.userActivityLog.count({
        where: {
          targetType: 'profile',
          targetId: userId,
          activityType: 'view',
        },
      });

      return { views };
    } catch (error) {
      logger.error('Error getting profile views:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();
export default profileService;