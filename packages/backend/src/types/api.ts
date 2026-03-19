/**
 * API Type Definitions
 */

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string; // Development only
}

export interface ApiMeta {
  timestamp: string;
  path?: string;
  duration?: number;
  requestId?: string;
  version?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    firstItem: number;
    lastItem: number;
  };
}

// API error codes
export enum ApiErrorCode {
  // Authentication errors (1000-1999)
  UNAUTHORIZED = 'AUTH_1001',
  INVALID_CREDENTIALS = 'AUTH_1002',
  TOKEN_EXPIRED = 'AUTH_1003',
  INVALID_TOKEN = 'AUTH_1004',
  TOKEN_REVOKED = 'AUTH_1005',
  INSUFFICIENT_PERMISSIONS = 'AUTH_1006',
  ACCOUNT_LOCKED = 'AUTH_1007',
  ACCOUNT_NOT_VERIFIED = 'AUTH_1008',
  ACCOUNT_SUSPENDED = 'AUTH_1009',
  ACCOUNT_BANNED = 'AUTH_1010',
  TWO_FACTOR_REQUIRED = 'AUTH_1011',
  INVALID_2FA_CODE = 'AUTH_1012',

  // Validation errors (2000-2999)
  VALIDATION_ERROR = 'VAL_2001',
  MISSING_FIELD = 'VAL_2002',
  INVALID_FORMAT = 'VAL_2003',
  FIELD_TOO_SHORT = 'VAL_2004',
  FIELD_TOO_LONG = 'VAL_2005',
  FIELD_OUT_OF_RANGE = 'VAL_2006',
  INVALID_EMAIL = 'VAL_2007',
  INVALID_PHONE = 'VAL_2008',
  PASSWORD_TOO_WEAK = 'VAL_2009',
  PASSWORDS_DO_NOT_MATCH = 'VAL_2010',
  DUPLICATE_VALUE = 'VAL_2011',

  // Resource errors (3000-3999)
  RESOURCE_NOT_FOUND = 'RES_3001',
  RESOURCE_ALREADY_EXISTS = 'RES_3002',
  RESOURCE_CONFLICT = 'RES_3003',
  RESOURCE_LOCKED = 'RES_3004',
  RESOURCE_EXPIRED = 'RES_3005',
  RESOURCE_UNAVAILABLE = 'RES_3006',
  INSUFFICIENT_STOCK = 'RES_3007',

  // Business logic errors (4000-4999)
  INSUFFICIENT_FUNDS = 'BIZ_4001',
  WALLET_FROZEN = 'BIZ_4002',
  DAILY_LIMIT_EXCEEDED = 'BIZ_4003',
  MONTHLY_LIMIT_EXCEEDED = 'BIZ_4004',
  CAMPAIGN_NOT_ACTIVE = 'BIZ_4005',
  CAMPAIGN_ENDED = 'BIZ_4006',
  CAMPAIGN_BUDGET_EXCEEDED = 'BIZ_4007',
  ROOM_FULL = 'BIZ_4008',
  ROOM_ENDED = 'BIZ_4009',
  ALREADY_JOINED = 'BIZ_4010',
  ALREADY_VOTED = 'BIZ_4011',
  CANNOT_SELF_TRANSFER = 'BIZ_4012',
  MINIMUM_WITHDRAWAL_NOT_MET = 'BIZ_4013',
  MAXIMUM_WITHDRAWAL_EXCEEDED = 'BIZ_4014',

  // Payment errors (5000-5999)
  PAYMENT_FAILED = 'PAY_5001',
  PAYMENT_CANCELLED = 'PAY_5002',
  PAYMENT_REFUNDED = 'PAY_5003',
  PAYMENT_PENDING = 'PAY_5004',
  INVALID_PAYMENT_METHOD = 'PAY_5005',
  PAYMENT_PROVIDER_ERROR = 'PAY_5006',

  // File upload errors (6000-6999)
  FILE_TOO_LARGE = 'FILE_6001',
  INVALID_FILE_TYPE = 'FILE_6002',
  FILE_UPLOAD_FAILED = 'FILE_6003',
  FILE_NOT_FOUND = 'FILE_6004',

  // Rate limiting errors (7000-7999)
  RATE_LIMIT_EXCEEDED = 'RATE_7001',
  CONCURRENT_REQUESTS_LIMIT = 'RATE_7002',

  // System errors (8000-8999)
  INTERNAL_SERVER_ERROR = 'SYS_8001',
  SERVICE_UNAVAILABLE = 'SYS_8002',
  DATABASE_ERROR = 'SYS_8003',
  CACHE_ERROR = 'SYS_8004',
  QUEUE_ERROR = 'SYS_8005',
  THIRD_PARTY_ERROR = 'SYS_8006',
  MAINTENANCE_MODE = 'SYS_8007',

  // AI/ML errors (9000-9999)
  AI_SERVICE_UNAVAILABLE = 'AI_9001',
  AI_PROCESSING_ERROR = 'AI_9002',
  INSUFFICIENT_DATA = 'AI_9003',
}

// API version
export enum ApiVersion {
  V1 = 'v1',
  V2 = 'v2',
}

// HTTP methods
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

// Rate limit tiers
export enum RateLimitTier {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  SPONSOR = 'sponsor',
  ADMIN = 'admin',
  INTERNAL = 'internal',
}

// API documentation tags
export enum ApiTag {
  AUTH = 'Authentication',
  USERS = 'Users',
  SPONSORS = 'Sponsors',
  BRANDS = 'Brands',
  CAMPAIGNS = 'Campaigns',
  ADS = 'Ads',
  ROOMS = 'Rooms',
  BILLBOARD = 'Billboard',
  ENGAGEMENT = 'Engagement',
  WALLET = 'Wallet',
  MARKETPLACE = 'Marketplace',
  NOTIFICATIONS = 'Notifications',
  GAMIFICATION = 'Gamification',
  ANALYTICS = 'Analytics',
  ADMIN = 'Admin',
  AI = 'AI',
  HEALTH = 'Health',
}