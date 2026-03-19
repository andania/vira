/**
 * User API Service
 */

import { ApiClient } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  accountType: 'USER' | 'SPONSOR' | 'ADMIN' | 'MODERATOR';
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    website?: string;
    location?: string;
    interests?: string[];
  };
  statistics?: {
    totalCapEarned: number;
    totalFollowers: number;
    totalFollowing: number;
    dailyStreak: number;
    rank: string;
  };
  createdAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
}

export interface UserPreferences {
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

export interface UserStatistics {
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

export const userApi = {
  /**
   * Get user profile
   */
  getProfile: (userId?: string) =>
    ApiClient.get<UserProfile>(userId ? `/api/v1/users/${userId}` : '/api/v1/users/me'),

  /**
   * Get user by username
   */
  getByUsername: (username: string) =>
    ApiClient.get<UserProfile>(`/api/v1/users/username/${username}`),

  /**
   * Update user profile
   */
  updateProfile: (data: UpdateProfileData) =>
    ApiClient.put<UserProfile>('/api/v1/users/me/profile', data),

  /**
   * Get user preferences
   */
  getPreferences: () =>
    ApiClient.get<UserPreferences>('/api/v1/users/me/preferences'),

  /**
   * Update user preferences
   */
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    ApiClient.put<UserPreferences>('/api/v1/users/me/preferences', preferences),

  /**
   * Get user statistics
   */
  getStatistics: (userId?: string) =>
    ApiClient.get<UserStatistics>(userId ? `/api/v1/users/${userId}/stats` : '/api/v1/users/me/stats'),

  /**
   * Get user activity
   */
  getActivity: (page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<any>>('/api/v1/users/me/activity', { params: { page, limit } }),

  /**
   * Upload avatar
   */
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return ApiClient.post<{ avatarUrl: string }>('/api/v1/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Upload cover image
   */
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('cover', file);
    return ApiClient.post<{ coverUrl: string }>('/api/v1/users/me/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Update interests
   */
  updateInterests: (interests: string[]) =>
    ApiClient.put<{ interests: string[] }>('/api/v1/users/me/interests', { interests }),

  /**
   * Get followers
   */
  getFollowers: (userId?: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<any>>(
      userId ? `/api/v1/users/${userId}/followers` : '/api/v1/users/me/followers',
      { params: { page, limit } }
    ),

  /**
   * Get following
   */
  getFollowing: (userId?: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<any>>(
      userId ? `/api/v1/users/${userId}/following` : '/api/v1/users/me/following',
      { params: { page, limit } }
    ),

  /**
   * Follow user
   */
  followUser: (userId: string) =>
    ApiClient.post(`/api/v1/users/${userId}/follow`, {}),

  /**
   * Unfollow user
   */
  unfollowUser: (userId: string) =>
    ApiClient.delete(`/api/v1/users/${userId}/follow`),

  /**
   * Check if following
   */
  isFollowing: (userId: string) =>
    ApiClient.get<{ isFollowing: boolean }>(`/api/v1/users/${userId}/follow/status`),

  /**
   * Search users
   */
  searchUsers: (query: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<UserProfile>>('/api/v1/users/search', {
      params: { q: query, page, limit },
    }),

  /**
   * Get follower suggestions
   */
  getFollowerSuggestions: (limit: number = 10) =>
    ApiClient.get<UserProfile[]>('/api/v1/users/suggestions/followers', { params: { limit } }),

  /**
   * Deactivate account
   */
  deactivateAccount: (reason?: string) =>
    ApiClient.post('/api/v1/users/me/deactivate', { reason }),

  /**
   * Delete account
   */
  deleteAccount: (password: string) =>
    ApiClient.post('/api/v1/users/me/delete', { password }),
};

export default userApi;