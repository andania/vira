/**
 * User Repository
 * Handles database operations for users
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type UserCreateInput = Prisma.UserUncheckedCreateInput;
type UserUpdateInput = Prisma.UserUncheckedUpdateInput;

export class UserRepository extends BaseRepository<any, UserCreateInput, UserUpdateInput> {
  protected modelName = 'user';
  protected prismaModel = prisma.user;

  /**
   * Find user by email with profile
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        preferences: true,
        wallet: true,
      },
    });
  }

  /**
   * Find user by username with profile
   */
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        statistics: true,
      },
    });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Find users by IDs with basic info
   */
  async findByIds(ids: string[]) {
    return prisma.user.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get active users count
   */
  async getActiveUsersCount(since: Date) {
    return prisma.user.count({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { gte: since },
      },
    });
  }

  /**
   * Get new users count
   */
  async getNewUsersCount(since: Date) {
    return prisma.user.count({
      where: {
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Search users with pagination
   */
  async search(query: string, limit: number, offset: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
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
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
    ]);

    return { users, total };
  }
}

export const userRepository = new UserRepository();