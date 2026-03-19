/**
 * Seed Data - User Levels/Ranks
 * Based on PRD gamification system
 */

import { Prisma } from '@prisma/client';

export const levels: Prisma.LevelCreateInput[] = [
  {
    levelNumber: 1,
    name: 'Explorer',
    displayName: 'Explorer',
    minCap: 0,
    maxCap: 999,
    badgeIcon: '/badges/explorer.png',
    badgeColor: '#CD7F32', // Bronze
    benefits: {
      capMultiplier: 1.0,
      dailyCapLimit: 200,
      withdrawalLimit: 50,
      badge: 'bronze_compass',
    },
  },
  {
    levelNumber: 2,
    name: 'Engager',
    displayName: 'Engager',
    minCap: 1000,
    maxCap: 4999,
    badgeIcon: '/badges/engager.png',
    badgeColor: '#C0C0C0', // Silver
    benefits: {
      capMultiplier: 1.1,
      dailyCapLimit: 500,
      withdrawalLimit: 100,
      badge: 'silver_star',
    },
  },
  {
    levelNumber: 3,
    name: 'Contributor',
    displayName: 'Contributor',
    minCap: 5000,
    maxCap: 24999,
    badgeIcon: '/badges/contributor.png',
    badgeColor: '#FFD700', // Gold
    benefits: {
      capMultiplier: 1.2,
      dailyCapLimit: 1000,
      withdrawalLimit: 250,
      badge: 'gold_handshake',
    },
  },
  {
    levelNumber: 4,
    name: 'Influencer',
    displayName: 'Influencer',
    minCap: 25000,
    maxCap: 99999,
    badgeIcon: '/badges/influencer.png',
    badgeColor: '#E5E4E2', // Platinum
    benefits: {
      capMultiplier: 1.35,
      dailyCapLimit: 2000,
      withdrawalLimit: 500,
      badge: 'platinum_megaphone',
    },
  },
  {
    levelNumber: 5,
    name: 'Brand Ambassador',
    displayName: 'Brand Ambassador',
    minCap: 100000,
    maxCap: 499999,
    badgeIcon: '/badges/ambassador.png',
    badgeColor: '#B9F2FF', // Diamond
    benefits: {
      capMultiplier: 1.5,
      dailyCapLimit: 5000,
      withdrawalLimit: 1000,
      badge: 'diamond_handshake',
    },
  },
  {
    levelNumber: 6,
    name: 'Viraz Champion',
    displayName: 'Viraz Champion',
    minCap: 500000,
    maxCap: null,
    badgeIcon: '/badges/champion.png',
    badgeColor: '#E0115F', // Ruby
    benefits: {
      capMultiplier: 2.0,
      dailyCapLimit: 10000,
      withdrawalLimit: 2500,
      badge: 'ruby_crown',
    },
  },
];