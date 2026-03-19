/**
 * Frontend Route Constants
 * Matches backend API structure for consistency
 */

export const routes = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_PHONE: '/verify-phone',
  BILLBOARD: '/billboard',
  SEARCH: '/search',
  MARKETPLACE: '/marketplace',
  PRODUCT_DETAIL: '/marketplace/product/:productId',

  // Protected routes
  ROOMS: '/rooms',
  ROOM_DETAIL: '/rooms/:roomId',
  LIVE_ROOM: '/rooms/:roomId/live',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_HISTORY: '/orders',
  ORDER_DETAIL: '/orders/:orderId',
  WALLET: '/wallet',
  DEPOSIT: '/wallet/deposit',
  WITHDRAW: '/wallet/withdraw',
  TRANSACTIONS: '/wallet/transactions',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ACHIEVEMENTS: '/achievements',
  LEADERBOARD: '/leaderboard',
  CHALLENGES: '/challenges',
  NOTIFICATIONS: '/notifications',
  MESSAGES: '/messages',

  // Sponsor routes
  SPONSOR_DASHBOARD: '/sponsor',
  SPONSOR_BRANDS: '/sponsor/brands',
  SPONSOR_CREATE_BRAND: '/sponsor/brands/create',
  SPONSOR_EDIT_BRAND: '/sponsor/brands/:brandId/edit',
  SPONSOR_ROOMS: '/sponsor/rooms',
  SPONSOR_CREATE_ROOM: '/sponsor/rooms/create',
  SPONSOR_EDIT_ROOM: '/sponsor/rooms/:roomId/edit',
  SPONSOR_CAMPAIGNS: '/sponsor/campaigns',
  SPONSOR_CREATE_CAMPAIGN: '/sponsor/campaigns/create',
  SPONSOR_EDIT_CAMPAIGN: '/sponsor/campaigns/:campaignId/edit',
  SPONSOR_CAMPAIGN_ANALYTICS: '/sponsor/campaigns/:campaignId/analytics',
  SPONSOR_PRODUCTS: '/sponsor/products',
  SPONSOR_CREATE_PRODUCT: '/sponsor/products/create',
  SPONSOR_EDIT_PRODUCT: '/sponsor/products/:productId/edit',
  SPONSOR_ORDERS: '/sponsor/orders',
  SPONSOR_ANALYTICS: '/sponsor/analytics',
  SPONSOR_SETTINGS: '/sponsor/settings',

  // Admin routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_DETAIL: '/admin/users/:userId',
  ADMIN_SPONSORS: '/admin/sponsors',
  ADMIN_SPONSOR_DETAIL: '/admin/sponsors/:sponsorId',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_FRAUD_CASES: '/admin/fraud',
  ADMIN_DISPUTES: '/admin/disputes',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SYSTEM_CONFIG: '/admin/config',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_SYSTEM_HEALTH: '/admin/health',
  ADMIN_SETTINGS: '/admin/settings',
};

// API endpoint mapping (matches backend structure)
export const apiEndpoints = {
  // Auth
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_ME: '/api/v1/auth/me',
  AUTH_VERIFY_EMAIL: '/api/v1/auth/verify-email',
  AUTH_VERIFY_PHONE: '/api/v1/auth/verify-phone',
  AUTH_FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/v1/auth/reset-password',

  // Users
  USERS: '/api/v1/users',
  USER_PROFILE: '/api/v1/users/profile',
  USER_PREFERENCES: '/api/v1/users/preferences',

  // Wallet
  WALLET: '/api/v1/wallet',
  WALLET_BALANCE: '/api/v1/wallet/balance',
  WALLET_TRANSACTIONS: '/api/v1/wallet/transactions',
  WALLET_DEPOSIT: '/api/v1/wallet/deposit',
  WALLET_WITHDRAW: '/api/v1/wallet/withdraw',
  WALLET_TRANSFER: '/api/v1/wallet/transfer',

  // Billboard
  BILLBOARD_FEED: '/api/v1/billboard/feed',
  BILLBOARD_TRENDING: '/api/v1/billboard/trending',
  BILLBOARD_RECOMMENDED: '/api/v1/billboard/recommended',
  BILLBOARD_NEARBY: '/api/v1/billboard/nearby',
  BILLBOARD_SEARCH: '/api/v1/billboard/search',

  // Rooms
  ROOMS: '/api/v1/rooms',
  ROOM_JOIN: '/api/v1/rooms/:roomId/join',
  ROOM_LEAVE: '/api/v1/rooms/:roomId/leave',
  ROOM_MESSAGES: '/api/v1/rooms/:roomId/messages',
  ROOM_PARTICIPANTS: '/api/v1/rooms/:roomId/participants',

  // Marketplace
  PRODUCTS: '/api/v1/marketplace/products',
  PRODUCT_DETAIL: '/api/v1/marketplace/products/:productId',
  CART: '/api/v1/marketplace/cart',
  ORDERS: '/api/v1/marketplace/orders',
  REVIEWS: '/api/v1/marketplace/reviews',

  // Campaigns
  CAMPAIGNS: '/api/v1/campaigns',
  CAMPAIGN_DETAIL: '/api/v1/campaigns/:campaignId',
  CAMPAIGN_ANALYTICS: '/api/v1/campaigns/:campaignId/analytics',
  ADS: '/api/v1/campaigns/ads',

  // Engagement
  ENGAGEMENT_LIKE: '/api/v1/engagement/like',
  ENGAGEMENT_COMMENT: '/api/v1/engagement/comment',
  ENGAGEMENT_SHARE: '/api/v1/engagement/share',
  ENGAGEMENT_SUGGEST: '/api/v1/engagement/suggest',

  // Notifications
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATION_PREFERENCES: '/api/v1/notifications/preferences',

  // Gamification
  GAMIFICATION_RANK: '/api/v1/gamification/rank',
  GAMIFICATION_ACHIEVEMENTS: '/api/v1/gamification/achievements',
  GAMIFICATION_LEADERBOARD: '/api/v1/gamification/leaderboard',
  GAMIFICATION_CHALLENGES: '/api/v1/gamification/challenges',

  // Analytics
  ANALYTICS_USER: '/api/v1/analytics/user',
  ANALYTICS_CAMPAIGN: '/api/v1/analytics/campaign',
  ANALYTICS_REPORTS: '/api/v1/analytics/reports',

  // Admin
  ADMIN_USERS: '/api/v1/admin/users',
  ADMIN_SPONSORS: '/api/v1/admin/sponsors',
  ADMIN_MODERATION: '/api/v1/admin/moderation',
  ADMIN_FRAUD: '/api/v1/admin/fraud',
  ADMIN_SYSTEM: '/api/v1/admin/system',

  // AI
  AI_RECOMMENDATIONS: '/api/v1/ai/recommendations',
  AI_PERSONALIZATION: '/api/v1/ai/personalization',
  AI_TRENDS: '/api/v1/ai/trends',
  AI_MODERATION: '/api/v1/ai/moderation',

  // Sponsors
  SPONSOR_BRANDS: '/api/v1/sponsors/brands',
  SPONSOR_VERIFICATION: '/api/v1/sponsors/verification',
  SPONSOR_PAYMENTS: '/api/v1/sponsors/payments',
};