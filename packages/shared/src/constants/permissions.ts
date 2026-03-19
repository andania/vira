/**
 * Permission constants for VIRAZ platform
 */

// Resource types
export const RESOURCES = {
  USER: 'user',
  PROFILE: 'profile',
  SPONSOR: 'sponsor',
  BRAND: 'brand',
  CAMPAIGN: 'campaign',
  AD: 'ad',
  ROOM: 'room',
  ENGAGEMENT: 'engagement',
  WALLET: 'wallet',
  TRANSACTION: 'transaction',
  PRODUCT: 'product',
  ORDER: 'order',
  NOTIFICATION: 'notification',
  ACHIEVEMENT: 'achievement',
  ANALYTICS: 'analytics',
  SYSTEM: 'system',
} as const;

export type ResourceType = typeof RESOURCES[keyof typeof RESOURCES];

// Actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  MODERATE: 'moderate',
  ADMIN: 'admin',
  MANAGE: 'manage',
} as const;

export type ActionType = typeof ACTIONS[keyof typeof ACTIONS];

// Permission definitions
export interface Permission {
  resource: ResourceType;
  action: ActionType;
  description?: string;
}

// Define all permissions
export const PERMISSIONS: Record<string, Permission> = {
  // User permissions
  CREATE_USER: { resource: RESOURCES.USER, action: ACTIONS.CREATE, description: 'Create new users' },
  READ_USER: { resource: RESOURCES.USER, action: ACTIONS.READ, description: 'View user information' },
  UPDATE_USER: { resource: RESOURCES.USER, action: ACTIONS.UPDATE, description: 'Update user information' },
  DELETE_USER: { resource: RESOURCES.USER, action: ACTIONS.DELETE, description: 'Delete users' },
  
  // Profile permissions
  READ_PROFILE: { resource: RESOURCES.PROFILE, action: ACTIONS.READ, description: 'View profiles' },
  UPDATE_PROFILE: { resource: RESOURCES.PROFILE, action: ACTIONS.UPDATE, description: 'Update profiles' },
  
  // Sponsor permissions
  CREATE_SPONSOR: { resource: RESOURCES.SPONSOR, action: ACTIONS.CREATE, description: 'Create sponsors' },
  READ_SPONSOR: { resource: RESOURCES.SPONSOR, action: ACTIONS.READ, description: 'View sponsors' },
  UPDATE_SPONSOR: { resource: RESOURCES.SPONSOR, action: ACTIONS.UPDATE, description: 'Update sponsors' },
  APPROVE_SPONSOR: { resource: RESOURCES.SPONSOR, action: ACTIONS.APPROVE, description: 'Approve sponsors' },
  
  // Brand permissions
  CREATE_BRAND: { resource: RESOURCES.BRAND, action: ACTIONS.CREATE, description: 'Create brands' },
  READ_BRAND: { resource: RESOURCES.BRAND, action: ACTIONS.READ, description: 'View brands' },
  UPDATE_BRAND: { resource: RESOURCES.BRAND, action: ACTIONS.UPDATE, description: 'Update brands' },
  DELETE_BRAND: { resource: RESOURCES.BRAND, action: ACTIONS.DELETE, description: 'Delete brands' },
  
  // Campaign permissions
  CREATE_CAMPAIGN: { resource: RESOURCES.CAMPAIGN, action: ACTIONS.CREATE, description: 'Create campaigns' },
  READ_CAMPAIGN: { resource: RESOURCES.CAMPAIGN, action: ACTIONS.READ, description: 'View campaigns' },
  UPDATE_CAMPAIGN: { resource: RESOURCES.CAMPAIGN, action: ACTIONS.UPDATE, description: 'Update campaigns' },
  DELETE_CAMPAIGN: { resource: RESOURCES.CAMPAIGN, action: ACTIONS.DELETE, description: 'Delete campaigns' },
  APPROVE_CAMPAIGN: { resource: RESOURCES.CAMPAIGN, action: ACTIONS.APPROVE, description: 'Approve campaigns' },
  
  // Ad permissions
  CREATE_AD: { resource: RESOURCES.AD, action: ACTIONS.CREATE, description: 'Create ads' },
  READ_AD: { resource: RESOURCES.AD, action: ACTIONS.READ, description: 'View ads' },
  UPDATE_AD: { resource: RESOURCES.AD, action: ACTIONS.UPDATE, description: 'Update ads' },
  DELETE_AD: { resource: RESOURCES.AD, action: ACTIONS.DELETE, description: 'Delete ads' },
  
  // Room permissions
  CREATE_ROOM: { resource: RESOURCES.ROOM, action: ACTIONS.CREATE, description: 'Create rooms' },
  READ_ROOM: { resource: RESOURCES.ROOM, action: ACTIONS.READ, description: 'View rooms' },
  UPDATE_ROOM: { resource: RESOURCES.ROOM, action: ACTIONS.UPDATE, description: 'Update rooms' },
  DELETE_ROOM: { resource: RESOURCES.ROOM, action: ACTIONS.DELETE, description: 'Delete rooms' },
  MODERATE_ROOM: { resource: RESOURCES.ROOM, action: ACTIONS.MODERATE, description: 'Moderate rooms' },
  
  // Engagement permissions
  CREATE_ENGAGEMENT: { resource: RESOURCES.ENGAGEMENT, action: ACTIONS.CREATE, description: 'Create engagements' },
  READ_ENGAGEMENT: { resource: RESOURCES.ENGAGEMENT, action: ACTIONS.READ, description: 'View engagements' },
  DELETE_ENGAGEMENT: { resource: RESOURCES.ENGAGEMENT, action: ACTIONS.DELETE, description: 'Delete engagements' },
  
  // Wallet permissions
  READ_WALLET: { resource: RESOURCES.WALLET, action: ACTIONS.READ, description: 'View wallet' },
  UPDATE_WALLET: { resource: RESOURCES.WALLET, action: ACTIONS.UPDATE, description: 'Update wallet' },
  
  // Transaction permissions
  CREATE_TRANSACTION: { resource: RESOURCES.TRANSACTION, action: ACTIONS.CREATE, description: 'Create transactions' },
  READ_TRANSACTION: { resource: RESOURCES.TRANSACTION, action: ACTIONS.READ, description: 'View transactions' },
  
  // Product permissions
  CREATE_PRODUCT: { resource: RESOURCES.PRODUCT, action: ACTIONS.CREATE, description: 'Create products' },
  READ_PRODUCT: { resource: RESOURCES.PRODUCT, action: ACTIONS.READ, description: 'View products' },
  UPDATE_PRODUCT: { resource: RESOURCES.PRODUCT, action: ACTIONS.UPDATE, description: 'Update products' },
  DELETE_PRODUCT: { resource: RESOURCES.PRODUCT, action: ACTIONS.DELETE, description: 'Delete products' },
  
  // Order permissions
  CREATE_ORDER: { resource: RESOURCES.ORDER, action: ACTIONS.CREATE, description: 'Create orders' },
  READ_ORDER: { resource: RESOURCES.ORDER, action: ACTIONS.READ, description: 'View orders' },
  UPDATE_ORDER: { resource: RESOURCES.ORDER, action: ACTIONS.UPDATE, description: 'Update orders' },
  
  // Notification permissions
  READ_NOTIFICATION: { resource: RESOURCES.NOTIFICATION, action: ACTIONS.READ, description: 'View notifications' },
  UPDATE_NOTIFICATION: { resource: RESOURCES.NOTIFICATION, action: ACTIONS.UPDATE, description: 'Update notifications' },
  
  // Achievement permissions
  READ_ACHIEVEMENT: { resource: RESOURCES.ACHIEVEMENT, action: ACTIONS.READ, description: 'View achievements' },
  CREATE_ACHIEVEMENT: { resource: RESOURCES.ACHIEVEMENT, action: ACTIONS.CREATE, description: 'Create achievements' },
  
  // Analytics permissions
  READ_ANALYTICS: { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, description: 'View analytics' },
  
  // System permissions
  MANAGE_SYSTEM: { resource: RESOURCES.SYSTEM, action: ACTIONS.MANAGE, description: 'Manage system' },
  READ_SYSTEM: { resource: RESOURCES.SYSTEM, action: ACTIONS.READ, description: 'View system information' },
} as const;

// Permission groups for common roles
export const ROLE_PERMISSIONS = {
  // Basic user permissions
  user: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.UPDATE_PROFILE,
    PERMISSIONS.READ_BRAND,
    PERMISSIONS.READ_CAMPAIGN,
    PERMISSIONS.READ_AD,
    PERMISSIONS.READ_ROOM,
    PERMISSIONS.CREATE_ENGAGEMENT,
    PERMISSIONS.READ_WALLET,
    PERMISSIONS.READ_TRANSACTION,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.READ_PRODUCT,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.READ_NOTIFICATION,
    PERMISSIONS.READ_ACHIEVEMENT,
  ],
  
  // Sponsor permissions
  sponsor: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.UPDATE_PROFILE,
    PERMISSIONS.CREATE_BRAND,
    PERMISSIONS.READ_BRAND,
    PERMISSIONS.UPDATE_BRAND,
    PERMISSIONS.DELETE_BRAND,
    PERMISSIONS.CREATE_CAMPAIGN,
    PERMISSIONS.READ_CAMPAIGN,
    PERMISSIONS.UPDATE_CAMPAIGN,
    PERMISSIONS.DELETE_CAMPAIGN,
    PERMISSIONS.CREATE_AD,
    PERMISSIONS.READ_AD,
    PERMISSIONS.UPDATE_AD,
    PERMISSIONS.DELETE_AD,
    PERMISSIONS.CREATE_ROOM,
    PERMISSIONS.READ_ROOM,
    PERMISSIONS.UPDATE_ROOM,
    PERMISSIONS.DELETE_ROOM,
    PERMISSIONS.READ_ENGAGEMENT,
    PERMISSIONS.READ_WALLET,
    PERMISSIONS.READ_TRANSACTION,
    PERMISSIONS.CREATE_PRODUCT,
    PERMISSIONS.READ_PRODUCT,
    PERMISSIONS.UPDATE_PRODUCT,
    PERMISSIONS.DELETE_PRODUCT,
    PERMISSIONS.READ_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.READ_ANALYTICS,
  ],
  
  // Moderator permissions
  moderator: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.READ_BRAND,
    PERMISSIONS.READ_CAMPAIGN,
    PERMISSIONS.APPROVE_CAMPAIGN,
    PERMISSIONS.READ_AD,
    PERMISSIONS.READ_ROOM,
    PERMISSIONS.MODERATE_ROOM,
    PERMISSIONS.READ_ENGAGEMENT,
    PERMISSIONS.DELETE_ENGAGEMENT,
    PERMISSIONS.READ_REPORT,
    PERMISSIONS.UPDATE_REPORT,
    PERMISSIONS.READ_ANALYTICS,
  ],
  
  // Admin permissions (all)
  admin: Object.values(PERMISSIONS),
} as const;

// Helper to check if permission exists
export const hasPermission = (
  userPermissions: string[],
  resource: ResourceType,
  action: ActionType
): boolean => {
  return userPermissions.some(p => p === `${resource}:${action}`);
};