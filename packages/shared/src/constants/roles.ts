/**
 * Role and permission constants
 */

import { UserRole } from '../types/user.types';

export const ROLES = {
  USER: UserRole.USER,
  SPONSOR: UserRole.SPONSOR,
  ADMIN: UserRole.ADMIN,
  MODERATOR: UserRole.MODERATOR,
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// Role hierarchy (higher number = more privileges)
export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [ROLES.USER]: 1,
  [ROLES.SPONSOR]: 2,
  [ROLES.MODERATOR]: 3,
  [ROLES.ADMIN]: 4,
};

// Role display names
export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
  [ROLES.USER]: 'User',
  [ROLES.SPONSOR]: 'Sponsor',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.ADMIN]: 'Administrator',
};

// Default roles for new users
export const DEFAULT_ROLE = ROLES.USER;

// Roles that can be assigned by each role
export const ASSIGNABLE_ROLES: Record<RoleType, RoleType[]> = {
  [ROLES.USER]: [],
  [ROLES.SPONSOR]: [ROLES.USER],
  [ROLES.MODERATOR]: [ROLES.USER, ROLES.SPONSOR],
  [ROLES.ADMIN]: [ROLES.USER, ROLES.SPONSOR, ROLES.MODERATOR],
};

// System roles that cannot be deleted
export const SYSTEM_ROLES = [ROLES.ADMIN, ROLES.MODERATOR];

// User rank levels (from PRD)
export enum UserRank {
  EXPLORER = 'explorer',
  ENGAGER = 'engager',
  CONTRIBUTOR = 'contributor',
  INFLUENCER = 'influencer',
  BRAND_AMBASSADOR = 'brand_ambassador',
  VIRAZ_CHAMPION = 'viraz_champion',
}

export const RANK_LEVELS: Record<UserRank, number> = {
  [UserRank.EXPLORER]: 1,
  [UserRank.ENGAGER]: 2,
  [UserRank.CONTRIBUTOR]: 3,
  [UserRank.INFLUENCER]: 4,
  [UserRank.BRAND_AMBASSADOR]: 5,
  [UserRank.VIRAZ_CHAMPION]: 6,
};

export const RANK_DISPLAY_NAMES: Record<UserRank, string> = {
  [UserRank.EXPLORER]: 'Explorer',
  [UserRank.ENGAGER]: 'Engager',
  [UserRank.CONTRIBUTOR]: 'Contributor',
  [UserRank.INFLUENCER]: 'Influencer',
  [UserRank.BRAND_AMBASSADOR]: 'Brand Ambassador',
  [UserRank.VIRAZ_CHAMPION]: 'Viraz Champion',
};

export const RANK_BADGES: Record<UserRank, string> = {
  [UserRank.EXPLORER]: 'bronze_compass',
  [UserRank.ENGAGER]: 'silver_star',
  [UserRank.CONTRIBUTOR]: 'gold_handshake',
  [UserRank.INFLUENCER]: 'platinum_megaphone',
  [UserRank.BRAND_AMBASSADOR]: 'diamond_handshake',
  [UserRank.VIRAZ_CHAMPION]: 'ruby_crown',
};

export const RANK_REQUIREMENTS: Record<UserRank, { minCap: number; maxCap?: number }> = {
  [UserRank.EXPLORER]: { minCap: 0, maxCap: 999 },
  [UserRank.ENGAGER]: { minCap: 1000, maxCap: 4999 },
  [UserRank.CONTRIBUTOR]: { minCap: 5000, maxCap: 24999 },
  [UserRank.INFLUENCER]: { minCap: 25000, maxCap: 99999 },
  [UserRank.BRAND_AMBASSADOR]: { minCap: 100000, maxCap: 499999 },
  [UserRank.VIRAZ_CHAMPION]: { minCap: 500000 },
};