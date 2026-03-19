/**
 * Campaign and advertising related type definitions
 */

import { UUID, DateTime } from './index';

// Campaign status and types
export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum CampaignObjective {
  AWARENESS = 'awareness',
  ENGAGEMENT = 'engagement',
  CONVERSION = 'conversion',
  TRAFFIC = 'traffic',
  SALES = 'sales'
}

export enum AdType {
  VIDEO = 'video',
  IMAGE = 'image',
  CAROUSEL = 'carousel',
  TEXT = 'text',
  POLL = 'poll',
  INTERACTIVE = 'interactive'
}

export enum AdCategory {
  AWARENESS = 'CAT-01',
  PUBLIC_SERVICE = 'CAT-02',
  PRODUCT_LAUNCH = 'CAT-03',
  SALES_PROMOTION = 'CAT-04',
  LIVE_DEMO = 'CAT-05',
  RECRUITMENT = 'CAT-06',
  EDUCATIONAL = 'CAT-07',
  COMMUNITY = 'CAT-08',
  MARKETPLACE = 'CAT-09',
  SPONSORED_CONTENT = 'CAT-10'
}

// Targeting types
export interface GeoLocation {
  type: 'country' | 'region' | 'city' | 'radius';
  country?: string;
  region?: string;
  city?: string;
  radius?: number; // in km
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface DemographicTarget {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  incomeBrackets?: string[];
  educationLevels?: string[];
}

export interface InterestTarget {
  categories: string[];
  minScore?: number;
}

export interface BehavioralTarget {
  type: 'purchase_history' | 'browsing_history' | 'engagement_history' | 'room_visits' | 'ad_clicks' | 'video_watches';
  minFrequency?: number;
  timeFrame?: '7d' | '30d' | '90d' | 'all';
}

export interface TimeTarget {
  daysOfWeek?: number[]; // 0-6 (0=Sunday)
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  timezone?: string;
}

export interface DeviceTarget {
  deviceTypes?: Array<'mobile' | 'tablet' | 'desktop'>;
  platforms?: Array<'ios' | 'android' | 'windows' | 'mac'>;
  browsers?: string[];
}

export interface CampaignTargeting {
  locations?: GeoLocation[];
  demographic?: DemographicTarget;
  interests?: InterestTarget[];
  behavioral?: BehavioralTarget[];
  time?: TimeTarget;
  devices?: DeviceTarget;
  languages?: string[];
  customAudiences?: UUID[];
  excludedAudiences?: UUID[];
}

// Campaign interfaces
export interface Campaign {
  id: UUID;
  brandId: UUID;
  name: string;
  slug: string;
  description?: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  startDate: DateTime;
  endDate: DateTime;
  timezone: string;
  totalBudget: number;
  dailyBudget?: number;
  currency: string;
  capConversionRate: number;
  targeting: CampaignTargeting;
  createdBy: UUID;
  approvedBy?: UUID;
  approvedAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Ad {
  id: UUID;
  campaignId: UUID;
  name: string;
  type: AdType;
  format?: string;
  content: {
    title?: string;
    body?: string;
    mediaUrls?: string[];
    callToAction?: string;
    destinationUrl?: string;
    pollOptions?: string[];
  };
  rewardWeights?: Record<string, number>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface AdAsset {
  id: UUID;
  adId: UUID;
  assetType: 'video' | 'image' | 'thumbnail' | 'audio';
  assetUrl: string;
  assetSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  altText?: string;
  sortOrder: number;
  createdAt: DateTime;
}

export interface CampaignBudget {
  campaignId: UUID;
  totalBudget: number;
  spentBudget: number;
  reservedBudget: number;
  dailySpent: number;
  dailyResetDate?: DateTime;
  currency: string;
  updatedAt: DateTime;
}

export interface CampaignCapAllocation {
  campaignId: UUID;
  totalCapAllocated: number;
  capSpent: number;
  capRemaining: number;
  lastDistribution?: DateTime;
  updatedAt: DateTime;
}

export interface AdImpression {
  id: UUID;
  adId: UUID;
  userId?: UUID;
  sessionId?: UUID;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  viewedAt: DateTime;
}

export interface AdClick {
  id: UUID;
  adId: UUID;
  userId?: UUID;
  sessionId?: UUID;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  destinationUrl?: string;
  clickedAt: DateTime;
}

// DTOs
export interface CreateCampaignDTO {
  brandId: UUID;
  name: string;
  description?: string;
  objective: CampaignObjective;
  startDate: DateTime;
  endDate: DateTime;
  timezone?: string;
  totalBudget: number;
  dailyBudget?: number;
  currency?: string;
  targeting?: CampaignTargeting;
}

export interface UpdateCampaignDTO {
  name?: string;
  description?: string;
  objective?: CampaignObjective;
  status?: CampaignStatus;
  startDate?: DateTime;
  endDate?: DateTime;
  totalBudget?: number;
  dailyBudget?: number;
  targeting?: CampaignTargeting;
}

export interface CreateAdDTO {
  campaignId: UUID;
  name: string;
  type: AdType;
  content: Ad['content'];
  rewardWeights?: Record<string, number>;
}

export interface CampaignMetrics {
  campaignId: UUID;
  date: DateTime;
  impressions: number;
  clicks: number;
  ctr: number;
  engagements: number;
  engagementRate: number;
  capSpent: number;
  conversions: number;
  conversionValue: number;
  reach: number;
  frequency: number;
}