/**
 * Seed Data - Roles
 * Initial roles for the platform
 */

import { Prisma } from '@prisma/client';

export const roles: Prisma.RoleCreateInput[] = [
  {
    name: 'USER',
    description: 'Regular platform user',
    level: 1,
    isSystem: true,
  },
  {
    name: 'SPONSOR',
    description: 'Sponsor/business account',
    level: 2,
    isSystem: true,
  },
  {
    name: 'MODERATOR',
    description: 'Content moderator',
    level: 3,
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: 'System administrator',
    level: 4,
    isSystem: true,
  },
];

// Role to permission mappings
export const rolePermissions = [
  // USER permissions
  {
    roleName: 'USER',
    permissions: [
      'user:read',
      'user:update',
      'profile:read',
      'profile:update',
      'brand:read',
      'campaign:read',
      'ad:read',
      'room:read',
      'room:join',
      'engagement:create',
      'engagement:read',
      'wallet:read',
      'transaction:read',
      'product:read',
      'order:create',
      'order:read',
      'notification:read',
    ],
  },
  // SPONSOR permissions
  {
    roleName: 'SPONSOR',
    permissions: [
      'user:read',
      'user:update',
      'profile:read',
      'profile:update',
      'brand:create',
      'brand:read',
      'brand:update',
      'brand:delete',
      'campaign:create',
      'campaign:read',
      'campaign:update',
      'campaign:delete',
      'ad:create',
      'ad:read',
      'ad:update',
      'ad:delete',
      'room:create',
      'room:read',
      'room:update',
      'room:delete',
      'room:host',
      'engagement:read',
      'wallet:read',
      'wallet:withdraw',
      'wallet:deposit',
      'transaction:read',
      'product:create',
      'product:read',
      'product:update',
      'product:delete',
      'order:read',
      'order:update',
      'analytics:read',
    ],
  },
  // MODERATOR permissions
  {
    roleName: 'MODERATOR',
    permissions: [
      'user:read',
      'profile:read',
      'brand:read',
      'campaign:read',
      'campaign:approve',
      'ad:read',
      'room:read',
      'room:moderate',
      'engagement:read',
      'engagement:delete',
    ],
  },
  // ADMIN permissions (all)
  {
    roleName: 'ADMIN',
    permissions: ['*'], // Special wildcard for all permissions
  },
];