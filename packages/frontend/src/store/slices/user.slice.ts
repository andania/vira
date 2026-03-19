/**
 * User Slice
 * Manages user profile and preferences state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '../../services/api/user.api';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  interests?: string[];
}

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'followers';
    showActivity: boolean;
    showEarnings: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

interface UserStatistics {
  totalCapEarned: number;
  totalCapSpent: number;
  totalEngagements: number;
  totalFollowers: number;
  totalFollowing: number;
  totalCampaigns: number;
  totalRoomsJoined: number;
  dailyStreak: number;
  longestStreak: number;
  rank: string;
  level: number;
}

interface UserState {
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  statistics: UserStatistics | null;
  followers: any[];
  following: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  preferences: null,
  statistics: null,
  followers: [],
  following: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId?: string) => {
    const response = await userApi.getProfile(userId);
    return response.data;
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData: Partial<UserProfile>) => {
    const response = await userApi.updateProfile(profileData);
    return response.data;
  }
);

export const fetchUserPreferences = createAsyncThunk(
  'user/fetchPreferences',
  async () => {
    const response = await userApi.getPreferences();
    return response.data;
  }
);

export const updateUserPreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<UserPreferences>) => {
    const response = await userApi.updatePreferences(preferences);
    return response.data;
  }
);

export const fetchUserStatistics = createAsyncThunk(
  'user/fetchStatistics',
  async (userId?: string) => {
    const response = await userApi.getStatistics(userId);
    return response.data;
  }
);

export const fetchFollowers = createAsyncThunk(
  'user/fetchFollowers',
  async ({ userId, page = 1, limit = 20 }: { userId?: string; page?: number; limit?: number }) => {
    const response = await userApi.getFollowers(userId, page, limit);
    return response.data;
  }
);

export const fetchFollowing = createAsyncThunk(
  'user/fetchFollowing',
  async ({ userId, page = 1, limit = 20 }: { userId?: string; page?: number; limit?: number }) => {
    const response = await userApi.getFollowing(userId, page, limit);
    return response.data;
  }
);

export const followUser = createAsyncThunk(
  'user/follow',
  async (userId: string) => {
    const response = await userApi.followUser(userId);
    return { userId, data: response.data };
  }
);

export const unfollowUser = createAsyncThunk(
  'user/unfollow',
  async (userId: string) => {
    const response = await userApi.unfollowUser(userId);
    return { userId, data: response.data };
  }
);

export const uploadAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (file: File) => {
    const response = await userApi.uploadAvatar(file);
    return response.data;
  }
);

export const uploadCover = createAsyncThunk(
  'user/uploadCover',
  async (file: File) => {
    const response = await userApi.uploadCover(file);
    return response.data;
  }
);

export const updateInterests = createAsyncThunk(
  'user/updateInterests',
  async (interests: string[]) => {
    const response = await userApi.updateInterests(interests);
    return response.data;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserData: (state) => {
      state.profile = null;
      state.preferences = null;
      state.statistics = null;
      state.followers = [];
      state.following = [];
    },
    updateProfileField: (state, action: PayloadAction<{ field: keyof UserProfile; value: any }>) => {
      if (state.profile) {
        state.profile[action.payload.field] = action.payload.value;
      }
    },
    updatePreferenceField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      if (state.preferences) {
        const field = action.payload.field;
        const fields = field.split('.');
        if (fields.length === 2) {
          const [category, key] = fields;
          if (state.preferences[category as keyof UserPreferences]) {
            (state.preferences[category as keyof UserPreferences] as any)[key] = action.payload.value;
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })

      // Update profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = { ...state.profile, ...action.payload };
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update profile';
      })

      // Fetch preferences
      .addCase(fetchUserPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })

      // Update preferences
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
      })

      // Fetch statistics
      .addCase(fetchUserStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      })

      // Fetch followers
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.followers = action.payload;
      })

      // Fetch following
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.following = action.payload;
      })

      // Follow user
      .addCase(followUser.fulfilled, (state, action) => {
        if (state.statistics) {
          state.statistics.totalFollowing += 1;
        }
      })

      // Unfollow user
      .addCase(unfollowUser.fulfilled, (state, action) => {
        if (state.statistics) {
          state.statistics.totalFollowing -= 1;
        }
      })

      // Upload avatar
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.avatarUrl = action.payload.avatarUrl;
        }
      })

      // Upload cover
      .addCase(uploadCover.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.coverUrl = action.payload.coverUrl;
        }
      })

      // Update interests
      .addCase(updateInterests.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.interests = action.payload.interests;
        }
      });
  },
});

export const { clearUserData, updateProfileField, updatePreferenceField } = userSlice.actions;
export default userSlice.reducer;