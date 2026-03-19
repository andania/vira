/**
 * Types Index
 * Central export point for all type definitions
 */

// API Types
export * from './api.types';

// Model Types
export * from './models.types';

// Service DTO Types
export * from './services.types';

// Socket Types
export * from './socket.types';

// Enum Types
export * from './enums.types';

// Pagination Types
export * from './pagination.types';

// Common Types
export * from './common.types';

// Config Types
export * from './config.types';

// Utility Types
export * from './utils/type-guards';
export * from './utils/transformers';

// Re-export commonly used types for convenience
export type {
  // User types
  User,
  UserProfile,
  UserPreferences,
  UserStatistics,
  
  // Campaign types
  Campaign,
  CampaignTarget,
  CampaignBudget,
  CampaignCapAllocation,
  
  // Ad types
  Ad,
  AdAsset,
  
  // Room types
  Room,
  RoomParticipant,
  RoomMessage,
  
  // Product types
  Product,
  ProductImage,
  ProductVariant,
  ProductReview,
  
  // Order types
  Order,
  OrderItem,
  
  // Wallet types
  CapWallet,
  CapTransaction,
  
  // Notification types
  Notification,
  NotificationPreferences,
  
  // Gamification types
  Level,
  Achievement,
  UserAchievement,
  Badge,
  UserBadge,
  
  // Brand types
  Brand,
  BrandMember,
  
  // API response types
  ApiResponse,
  ApiError,
  ApiMeta,
  PaginatedResponse,
  
  // Service request types
  LoginData,
  RegisterData,
  CreateCampaignRequest,
  CreateRoomRequest,
  DepositIntentRequest,
  WithdrawalRequest,
  TransferRequest,
} from './models.types';