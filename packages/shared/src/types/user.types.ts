/**
 * User-related type definitions
 */

import { UUID, DateTime, Email, PhoneNumber } from './index';

// User roles and status
export enum UserRole {
  USER = 'USER',
  SPONSOR = 'SPONSOR',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted'
}

export enum AccountType {
  USER = 'user',
  SPONSOR = 'sponsor',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Core user interfaces
export interface User {
  id: UUID;
  username: string;
  email: Email;
  phone?: PhoneNumber;
  status: UserStatus;
  accountType: AccountType;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: DateTime;
  lastLoginIp?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;
}

export interface UserProfile {
  userId: UUID;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: Gender;
  birthDate?: DateTime;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  website?: string;
  occupation?: string;
  company?: string;
  education?: string;
  interests: string[];
  languagePreference: string;
  timezone: string;
  updatedAt: DateTime;
}

export interface UserPreferences {
  userId: UUID;
  notificationPush: boolean;
  notificationEmail: boolean;
  notificationSms: boolean;
  notificationMarketing: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  contentLanguage: string[];
  contentCategories: string[];
  contentSensitivity: boolean;
  theme: 'light' | 'dark' | 'system';
  autoplayVideos: boolean;
  dataSaverMode: boolean;
  updatedAt: DateTime;
}

export interface UserLocation {
  id: UUID;
  userId: UUID;
  locationType: 'home' | 'work' | 'billing' | 'shipping' | 'other';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface UserStatistics {
  userId: UUID;
  totalCapEarned: number;
  totalCapSpent: number;
  totalAdsWatched: number;
  totalRoomsJoined: number;
  totalComments: number;
  totalLikesGiven: number;
  totalShares: number;
  totalSuggestions: number;
  totalSuggestionsAccepted: number;
  totalFollowers: number;
  totalFollowing: number;
  engagementRate: number;
  dailyStreak: number;
  longestStreak: number;
  lastActiveDate?: DateTime;
  updatedAt: DateTime;
}

// DTOs (Data Transfer Objects)
export interface CreateUserDTO {
  username: string;
  email: Email;
  phone?: PhoneNumber;
  password: string;
  accountType: AccountType;
}

export interface UpdateUserDTO {
  username?: string;
  email?: Email;
  phone?: PhoneNumber;
  status?: UserStatus;
}

export interface CreateProfileDTO {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: Gender;
  birthDate?: DateTime;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
}

export interface UpdateProfileDTO extends CreateProfileDTO {}

export interface UpdatePreferencesDTO {
  notificationPush?: boolean;
  notificationEmail?: boolean;
  notificationSms?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  theme?: 'light' | 'dark' | 'system';
  autoplayVideos?: boolean;
  dataSaverMode?: boolean;
}

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest extends CreateUserDTO {
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  phone: PhoneNumber;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: Email;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}