/**
 * Scheduling Service
 * Handles campaign scheduling and time-based delivery
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { campaignService } from './campaign.service';

export interface ScheduleConfig {
  campaignId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  schedule?: {
    daysOfWeek?: number[]; // 0-6 (0=Sunday)
    startTime?: string; // HH:MM format
    endTime?: string; // HH:MM format
  };
}

export class SchedulingService {
  /**
   * Schedule campaign delivery
   */
  async scheduleCampaign(config: ScheduleConfig) {
    try {
      const { campaignId, startDate, endDate, timezone, schedule } = config;

      // Store schedule in database
      await prisma.campaignSchedule.upsert({
        where: { campaignId },
        update: {
          startDate,
          endDate,
          timezone,
          schedule: schedule || {},
          isActive: true,
        },
        create: {
          campaignId,
          startDate,
          endDate,
          timezone,
          schedule: schedule || {},
          isActive: true,
        },
      });

      // Schedule start job
      await this.scheduleStart(campaignId, startDate);

      // Schedule end job
      await this.scheduleEnd(campaignId, endDate);

      // Schedule recurring checks if schedule exists
      if (schedule) {
        await this.scheduleRecurringChecks(campaignId, schedule);
      }

      logger.info(`Campaign scheduled: ${campaignId}`);
    } catch (error) {
      logger.error('Error scheduling campaign:', error);
      throw error;
    }
  }

  /**
   * Schedule campaign start
   */
  private async scheduleStart(campaignId: string, startDate: Date) {
    const now = new Date();
    const delay = Math.max(0, startDate.getTime() - now.getTime());

    await queueService.add('campaign', {
      campaignId,
      action: 'start',
    }, {
      delay,
      jobId: `campaign:start:${campaignId}`,
    });

    logger.info(`Campaign start scheduled for ${campaignId} at ${startDate}`);
  }

  /**
   * Schedule campaign end
   */
  private async scheduleEnd(campaignId: string, endDate: Date) {
    const now = new Date();
    const delay = Math.max(0, endDate.getTime() - now.getTime());

    await queueService.add('campaign', {
      campaignId,
      action: 'end',
    }, {
      delay,
      jobId: `campaign:end:${campaignId}`,
    });

    logger.info(`Campaign end scheduled for ${campaignId} at ${endDate}`);
  }

  /**
   * Schedule recurring checks for time-based delivery
   */
  private async scheduleRecurringChecks(campaignId: string, schedule: any) {
    // Schedule check every hour
    await queueService.add('campaign', {
      campaignId,
      action: 'check-schedule',
    }, {
      repeat: {
        cron: '0 * * * *', // Every hour
      },
      jobId: `campaign:schedule:${campaignId}`,
    });
  }

  /**
   * Check if campaign should be active based on schedule
   */
  async checkCampaignSchedule(campaignId: string): Promise<boolean> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { schedules: true },
      });

      if (!campaign || !campaign.schedules) {
        return true; // No schedule = always active
      }

      const schedule = campaign.schedules[0];
      if (!schedule || !schedule.schedule) {
        return true;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay();

      // Check if within campaign date range
      if (now < schedule.startDate || now > schedule.endDate) {
        return false;
      }

      const timeConfig = schedule.schedule as any;

      // Check day of week
      if (timeConfig.daysOfWeek && timeConfig.daysOfWeek.length > 0) {
        if (!timeConfig.daysOfWeek.includes(currentDay)) {
          return false;
        }
      }

      // Check time range
      if (timeConfig.startTime && timeConfig.endTime) {
        const [startHour, startMinute] = timeConfig.startTime.split(':').map(Number);
        const [endHour, endMinute] = timeConfig.endTime.split(':').map(Number);

        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking campaign schedule:', error);
      return true; // Default to active on error
    }
  }

  /**
   * Update campaign schedule
   */
  async updateSchedule(campaignId: string, updates: Partial<ScheduleConfig>) {
    try {
      const existing = await prisma.campaignSchedule.findUnique({
        where: { campaignId },
      });

      if (!existing) {
        throw new Error('Campaign schedule not found');
      }

      // Update in database
      await prisma.campaignSchedule.update({
        where: { campaignId },
        data: {
          startDate: updates.startDate,
          endDate: updates.endDate,
          timezone: updates.timezone,
          schedule: updates.schedule || existing.schedule,
        },
      });

      // Reschedule jobs
      if (updates.startDate && updates.startDate !== existing.startDate) {
        await this.rescheduleStart(campaignId, updates.startDate);
      }

      if (updates.endDate && updates.endDate !== existing.endDate) {
        await this.rescheduleEnd(campaignId, updates.endDate);
      }

      logger.info(`Campaign schedule updated: ${campaignId}`);
    } catch (error) {
      logger.error('Error updating campaign schedule:', error);
      throw error;
    }
  }

  /**
   * Reschedule campaign start
   */
  private async rescheduleStart(campaignId: string, newStartDate: Date) {
    await queueService.removeJobs(`campaign:start:${campaignId}`);
    await this.scheduleStart(campaignId, newStartDate);
  }

  /**
   * Reschedule campaign end
   */
  private async rescheduleEnd(campaignId: string, newEndDate: Date) {
    await queueService.removeJobs(`campaign:end:${campaignId}`);
    await this.scheduleEnd(campaignId, newEndDate);
  }

  /**
   * Get campaign schedule
   */
  async getCampaignSchedule(campaignId: string) {
    try {
      const schedule = await prisma.campaignSchedule.findUnique({
        where: { campaignId },
      });

      if (!schedule) {
        return null;
      }

      return {
        campaignId: schedule.campaignId,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        timezone: schedule.timezone,
        schedule: schedule.schedule,
        isActive: schedule.isActive,
      };
    } catch (error) {
      logger.error('Error getting campaign schedule:', error);
      throw error;
    }
  }

  /**
   * Pause schedule
   */
  async pauseSchedule(campaignId: string) {
    try {
      await prisma.campaignSchedule.update({
        where: { campaignId },
        data: { isActive: false },
      });

      // Remove scheduled jobs
      await queueService.removeJobs(`campaign:schedule:${campaignId}`);

      logger.info(`Campaign schedule paused: ${campaignId}`);
    } catch (error) {
      logger.error('Error pausing campaign schedule:', error);
      throw error;
    }
  }

  /**
   * Resume schedule
   */
  async resumeSchedule(campaignId: string) {
    try {
      const schedule = await prisma.campaignSchedule.findUnique({
        where: { campaignId },
      });

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      await prisma.campaignSchedule.update({
        where: { campaignId },
        data: { isActive: true },
      });

      // Reschedule recurring checks
      await this.scheduleRecurringChecks(campaignId, schedule.schedule);

      logger.info(`Campaign schedule resumed: ${campaignId}`);
    } catch (error) {
      logger.error('Error resuming campaign schedule:', error);
      throw error;
    }
  }

  /**
   * Get active campaigns for current time
   */
  async getActiveCampaignsForTime(date: Date = new Date()) {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          startDate: { lte: date },
          endDate: { gte: date },
        },
        include: {
          schedules: true,
        },
      });

      // Filter by schedule
      const activeCampaigns = [];

      for (const campaign of campaigns) {
        if (campaign.schedules && campaign.schedules.length > 0) {
          const schedule = campaign.schedules[0];
          if (schedule.isActive) {
            const isActive = await this.checkCampaignSchedule(campaign.id);
            if (isActive) {
              activeCampaigns.push(campaign);
            }
          }
        } else {
          // No schedule = always active
          activeCampaigns.push(campaign);
        }
      }

      return activeCampaigns;
    } catch (error) {
      logger.error('Error getting active campaigns for time:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal delivery times based on campaign history
   */
  async calculateOptimalTimes(campaignId: string) {
    try {
      // Get historical engagement data
      const engagements = await prisma.userEngagement.findMany({
        where: {
          targetType: 'campaign',
          targetId: campaignId,
        },
        select: {
          createdAt: true,
        },
      });

      if (engagements.length === 0) {
        return null;
      }

      // Group by hour
      const hourCounts = new Array(24).fill(0);
      for (const engagement of engagements) {
        const hour = engagement.createdAt.getHours();
        hourCounts[hour]++;
      }

      // Find peak hours
      const maxCount = Math.max(...hourCounts);
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(h => h.count === maxCount)
        .map(h => h.hour);

      // Group by day of week
      const dayCounts = new Array(7).fill(0);
      for (const engagement of engagements) {
        const day = engagement.createdAt.getDay();
        dayCounts[day]++;
      }

      // Find peak days
      const maxDayCount = Math.max(...dayCounts);
      const peakDays = dayCounts
        .map((count, day) => ({ day, count }))
        .filter(d => d.count === maxDayCount)
        .map(d => d.day);

      return {
        peakHours,
        peakDays,
        hourlyDistribution: hourCounts,
        dailyDistribution: dayCounts,
        totalEngagements: engagements.length,
      };
    } catch (error) {
      logger.error('Error calculating optimal times:', error);
      throw error;
    }
  }

  /**
   * Get upcoming scheduled campaigns
   */
  async getUpcomingScheduledCampaigns(days: number = 7) {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const campaigns = await prisma.campaign.findMany({
        where: {
          status: { in: ['DRAFT', 'SCHEDULED'] },
          startDate: {
            gte: now,
            lte: endDate,
          },
        },
        include: {
          brand: true,
          schedules: true,
        },
        orderBy: { startDate: 'asc' },
      });

      return campaigns;
    } catch (error) {
      logger.error('Error getting upcoming scheduled campaigns:', error);
      throw error;
    }
  }

  /**
   * Validate schedule configuration
   */
  validateSchedule(config: Partial<ScheduleConfig>): string[] {
    const errors: string[] = [];

    if (config.startDate && config.endDate) {
      if (config.endDate <= config.startDate) {
        errors.push('End date must be after start date');
      }
    }

    if (config.schedule) {
      const { daysOfWeek, startTime, endTime } = config.schedule;

      if (daysOfWeek && daysOfWeek.length > 0) {
        for (const day of daysOfWeek) {
          if (day < 0 || day > 6) {
            errors.push('Days of week must be between 0 and 6');
            break;
          }
        }
      }

      if (startTime && endTime) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
          errors.push('Start time must be in HH:MM format');
        }
        if (!timeRegex.test(endTime)) {
          errors.push('End time must be in HH:MM format');
        }

        if (startTime && endTime && startTime >= endTime) {
          errors.push('Start time must be before end time');
        }
      }
    }

    return errors;
  }
}

export const schedulingService = new SchedulingService();