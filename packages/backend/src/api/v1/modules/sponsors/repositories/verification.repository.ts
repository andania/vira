/**
 * Verification Repository
 * Handles database operations for sponsor verification
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class VerificationRepository extends BaseRepository<any, any, any> {
  protected modelName = 'sponsorVerification';
  protected prismaModel = prisma.sponsorVerification;

  /**
   * Find verification by sponsor ID
   */
  async findBySponsorId(sponsorId: string) {
    return prisma.sponsorVerification.findFirst({
      where: { sponsorId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get pending verifications
   */
  async getPendingVerifications(limit: number = 50, offset: number = 0) {
    return prisma.sponsorVerification.findMany({
      where: { status: 'pending' },
      include: {
        sponsor: {
          include: {
            user: {
              select: {
                email: true,
                phone: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get verification with details
   */
  async getVerificationWithDetails(verificationId: string) {
    return prisma.sponsorVerification.findUnique({
      where: { id: verificationId },
      include: {
        sponsor: {
          include: {
            user: {
              select: {
                email: true,
                phone: true,
                profile: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update verification status
   */
  async updateStatus(verificationId: string, status: string, adminId: string, notes?: string) {
    return prisma.sponsorVerification.update({
      where: { id: verificationId },
      data: {
        status,
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes: notes,
      },
    });
  }

  /**
   * Add documents to verification
   */
  async addDocuments(verificationId: string, documents: any[]) {
    const verification = await prisma.sponsorVerification.findUnique({
      where: { id: verificationId },
      select: { documents: true },
    });

    const updatedDocs = [...(verification?.documents as any[] || []), ...documents];

    return prisma.sponsorVerification.update({
      where: { id: verificationId },
      data: { documents: updatedDocs },
    });
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.sponsorVerification.count({ where: { status: 'pending' } }),
      prisma.sponsorVerification.count({ where: { status: 'approved' } }),
      prisma.sponsorVerification.count({ where: { status: 'rejected' } }),
      prisma.sponsor.count(),
    ]);

    return {
      pending,
      approved,
      rejected,
      total,
    };
  }

  /**
   * Get verifications by date range
   */
  async getVerificationsByDateRange(startDate: Date, endDate: Date) {
    return prisma.sponsorVerification.findMany({
      where: {
        submittedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get average processing time
   */
  async getAverageProcessingTime() {
    const result = await prisma.sponsorVerification.aggregate({
      where: {
        status: { in: ['approved', 'rejected'] },
        processedAt: { not: null },
      },
      _avg: {
        processedAt: true,
      },
    });

    return result._avg.processedAt;
  }
}

export const verificationRepository = new VerificationRepository();