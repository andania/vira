/**
 * Service Type Definitions
 */

// Auth service types
export interface RegisterData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  accountType: 'user' | 'sponsor';
  agreeToTerms: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'email_verification' | 'password_reset';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
    accountType: string;
    displayName?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

// Wallet service types
export interface DepositData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string;
}

export interface WithdrawalData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  accountDetails: any;
}

export interface TransferData {
  senderId: string;
  receiverId: string;
  amount: number;
  note?: string;
}

// Campaign service types
export interface CreateCampaignData {
  brandId: string;
  name: string;
  description?: string;
  objective: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  totalBudget: number;
  dailyBudget?: number;
  currency?: string;
  targeting?: any;
  createdBy: string;
}

export interface CampaignTargeting {
  locations?: Array<{
    type: string;
    country?: string;
    region?: string;
    city?: string;
    radius?: number;
    coordinates?: { latitude: number; longitude: number };
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
    type: string;
    minFrequency?: number;
    timeFrame?: string;
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

// Room service types
export interface CreateRoomData {
  brandId: string;
  name: string;
  description?: string;
  roomType: string;
  visibility?: string;
  maxParticipants?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  settings?: any;
  createdBy: string;
}

export interface RoomSettings {
  allowChat: boolean;
  allowReactions: boolean;
  allowPolls: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;
  requireApproval: boolean;
  muteOnEntry: boolean;
  chatDelay?: number;
  reactionCooldown?: number;
  hostControls: {
    canMuteAll: boolean;
    canRemoveParticipants: boolean;
    canEndRoom: boolean;
  };
  streaming: {
    videoQuality: 'auto' | 'low' | 'medium' | 'high';
    audioQuality: 'low' | 'medium' | 'high';
    maxBitrate?: number;
    recordingFormat?: 'mp4' | 'webm';
  };
}

// Engagement service types
export interface EngagementData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'product' | 'comment' | 'brand';
  targetId: string;
  action: 'like' | 'comment' | 'share' | 'click' | 'view' | 'save' | 'report';
  metadata?: Record<string, any>;
}

export interface CommentData {
  userId: string;
  targetType: 'ad' | 'room' | 'campaign' | 'product';
  targetId: string;
  content: string;
  parentId?: string;
  mentions?: string[];
}

// Notification service types
export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'medium' | 'low';
  expiresAt?: Date;
  channels?: ('push' | 'email' | 'sms' | 'in-app')[];
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: Record<string, boolean>;
}

// Gamification service types
export interface GamificationEvent {
  userId: string;
  type: 'earn' | 'engage' | 'share' | 'comment' | 'suggest' | 'purchase' | 'login' | 'referral';
  value?: number;
  metadata?: Record<string, any>;
}

export interface RankInfo {
  level: number;
  name: string;
  displayName: string;
  badge: string;
  minCap: number;
  maxCap?: number;
  progress: {
    current: number;
    next: number;
    percentage: number;
  };
  benefits: {
    capMultiplier: number;
    dailyCapLimit: number;
    withdrawalLimit: number;
  };
}

// AI service types
export interface AIRequest {
  type: 'recommendation' | 'personalization' | 'trend' | 'fraud' | 'moderation';
  data: any;
  userId?: string;
}

export interface RecommendationContext {
  userId: string;
  limit?: number;
  excludeIds?: string[];
  type?: 'ads' | 'rooms' | 'campaigns' | 'products' | 'all';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ModerationResult {
  flagged: boolean;
  score: number;
  categories: {
    spam: number;
    hate: number;
    violence: number;
    adult: number;
    harassment: number;
    selfHarm: number;
  };
  reasons: string[];
  action: 'allow' | 'flag' | 'block';
}