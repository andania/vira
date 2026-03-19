/**
 * Profile Repository
 * Handles database operations for user profiles
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type ProfileCreateInput = Prisma.UserProfileUncheckedCreateInput;
type ProfileUpdateInput = Prisma.UserProfileUncheckedUpdateInput;

export class ProfileRepository extends BaseRepository<any, ProfileCreateInput, ProfileUpdateInput> {
  protected modelName = 'userProfile';
  protected prismaModel = prisma.userProfile;

  /**
   * Find profile by user ID
   */
  async findByUserId(userId: string) {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  /**
   * Update or create profile
   */
  async upsert(userId: string, data: ProfileUpdateInput) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Update avatar
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: {
        userId,
        avatarUrl,
      },
    });
  }

  /**
   * Update cover
   */
  async updateCover(userId: string, coverUrl: string) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: { coverUrl },
      create: {
        userId,
        coverUrl,
      },
    });
  }

  /**
   * Update interests
   */
  async updateInterests(userId: string, interests: string[]) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: { interests },
      create: {
        userId,
        interests,
      },
    });
  }

  /**
   * Get profiles with complete status
   */
  async getProfileCompletionStats() {
    const profiles = await prisma.userProfile.findMany({
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        interests: true,
      },
    });

    const completed = profiles.filter(p => 
      p.firstName && p.lastName && p.avatarUrl && p.bio && p.interests?.length
    ).length;

    return {
      total: profiles.length,
      completed,
      completionRate: profiles.length ? (completed / profiles.length) * 100 : 0,
    };
  }
}

export const profileRepository = new ProfileRepository();