/**
 * Notification Preference Repository
 * Handles database operations for notification preferences
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type PreferenceCreateInput = Prisma.NotificationPreferenceUncheckedCreateInput;
type PreferenceUpdateInput = Prisma.NotificationPreferenceUncheckedUpdateInput;

export class PreferenceRepository extends BaseRepository<any, PreferenceCreateInput, PreferenceUpdateInput> {
  protected modelName = 'notificationPreference';
  protected prismaModel = prisma.notificationPreference;

  /**
   * Find preferences by user ID
   */
  async findByUserId(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  /**
   * Create or update preferences
   */
  async upsert(userId: string, data: Partial<PreferenceCreateInput>) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Update push preferences
   */
  async updatePushPreferences(userId: string, enabled: boolean) {
    return this.upsert(userId, { pushEnabled: enabled });
  }

  /**
   * Update email preferences
   */
  async updateEmailPreferences(userId: string, enabled: boolean) {
    return this.upsert(userId, { emailEnabled: enabled });
  }

  /**
   * Update SMS preferences
   */
  async updateSmsPreferences(userId: string, enabled: boolean) {
    return this.upsert(userId, { smsEnabled: enabled });
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(userId: string, start: string, end: string) {
    return this.upsert(userId, {
      quietHoursStart: start,
      quietHoursEnd: end,
    });
  }

  /**
   * Clear quiet hours
   */
  async clearQuietHours(userId: string) {
    return this.upsert(userId, {
      quietHoursStart: null,
      quietHoursEnd: null,
    });
  }

  /**
   * Update category preferences
   */
  async updateCategories(userId: string, categories: Record<string, boolean>) {
    const preferences = await this.findByUserId(userId);
    
    return this.upsert(userId, {
      preferences: {
        ...(preferences?.preferences as Record<string, boolean> || {}),
        ...categories,
      },
    });
  }

  /**
   * Toggle category
   */
  async toggleCategory(userId: string, category: string, enabled: boolean) {
    const preferences = await this.findByUserId(userId);
    const currentPrefs = preferences?.preferences as Record<string, boolean> || {};

    return this.upsert(userId, {
      preferences: {
        ...currentPrefs,
        [category]: enabled,
      },
    });
  }

  /**
   * Get users with push enabled
   */
  async getUsersWithPushEnabled(limit: number = 1000) {
    return prisma.notificationPreference.findMany({
      where: { pushEnabled: true },
      select: { userId: true },
      take: limit,
    });
  }

  /**
   * Get users with email enabled
   */
  async getUsersWithEmailEnabled(limit: number = 1000) {
    return prisma.notificationPreference.findMany({
      where: { emailEnabled: true },
      select: { userId: true, user: { select: { email: true } } },
      take: limit,
    });
  }

  /**
   * Get users with SMS enabled
   */
  async getUsersWithSmsEnabled(limit: number = 1000) {
    return prisma.notificationPreference.findMany({
      where: { smsEnabled: true },
      select: { userId: true, user: { select: { phone: true } } },
      take: limit,
    });
  }

  /**
   * Check if user is in quiet hours
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.findByUserId(userId);
    
    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences() {
    return {
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      preferences: {
        financial: true,
        engagement: true,
        campaign: true,
        room: true,
        achievement: true,
        system: true,
        ai: false,
        social: true,
      },
    };
  }

  /**
   * Reset to default
   */
  async resetToDefault(userId: string) {
    return this.upsert(userId, this.getDefaultPreferences());
  }
}

export const preferenceRepository = new PreferenceRepository();