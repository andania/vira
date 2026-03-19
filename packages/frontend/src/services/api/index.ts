/**
 * Services Index
 * Central export point for all services
 */

// API client
export { default as apiClient, ApiClient } from './api/client';
export type { ApiResponse, PaginatedResponse } from './api/client';

// API services
export { default as authApi } from './api/auth.api';
export { default as userApi } from './api/user.api';
export { default as walletApi } from './api/wallet.api';
export { default as campaignApi } from './api/campaign.api';
export { default as roomApi } from './api/room.api';
export { default as billboardApi } from './api/billboard.api';
export { default as marketplaceApi } from './api/marketplace.api';
export { default as notificationApi } from './api/notification.api';
export { default as gamificationApi } from './api/gamification.api';
export { default as analyticsApi } from './api/analytics.api';
export { default as adminApi } from './api/admin.api';

// Socket services
export { default as socketClient, socketService } from './socket/socket.client';
export * from './socket/events';

// Re-export types from APIs
export type {
  // Auth types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from './api/auth.api';

export type {
  UserProfile,
  UpdateProfileData,
  UserPreferences,
  UserStatistics,
} from './api/user.api';

export type {
  Wallet,
  Transaction,
  Deposit,
  Withdrawal,
  PaymentMethod,
  CapValue,
} from './api/wallet.api';

export type {
  Campaign,
  Ad,
  AdAsset,
  TargetingCriteria,
  AudienceEstimate,
} from './api/campaign.api';

export type {
  Room,
  Participant,
  Message,
  Stream,
  Recording,
} from './api/room.api';

export type {
  FeedItem,
  BillboardSection,
  SearchResult,
  SearchSuggestion,
} from './api/billboard.api';

export type {
  Product,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Wishlist,
  Review,
} from './api/marketplace.api';

export type {
  Notification,
  NotificationPreference,
} from './api/notification.api';

export type {
  Rank,
  Achievement,
  Badge,
  LeaderboardEntry,
  Challenge,
  GamificationProfile,
} from './api/gamification.api';

export type {
  UserAnalytics,
  CampaignAnalytics,
  FinancialAnalytics,
  EngagementAnalytics,
  Report,
} from './api/analytics.api';

export type {
  SystemHealth,
  PlatformStats,
  AuditLog,
  SystemConfig,
  UserManagement,
  SponsorManagement,
  ModerationItem,
  FraudAlert,
} from './api/admin.api';

// Service registry for dependency injection
export const services = {
  auth: authApi,
  user: userApi,
  wallet: walletApi,
  campaign: campaignApi,
  room: roomApi,
  billboard: billboardApi,
  marketplace: marketplaceApi,
  notification: notificationApi,
  gamification: gamificationApi,
  analytics: analyticsApi,
  admin: adminApi,
  socket: socketService,
};

// Service factory for creating service instances
export const createService = <T>(name: keyof typeof services): T => {
  return services[name] as unknown as T;
};

// Default export
export default services;