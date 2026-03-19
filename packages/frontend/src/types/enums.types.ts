/**
 * Enum Type Definitions
 * Based on your Prisma schema and seed data
 */

// ============================================
// User Enums
// ============================================

export enum AccountType {
  USER = 'USER',
  SPONSOR = 'SPONSOR',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum LanguageProficiency {
  NATIVE = 'native',
  FLUENT = 'fluent',
  CONVERSATIONAL = 'conversational',
  BASIC = 'basic'
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  OTHER = 'other'
}

export enum VerificationType {
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  ADDRESS_PROOF = 'address_proof',
  BUSINESS_REG = 'business_reg'
}

// ============================================
// Sponsor & Brand Enums
// ============================================

export enum SponsorSubscriptionTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SponsorAccountType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
  CREDIT = 'credit'
}

export enum BrandMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CREATOR = 'creator',
  ANALYST = 'analyst',
  MODERATOR = 'moderator'
}

// ============================================
// Campaign Enums
// ============================================

export enum CampaignObjective {
  AWARENESS = 'AWARENESS',
  ENGAGEMENT = 'ENGAGEMENT',
  CONVERSION = 'CONVERSION',
  TRAFFIC = 'TRAFFIC',
  SALES = 'SALES'
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum CampaignTargetType {
  LOCATION = 'location',
  AGE = 'age',
  GENDER = 'gender',
  INTEREST = 'interest',
  BEHAVIOR = 'behavior',
  DEVICE = 'device',
  TIME = 'time'
}

export enum InclusionType {
  INCLUDE = 'include',
  EXCLUDE = 'exclude'
}

// ============================================
// Ad Enums
// ============================================

export enum AdType {
  VIDEO = 'video',
  IMAGE = 'image',
  CAROUSEL = 'carousel',
  TEXT = 'text',
  POLL = 'poll',
  INTERACTIVE = 'interactive'
}

export enum AdStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export enum AdAssetType {
  VIDEO = 'video',
  IMAGE = 'image',
  THUMBNAIL = 'thumbnail',
  AUDIO = 'audio'
}

// Ad Categories from seed
export enum AdCategoryId {
  CAT_01 = 'CAT-01', // Awareness Ads
  CAT_02 = 'CAT-02', // Public Service Ads
  CAT_03 = 'CAT-03', // Product Launch Ads
  CAT_04 = 'CAT-04', // Sales & Promotions
  CAT_05 = 'CAT-05', // Live Demonstrations
  CAT_06 = 'CAT-06', // Recruitment Ads
  CAT_07 = 'CAT-07', // Educational Ads
  CAT_08 = 'CAT-08', // Community Ads
  CAT_09 = 'CAT-09', // Marketplace Ads
  CAT_10 = 'CAT-10'  // Sponsored Content
}

// Billboard sections from seed
export enum BillboardSection {
  TRENDING = 'trending',
  LIVE = 'live',
  JUST_LAUNCHED = 'just-launched',
  TOP_EARNING = 'top-earning',
  NEAR_YOU = 'near-you'
}

// ============================================
// Room Enums
// ============================================

export enum RoomType {
  LIVE_DEMO = 'LIVE_DEMO',
  PRODUCT_SHOWCASE = 'PRODUCT_SHOWCASE',
  CAMPAIGN = 'CAMPAIGN',
  COMMUNITY = 'COMMUNITY',
  EVENT = 'EVENT'
}

export enum RoomStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED'
}

export enum RoomVisibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE'
}

export enum ParticipantRole {
  VIEWER = 'viewer',
  SPEAKER = 'speaker',
  MODERATOR = 'moderator'
}

export enum HostRole {
  HOST = 'host',
  CO_HOST = 'co-host',
  MODERATOR = 'moderator'
}

export enum RoomMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll'
}

// ============================================
// Product Enums
// ============================================

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

export enum ProductCategory {
  ELECTRONICS = 'Electronics',
  FASHION = 'Fashion',
  HOME_LIVING = 'Home & Living',
  BEAUTY_HEALTH = 'Beauty & Health',
  SPORTS_OUTDOORS = 'Sports & Outdoors',
  AUTOMOTIVE = 'Automotive',
  BOOKS_MEDIA = 'Books & Media',
  TOYS_GAMES = 'Toys & Games',
  FOOD_BEVERAGES = 'Food & Beverages',
  SERVICES = 'Services'
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

// ============================================
// Order Enums
// ============================================

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum FulfillmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered'
}

export enum PaymentType {
  CAP = 'cap',
  FIAT = 'fiat',
  HYBRID = 'hybrid'
}

// ============================================
// Wallet Enums
// ============================================

export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  BONUS = 'bonus',
  DECAY = 'decay',
  REFUND = 'refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================
// Notification Enums
// ============================================

export enum NotificationType {
  FINANCIAL = 'financial',
  ENGAGEMENT = 'engagement',
  CAMPAIGN = 'campaign',
  ROOM = 'room',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
  AI = 'ai',
  SOCIAL = 'social'
}

export enum NotificationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in-app'
}

// ============================================
// Gamification Enums
// ============================================

export enum AchievementCategory {
  MILESTONE = 'milestone',
  SOCIAL = 'social',
  ENGAGEMENT = 'engagement',
  SHOPPING = 'shopping',
  SPECIAL = 'special'
}

export enum BadgeRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum LeaderboardType {
  GLOBAL = 'global',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  BRAND = 'brand',
  CATEGORY = 'category'
}

export enum LeaderboardMetric {
  CAP_EARNED = 'cap_earned',
  ENGAGEMENTS = 'engagements',
  REFERRALS = 'referrals',
  SUGGESTIONS = 'suggestions'
}

export enum MissionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  SPECIAL = 'special'
}

// User levels from seed
export enum UserLevel {
  EXPLORER = 'Explorer',
  ENGAGER = 'Engager',
  CONTRIBUTOR = 'Contributor',
  INFLUENCER = 'Influencer',
  BRAND_AMBASSADOR = 'Brand Ambassador',
  VIRAZ_CHAMPION = 'Viraz Champion'
}

// ============================================
// Engagement Enums
// ============================================

export enum TargetType {
  AD = 'ad',
  ROOM = 'room',
  CAMPAIGN = 'campaign',
  PRODUCT = 'product',
  COMMENT = 'comment',
  BRAND = 'brand'
}

export enum EngagementAction {
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  CLICK = 'click',
  VIEW = 'view',
  SAVE = 'save',
  REPORT = 'report'
}

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry'
}

// ============================================
// AI Enums
// ============================================

export enum AIRequestType {
  RECOMMENDATION = 'recommendation',
  PERSONALIZATION = 'personalization',
  TREND = 'trend',
  FRAUD = 'fraud',
  MODERATION = 'moderation'
}

export enum ModerationAction {
  ALLOW = 'allow',
  FLAG = 'flag',
  BLOCK = 'block'
}

export enum RecommendationType {
  ADS = 'ads',
  ROOMS = 'rooms',
  CAMPAIGNS = 'campaigns',
  PRODUCTS = 'products',
  ALL = 'all'
}

// ============================================
// Report Enums
// ============================================

export enum ReportType {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  ADULT = 'adult',
  SCAM = 'scam',
  FAKE = 'fake',
  COPYRIGHT = 'copyright',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

// ============================================
// Analytics Enums
// ============================================

export enum AnalyticsInterval {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf'
}