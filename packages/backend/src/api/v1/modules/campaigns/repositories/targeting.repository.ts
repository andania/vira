/**
 * Targeting Repository
 * Handles database operations for campaign targeting
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type TargetingCreateInput = Prisma.CampaignTargetUncheckedCreateInput;
type TargetingUpdateInput = Prisma.CampaignTargetUncheckedUpdateInput;

export class TargetingRepository extends BaseRepository<any, TargetingCreateInput, TargetingUpdateInput> {
  protected modelName = 'campaignTarget';
  protected prismaModel = prisma.campaignTarget;

  /**
   * Find targets by campaign ID
   */
  async findByCampaignId(campaignId: string) {
    return prisma.campaignTarget.findMany({
      where: { campaignId },
    });
  }

  /**
   * Delete all targets for campaign
   */
  async deleteByCampaignId(campaignId: string) {
    return prisma.campaignTarget.deleteMany({
      where: { campaignId },
    });
  }

  /**
   * Get audience segments
   */
  async getAudienceSegments() {
    return prisma.audienceSegment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create audience segment
   */
  async createAudienceSegment(name: string, criteria: any, size: number) {
    return prisma.audienceSegment.create({
      data: {
        name,
        criteria,
        size,
      },
    });
  }

  /**
   * Update audience segment
   */
  async updateAudienceSegment(id: string, data: { name?: string; criteria?: any; size?: number }) {
    return prisma.audienceSegment.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete audience segment
   */
  async deleteAudienceSegment(id: string) {
    return prisma.audienceSegment.delete({
      where: { id },
    });
  }

  /**
   * Find users matching targeting criteria
   */
  async findMatchingUsers(criteria: any, limit: number = 100) {
    // This would be a complex query based on the criteria
    // Simplified version for now
    const where: any = { status: 'ACTIVE' };

    if (criteria.locations) {
      // Location filtering
    }

    if (criteria.demographic) {
      // Demographic filtering
    }

    if (criteria.interests) {
      where.profile = {
        interests: { hasSome: criteria.interests },
      };
    }

    return prisma.user.findMany({
      where,
      take: limit,
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
}

export const targetingRepository = new TargetingRepository();