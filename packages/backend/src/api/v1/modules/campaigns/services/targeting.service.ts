/**
 * Targeting Service
 * Handles audience targeting and segmentation for campaigns
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { geolocationService } from '../../../../services/geolocation.service';

export interface TargetingCriteria {
  locations?: Array<{
    type: 'country' | 'region' | 'city' | 'radius';
    country?: string;
    region?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  demographic?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    incomeBrackets?: string[];
    educationLevels?: string[];
  };
  interests?: string[];
  behaviors?: Array<{
    type: 'purchase_history' | 'browsing_history' | 'engagement_history' | 'room_visits' | 'ad_clicks' | 'video_watches';
    minFrequency?: number;
    timeFrame?: '7d' | '30d' | '90d' | 'all';
  }>;
  devices?: {
    types?: string[];
    platforms?: string[];
    browsers?: string[];
  };
  time?: {
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  languages?: string[];
  customAudiences?: string[];
  excludedAudiences?: string[];
}

export interface AudienceSegment {
  id: string;
  name: string;
  size: number;
  criteria: TargetingCriteria;
}

export class TargetingService {
  /**
   * Validate targeting criteria
   */
  validateTargeting(criteria: TargetingCriteria): string[] {
    const errors: string[] = [];

    // Validate locations
    if (criteria.locations) {
      for (const loc of criteria.locations) {
        if (loc.type === 'radius' && !loc.coordinates) {
          errors.push('Radius targeting requires coordinates');
        }
        if (loc.type === 'country' && !loc.country) {
          errors.push('Country targeting requires country code');
        }
      }
    }

    // Validate age range
    if (criteria.demographic) {
      const { ageMin, ageMax } = criteria.demographic;
      if (ageMin && ageMax && ageMin > ageMax) {
        errors.push('Minimum age cannot be greater than maximum age');
      }
      if (ageMin && ageMin < 13) {
        errors.push('Minimum age cannot be less than 13');
      }
    }

    // Validate time
    if (criteria.time) {
      const { startTime, endTime } = criteria.time;
      if (startTime && endTime && startTime >= endTime) {
        errors.push('Start time must be before end time');
      }
    }

    return errors;
  }

  /**
   * Estimate audience size for targeting criteria
   */
  async estimateAudienceSize(criteria: TargetingCriteria): Promise<number> {
    try {
      const cacheKey = `audience:size:${JSON.stringify(criteria)}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return parseInt(cached);
      }

      // Build Prisma where clause based on criteria
      const where: any = {
        status: 'ACTIVE',
        deletedAt: null,
      };

      // Location filtering
      if (criteria.locations) {
        where.OR = criteria.locations.map(loc => {
          if (loc.type === 'country') {
            return { 'locations.some': { country: loc.country } };
          } else if (loc.type === 'city') {
            return { 'locations.some': { city: loc.city } };
          } else if (loc.type === 'radius' && loc.coordinates) {
            // Use PostGIS for radius search
            return {
              locations: {
                some: {
                  coordinates: {
                    within: {
                      radius: loc.radius,
                      of: {
                        latitude: loc.coordinates.latitude,
                        longitude: loc.coordinates.longitude,
                      },
                    },
                  },
                },
              },
            };
          }
          return {};
        });
      }

      // Demographic filtering
      if (criteria.demographic) {
        const { ageMin, ageMax, genders } = criteria.demographic;
        
        if (ageMin || ageMax) {
          const today = new Date();
          if (ageMin) {
            const maxBirthDate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
            where.profile = { birthDate: { lte: maxBirthDate } };
          }
          if (ageMax) {
            const minBirthDate = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
            where.profile = { ...where.profile, birthDate: { gte: minBirthDate } };
          }
        }

        if (genders && genders.length > 0) {
          where.profile = {
            ...where.profile,
            gender: { in: genders },
          };
        }
      }

      // Interest filtering
      if (criteria.interests && criteria.interests.length > 0) {
        where.profile = {
          ...where.profile,
          interests: { hasSome: criteria.interests },
        };
      }

      // Device filtering
      if (criteria.devices) {
        if (criteria.devices.types) {
          where.devices = { some: { deviceType: { in: criteria.devices.types } } };
        }
        if (criteria.devices.platforms) {
          where.devices = {
            ...where.devices,
            some: { ...where.devices?.some, platform: { in: criteria.devices.platforms } },
          };
        }
      }

      // Language filtering
      if (criteria.languages && criteria.languages.length > 0) {
        where.profile = {
          ...where.profile,
          languagePreference: { in: criteria.languages },
        };
      }

      const count = await prisma.user.count({ where });
      
      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, count.toString());

      return count;
    } catch (error) {
      logger.error('Error estimating audience size:', error);
      return 0;
    }
  }

  /**
   * Check if user matches targeting criteria
   */
  async userMatchesTargeting(userId: string, criteria: TargetingCriteria): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          locations: true,
          devices: true,
          statistics: true,
        },
      });

      if (!user) return false;

      // Check exclusions first
      if (criteria.excludedAudiences?.includes(userId)) {
        return false;
      }

      // Check custom audiences
      if (criteria.customAudiences?.includes(userId)) {
        return true;
      }

      // Check each targeting criterion
      let matches = true;

      // Location check
      if (criteria.locations && criteria.locations.length > 0) {
        matches = matches && await this.matchesLocation(user, criteria.locations);
      }

      // Demographic check
      if (criteria.demographic && matches) {
        matches = matches && this.matchesDemographic(user, criteria.demographic);
      }

      // Interest check
      if (criteria.interests && criteria.interests.length > 0 && matches) {
        matches = matches && this.matchesInterests(user, criteria.interests);
      }

      // Behavior check
      if (criteria.behaviors && criteria.behaviors.length > 0 && matches) {
        matches = matches && await this.matchesBehaviors(user, criteria.behaviors);
      }

      // Device check
      if (criteria.devices && matches) {
        matches = matches && this.matchesDevices(user, criteria.devices);
      }

      // Time check
      if (criteria.time && matches) {
        matches = matches && this.matchesTime(criteria.time);
      }

      // Language check
      if (criteria.languages && criteria.languages.length > 0 && matches) {
        matches = matches && this.matchesLanguages(user, criteria.languages);
      }

      return matches;
    } catch (error) {
      logger.error('Error checking user targeting:', error);
      return false;
    }
  }

  /**
   * Check location targeting
   */
  private async matchesLocation(user: any, locations: any[]): Promise<boolean> {
    for (const loc of locations) {
      switch (loc.type) {
        case 'country':
          if (user.locations.some((l: any) => l.country === loc.country)) {
            return true;
          }
          break;
        case 'city':
          if (user.locations.some((l: any) => l.city === loc.city)) {
            return true;
          }
          break;
        case 'radius':
          if (loc.coordinates) {
            for (const userLoc of user.locations) {
              if (userLoc.coordinates) {
                const distance = geolocationService.calculateDistance(
                  loc.coordinates.latitude,
                  loc.coordinates.longitude,
                  userLoc.coordinates.latitude,
                  userLoc.coordinates.longitude
                );
                if (distance <= (loc.radius || 0)) {
                  return true;
                }
              }
            }
          }
          break;
      }
    }
    return false;
  }

  /**
   * Check demographic targeting
   */
  private matchesDemographic(user: any, demographic: any): boolean {
    if (demographic.ageMin || demographic.ageMax) {
      if (!user.profile?.birthDate) return false;
      
      const age = geolocationService.calculateAge(user.profile.birthDate);
      
      if (demographic.ageMin && age < demographic.ageMin) return false;
      if (demographic.ageMax && age > demographic.ageMax) return false;
    }

    if (demographic.genders && demographic.genders.length > 0) {
      if (!user.profile?.gender || !demographic.genders.includes(user.profile.gender)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check interest targeting
   */
  private matchesInterests(user: any, interests: string[]): boolean {
    if (!user.profile?.interests) return false;
    return interests.some(interest => user.profile.interests.includes(interest));
  }

  /**
   * Check behavior targeting
   */
  private async matchesBehaviors(user: any, behaviors: any[]): Promise<boolean> {
    for (const behavior of behaviors) {
      const timeFrame = behavior.timeFrame || '30d';
      const days = timeFrame === '7d' ? 7 : timeFrame === '30d' ? 30 : timeFrame === '90d' ? 90 : null;
      
      const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

      switch (behavior.type) {
        case 'purchase_history':
          const purchases = await prisma.order.count({
            where: {
              userId: user.id,
              status: 'COMPLETED',
              ...(startDate ? { createdAt: { gte: startDate } } : {}),
            },
          });
          if (purchases >= (behavior.minFrequency || 1)) return true;
          break;

        case 'engagement_history':
          const engagements = await prisma.userEngagement.count({
            where: {
              userId: user.id,
              ...(startDate ? { createdAt: { gte: startDate } } : {}),
            },
          });
          if (engagements >= (behavior.minFrequency || 1)) return true;
          break;

        case 'room_visits':
          const visits = await prisma.roomParticipant.count({
            where: {
              userId: user.id,
              ...(startDate ? { joinedAt: { gte: startDate } } : {}),
            },
          });
          if (visits >= (behavior.minFrequency || 1)) return true;
          break;

        case 'ad_clicks':
          const clicks = await prisma.adClick.count({
            where: {
              userId: user.id,
              ...(startDate ? { clickedAt: { gte: startDate } } : {}),
            },
          });
          if (clicks >= (behavior.minFrequency || 1)) return true;
          break;
      }
    }
    return false;
  }

  /**
   * Check device targeting
   */
  private matchesDevices(user: any, devices: any): boolean {
    if (!user.devices || user.devices.length === 0) return false;

    if (devices.types) {
      const hasType = user.devices.some((d: any) => devices.types.includes(d.deviceType));
      if (!hasType) return false;
    }

    if (devices.platforms) {
      const hasPlatform = user.devices.some((d: any) => devices.platforms.includes(d.platform));
      if (!hasPlatform) return false;
    }

    if (devices.browsers) {
      const hasBrowser = user.devices.some((d: any) => devices.browsers.includes(d.browser));
      if (!hasBrowser) return false;
    }

    return true;
  }

  /**
   * Check time targeting
   */
  private matchesTime(time: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    // Check day of week
    if (time.daysOfWeek && time.daysOfWeek.length > 0) {
      if (!time.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time range
    if (time.startTime && time.endTime) {
      const [startHour, startMinute] = time.startTime.split(':').map(Number);
      const [endHour, endMinute] = time.endTime.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check language targeting
   */
  private matchesLanguages(user: any, languages: string[]): boolean {
    if (!user.profile?.languagePreference) return false;
    return languages.includes(user.profile.languagePreference);
  }

  /**
   * Create audience segment
   */
  async createAudienceSegment(name: string, criteria: TargetingCriteria): Promise<AudienceSegment> {
    const size = await this.estimateAudienceSize(criteria);
    
    const segment = await prisma.audienceSegment.create({
      data: {
        name,
        criteria,
        size,
      },
    });

    return {
      id: segment.id,
      name: segment.name,
      size: segment.size,
      criteria: segment.criteria as TargetingCriteria,
    };
  }

  /**
   * Get audience segments
   */
  async getAudienceSegments(): Promise<AudienceSegment[]> {
    const segments = await prisma.audienceSegment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return segments.map(s => ({
      id: s.id,
      name: s.name,
      size: s.size,
      criteria: s.criteria as TargetingCriteria,
    }));
  }

  /**
   * Update audience segment
   */
  async updateAudienceSegment(segmentId: string, name?: string, criteria?: TargetingCriteria): Promise<AudienceSegment> {
    const size = criteria ? await this.estimateAudienceSize(criteria) : undefined;

    const segment = await prisma.audienceSegment.update({
      where: { id: segmentId },
      data: {
        ...(name && { name }),
        ...(criteria && { criteria }),
        ...(size && { size }),
      },
    });

    return {
      id: segment.id,
      name: segment.name,
      size: segment.size,
      criteria: segment.criteria as TargetingCriteria,
    };
  }

  /**
   * Delete audience segment
   */
  async deleteAudienceSegment(segmentId: string): Promise<void> {
    await prisma.audienceSegment.delete({
      where: { id: segmentId },
    });
  }
}

export const targetingService = new TargetingService();