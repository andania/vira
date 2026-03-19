/**
 * Seed Data - Permissions
 * Initial permissions for the platform
 */

import { Prisma } from '@prisma/client';

export const permissions: Prisma.PermissionCreateInput[] = [
  // User permissions
  {
    resource: 'user',
    action: 'create',
    description: 'Create new users',
  },
  {
    resource: 'user',
    action: 'read',
    description: 'View user information',
  },
  {
    resource: 'user',
    action: 'update',
    description: 'Update user information',
  },
  {
    resource: 'user',
    action: 'delete',
    description: 'Delete users',
  },

  // Profile permissions
  {
    resource: 'profile',
    action: 'read',
    description: 'View profiles',
  },
  {
    resource: 'profile',
    action: 'update',
    description: 'Update profiles',
  },

  // Sponsor permissions
  {
    resource: 'sponsor',
    action: 'create',
    description: 'Create sponsors',
  },
  {
    resource: 'sponsor',
    action: 'read',
    description: 'View sponsors',
  },
  {
    resource: 'sponsor',
    action: 'update',
    description: 'Update sponsors',
  },
  {
    resource: 'sponsor',
    action: 'approve',
    description: 'Approve sponsors',
  },

  // Brand permissions
  {
    resource: 'brand',
    action: 'create',
    description: 'Create brands',
  },
  {
    resource: 'brand',
    action: 'read',
    description: 'View brands',
  },
  {
    resource: 'brand',
    action: 'update',
    description: 'Update brands',
  },
  {
    resource: 'brand',
    action: 'delete',
    description: 'Delete brands',
  },

  // Campaign permissions
  {
    resource: 'campaign',
    action: 'create',
    description: 'Create campaigns',
  },
  {
    resource: 'campaign',
    action: 'read',
    description: 'View campaigns',
  },
  {
    resource: 'campaign',
    action: 'update',
    description: 'Update campaigns',
  },
  {
    resource: 'campaign',
    action: 'delete',
    description: 'Delete campaigns',
  },
  {
    resource: 'campaign',
    action: 'approve',
    description: 'Approve campaigns',
  },

  // Ad permissions
  {
    resource: 'ad',
    action: 'create',
    description: 'Create ads',
  },
  {
    resource: 'ad',
    action: 'read',
    description: 'View ads',
  },
  {
    resource: 'ad',
    action: 'update',
    description: 'Update ads',
  },
  {
    resource: 'ad',
    action: 'delete',
    description: 'Delete ads',
  },

  // Room permissions
  {
    resource: 'room',
    action: 'create',
    description: 'Create rooms',
  },
  {
    resource: 'room',
    action: 'join',
    description: 'Join rooms',
  },
  {
    resource: 'room',
    action: 'read',
    description: 'View rooms',
  },
  {
    resource: 'room',
    action: 'update',
    description: 'Update rooms',
  },
  {
    resource: 'room',
    action: 'delete',
    description: 'Delete rooms',
  },
  {
    resource: 'room',
    action: 'moderate',
    description: 'Moderate rooms',
  },
  {
    resource: 'room',
    action: 'host',
    description: 'Host rooms',
  },

  // Engagement permissions
  {
    resource: 'engagement',
    action: 'create',
    description: 'Create engagements',
  },
  {
    resource: 'engagement',
    action: 'read',
    description: 'View engagements',
  },
  {
    resource: 'engagement',
    action: 'delete',
    description: 'Delete engagements',
  },

  // Wallet permissions
  {
    resource: 'wallet',
    action: 'read',
    description: 'View wallet',
  },
  {
    resource: 'wallet',
    action: 'withdraw',
    description: 'Withdraw from wallet',
  },
  {
    resource: 'wallet',
    action: 'deposit',
    description: 'Deposit to wallet',
  },

  // Transaction permissions
  {
    resource: 'transaction',
    action: 'read',
    description: 'View transactions',
  },

  // Product permissions
  {
    resource: 'product',
    action: 'create',
    description: 'Create products',
  },
  {
    resource: 'product',
    action: 'read',
    description: 'View products',
  },
  {
    resource: 'product',
    action: 'update',
    description: 'Update products',
  },
  {
    resource: 'product',
    action: 'delete',
    description: 'Delete products',
  },

  // Order permissions
  {
    resource: 'order',
    action: 'create',
    description: 'Create orders',
  },
  {
    resource: 'order',
    action: 'read',
    description: 'View orders',
  },
  {
    resource: 'order',
    action: 'update',
    description: 'Update orders',
  },

  // Notification permissions
  {
    resource: 'notification',
    action: 'read',
    description: 'View notifications',
  },

  // Analytics permissions
  {
    resource: 'analytics',
    action: 'read',
    description: 'View analytics',
  },

  // Admin permissions
  {
    resource: 'admin',
    action: 'access',
    description: 'Access admin panel',
  },
  {
    resource: 'admin',
    action: 'manage_users',
    description: 'Manage users',
  },
  {
    resource: 'admin',
    action: 'manage_sponsors',
    description: 'Manage sponsors',
  },
  {
    resource: 'admin',
    action: 'manage_system',
    description: 'Manage system',
  },
];