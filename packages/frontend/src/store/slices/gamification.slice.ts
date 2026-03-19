/**
 * Gamification Slice
 * Manages ranks, achievements, leaderboards, and challenges state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { gamificationApi } from '../../services/api/gamification.api';

interface Rank {
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

interface Achievement {
  id: string;
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

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  score: number;
  metadata?: Record<string, any>;
}

interface Challenge {
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

interface GamificationState {
  rank: Rank | null;
  achievements: Achievement[];
  badges: Badge[];
  leaderboard: {
    global: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
    brand: Record<string, LeaderboardEntry[]>;
  };
  challenges: Challenge[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GamificationState = {
  rank: null,
  achievements: [],
  badges: [],
  leaderboard: {
    global: [],
    weekly: [],
    monthly: [],
    brand: {},
  },
  challenges: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const getUserRank = createAsyncThunk(
  'gamification/getUserRank',
  async () => {
    const response = await gamificationApi.getUserRank();
    return response.data;
  }
);

export const getAchievements = createAsyncThunk(
  'gamification/getAchievements',
  async () => {
    const response = await gamificationApi.getAchievements();
    return response.data;
  }
);

export const getAchievementProgress = createAsyncThunk(
  'gamification/getAchievementProgress',
  async (achievementId: string) => {
    const response = await gamificationApi.getAchievementProgress(achievementId);
    return response.data;
  }
);

export const claimAchievementReward = createAsyncThunk(
  'gamification/claimAchievementReward',
  async (achievementId: string) => {
    const response = await gamificationApi.claimAchievementReward(achievementId);
    return { achievementId, ...response.data };
  }
);

export const getLeaderboard = createAsyncThunk(
  'gamification/getLeaderboard',
  async ({ type, period, limit }: { type: string; period?: string; limit?: number }) => {
    const response = await gamificationApi.getLeaderboard(type, period, limit);
    return { type, data: response.data };
  }
);

export const getBrandLeaderboard = createAsyncThunk(
  'gamification/getBrandLeaderboard',
  async ({ brandId, period, limit }: { brandId: string; period?: string; limit?: number }) => {
    const response = await gamificationApi.getBrandLeaderboard(brandId, period, limit);
    return { brandId, data: response.data };
  }
);

export const getUserRankOnLeaderboard = createAsyncThunk(
  'gamification/getUserRankOnLeaderboard',
  async (type?: string) => {
    const response = await gamificationApi.getUserRankOnLeaderboard(type);
    return response.data;
  }
);

export const getActiveChallenges = createAsyncThunk(
  'gamification/getActiveChallenges',
  async () => {
    const response = await gamificationApi.getActiveChallenges();
    return response.data;
  }
);

export const getUserChallenges = createAsyncThunk(
  'gamification/getUserChallenges',
  async () => {
    const response = await gamificationApi.getUserChallenges();
    return response.data;
  }
);

export const claimChallengeReward = createAsyncThunk(
  'gamification/claimChallengeReward',
  async (challengeId: string) => {
    const response = await gamificationApi.claimChallengeReward(challengeId);
    return { challengeId, ...response.data };
  }
);

export const getGamificationProfile = createAsyncThunk(
  'gamification/getGamificationProfile',
  async () => {
    const response = await gamificationApi.getGamificationProfile();
    return response.data;
  }
);

export const getAvailableBadges = createAsyncThunk(
  'gamification/getAvailableBadges',
  async () => {
    const response = await gamificationApi.getAvailableBadges();
    return response.data;
  }
);

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    clearGamificationData: (state) => {
      state.rank = null;
      state.achievements = [];
      state.badges = [];
      state.challenges = [];
    },
    updateChallengeProgress: (state, action: PayloadAction<{ challengeId: string; progress: number }>) => {
      const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
      if (challenge) {
        challenge.progress = action.payload.progress;
        challenge.completed = challenge.progress >= challenge.target;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get user rank
      .addCase(getUserRank.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserRank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rank = action.payload;
      })
      .addCase(getUserRank.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get rank';
      })

      // Get achievements
      .addCase(getAchievements.fulfilled, (state, action) => {
        state.achievements = action.payload;
      })

      // Claim achievement reward
      .addCase(claimAchievementReward.fulfilled, (state, action) => {
        const achievement = state.achievements.find(a => a.id === action.payload.achievementId);
        if (achievement) {
          achievement.rewardClaimed = true;
        }
      })

      // Get leaderboard
      .addCase(getLeaderboard.fulfilled, (state, action) => {
        const { type, data } = action.payload;
        if (type === 'global') {
          state.leaderboard.global = data;
        } else if (type === 'weekly') {
          state.leaderboard.weekly = data;
        } else if (type === 'monthly') {
          state.leaderboard.monthly = data;
        }
      })

      // Get brand leaderboard
      .addCase(getBrandLeaderboard.fulfilled, (state, action) => {
        const { brandId, data } = action.payload;
        state.leaderboard.brand[brandId] = data;
      })

      // Get active challenges
      .addCase(getActiveChallenges.fulfilled, (state, action) => {
        state.challenges = action.payload;
      })

      // Get user challenges
      .addCase(getUserChallenges.fulfilled, (state, action) => {
        // Merge with existing challenges or replace
        state.challenges = action.payload.active;
      })

      // Claim challenge reward
      .addCase(claimChallengeReward.fulfilled, (state, action) => {
        const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
        if (challenge) {
          challenge.rewardClaimed = true;
        }
      })

      // Get gamification profile
      .addCase(getGamificationProfile.fulfilled, (state, action) => {
        state.rank = action.payload.rank;
        state.achievements = action.payload.achievements;
        state.badges = action.payload.badges;
        state.challenges = action.payload.currentChallenges;
      })

      // Get available badges
      .addCase(getAvailableBadges.fulfilled, (state, action) => {
        // This could be stored separately if needed
      });
  },
});

export const { clearGamificationData, updateChallengeProgress } = gamificationSlice.actions;
export default gamificationSlice.reducer;