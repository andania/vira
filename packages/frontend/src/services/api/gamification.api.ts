/**
 * Gamification API Service
 */

import { ApiClient } from './client';

export interface Rank {
  level: number;
  name: string;
  displayName: string;
  badge: string;
  minCap: number;
  maxCap?: number;
  progress: {
    current: number;
    next: number;
    percentage: number;
  };
  benefits: {
    capMultiplier: number;
    dailyCapLimit: number;
    withdrawalLimit: number;
  };
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  rewardCap: number;
  rewardBadge?: string;
  iconUrl?: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  requirements: Record<string, any>;
  rewards: Record<string, any>;
  progress: number;
  target: number;
  completed: boolean;
  rewardClaimed: boolean;
  expiresAt: string;
}

export interface GamificationProfile {
  rank: Rank;
  achievements: Achievement[];
  badges: Badge[];
  stats: {
    totalPoints: number;
    level: number;
    nextLevelPoints: number;
    completionRate: number;
  };
  currentChallenges: Challenge[];
}

export const gamificationApi = {
  /**
   * Get user rank
   */
  getUserRank: () =>
    ApiClient.get<Rank>('/api/v1/gamification/rank'),

  /**
   * Get leaderboard
   */
  getLeaderboard: (type: string = 'global', period?: string, limit: number = 100) =>
    ApiClient.get<LeaderboardEntry[]>('/api/v1/gamification/leaderboard', {
      params: { type, period, limit },
    }),

  /**
   * Get global leaderboard
   */
  getGlobalLeaderboard: (period?: string, limit: number = 100) =>
    ApiClient.get<LeaderboardEntry[]>('/api/v1/gamification/leaderboard/global', {
      params: { period, limit },
    }),

  /**
   * Get weekly leaderboard
   */
  getWeeklyLeaderboard: (limit: number = 100) =>
    ApiClient.get<LeaderboardEntry[]>('/api/v1/gamification/leaderboard/weekly', {
      params: { limit },
    }),

  /**
   * Get monthly leaderboard
   */
  getMonthlyLeaderboard: (limit: number = 100) =>
    ApiClient.get<LeaderboardEntry[]>('/api/v1/gamification/leaderboard/monthly', {
      params: { limit },
    }),

  /**
   * Get brand leaderboard
   */
  getBrandLeaderboard: (brandId: string, period?: string, limit: number = 100) =>
    ApiClient.get<LeaderboardEntry[]>(`/api/v1/gamification/leaderboard/brand/${brandId}`, {
      params: { period, limit },
    }),

  /**
   * Get user rank on leaderboard
   */
  getUserRankOnLeaderboard: (type?: string) =>
    ApiClient.get<{ rank: number; score: number }>('/api/v1/gamification/leaderboard/user/rank', {
      params: { type },
    }),

  /**
   * Get achievements
   */
  getAchievements: () =>
    ApiClient.get<Achievement[]>('/api/v1/gamification/achievements'),

  /**
   * Get achievement progress
   */
  getAchievementProgress: (achievementId: string) =>
    ApiClient.get<{ progress: number }>(`/api/v1/gamification/achievements/${achievementId}/progress`),

  /**
   * Claim achievement reward
   */
  claimAchievementReward: (achievementId: string) =>
    ApiClient.post(`/api/v1/gamification/achievements/${achievementId}/claim`, {}),

  /**
   * Get achievement stats
   */
  getAchievementStats: () =>
    ApiClient.get<any>('/api/v1/gamification/achievements/stats'),

  /**
   * Get top achievers
   */
  getTopAchievers: (limit: number = 10) =>
    ApiClient.get<any[]>('/api/v1/gamification/achievements/leaderboard', { params: { limit } }),

  /**
   * Get available badges
   */
  getAvailableBadges: () =>
    ApiClient.get<Badge[]>('/api/v1/gamification/badges'),

  /**
   * Get active challenges
   */
  getActiveChallenges: () =>
    ApiClient.get<Challenge[]>('/api/v1/gamification/challenges/active'),

  /**
   * Get user challenges
   */
  getUserChallenges: () =>
    ApiClient.get<{ active: Challenge[]; completed: Challenge[] }>('/api/v1/gamification/challenges/user'),

  /**
   * Get challenge by ID
   */
  getChallengeById: (challengeId: string) =>
    ApiClient.get<Challenge>(`/api/v1/gamification/challenges/${challengeId}`),

  /**
   * Claim challenge reward
   */
  claimChallengeReward: (challengeId: string) =>
    ApiClient.post(`/api/v1/gamification/challenges/${challengeId}/claim`, {}),

  /**
   * Get challenge leaderboard
   */
  getChallengeLeaderboard: (challengeId: string, limit: number = 10) =>
    ApiClient.get<LeaderboardEntry[]>(`/api/v1/gamification/challenges/${challengeId}/leaderboard`, {
      params: { limit },
    }),

  /**
   * Get challenge stats
   */
  getChallengeStats: () =>
    ApiClient.get<any>('/api/v1/gamification/challenges/stats'),

  /**
   * Get gamification profile
   */
  getGamificationProfile: () =>
    ApiClient.get<GamificationProfile>('/api/v1/gamification/profile'),
};

export default gamificationApi;