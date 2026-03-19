/**
 * Report Repository
 * Handles database operations for reports
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type ReportCreateInput = Prisma.ReportUncheckedCreateInput;
type ReportUpdateInput = Prisma.ReportUncheckedUpdateInput;

export class ReportRepository extends BaseRepository<any, ReportCreateInput, ReportUpdateInput> {
  protected modelName = 'report';
  protected prismaModel = prisma.report;

  /**
   * Find reports by type
   */
  async findByType(type: string, limit: number = 50, offset: number = 0) {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { type },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where: { type } }),
    ]);

    return { reports, total };
  }

  /**
   * Find reports by date range
   */
  async findByDateRange(startDate: Date, endDate: Date, limit: number = 50, offset: number = 0) {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    return { reports, total };
  }

  /**
   * Get report statistics
   */
  async getReportStats(startDate: Date, endDate: Date) {
    const [total, byType] = await Promise.all([
      prisma.report.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.report.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get user's recent reports
   */
  async getUserReports(userId: string, limit: number = 10) {
    return prisma.report.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports() {
    return prisma.report.findMany({
      where: {
        schedule: { not: null },
      },
    });
  }

  /**
   * Update report URL
   */
  async updateReportUrl(reportId: string, url: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: { url },
    });
  }

  /**
   * Mark report as generated
   */
  async markAsGenerated(reportId: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: {
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Delete old reports
   */
  async deleteOldReports(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prisma.report.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }
}

export const reportRepository = new ReportRepository();