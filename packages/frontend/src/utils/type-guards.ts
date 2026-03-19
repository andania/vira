/**
 * Runtime Type Guards
 * For safe type checking at runtime
 */

import {
  AccountType,
  UserStatus,
  CampaignStatus,
  CampaignObjective,
  RoomType,
  RoomStatus,
  AdType,
  TransactionType,
  NotificationType,
  TargetType,
  EngagementAction
} from '../enums.types';

// ============================================
// User Type Guards
// ============================================

export const isAccountType = (value: any): value is AccountType => {
  return Object.values(AccountType).includes(value);
};

export const isUserStatus = (value: any): value is UserStatus => {
  return Object.values(UserStatus).includes(value);
};

// ============================================
// Campaign Type Guards
// ============================================

export const isCampaignStatus = (value: any): value is CampaignStatus => {
  return Object.values(CampaignStatus).includes(value);
};

export const isCampaignObjective = (value: any): value is CampaignObjective => {
  return Object.values(CampaignObjective).includes(value);
};

// ============================================
// Room Type Guards
// ============================================

export const isRoomType = (value: any): value is RoomType => {
  return Object.values(RoomType).includes(value);
};

export const isRoomStatus = (value: any): value is RoomStatus => {
  return Object.values(RoomStatus).includes(value);
};

// ============================================
// Ad Type Guards
// ============================================

export const isAdType = (value: any): value is AdType => {
  return Object.values(AdType).includes(value);
};

// ============================================
// Transaction Type Guards
// ============================================

export const isTransactionType = (value: any): value is TransactionType => {
  return Object.values(TransactionType).includes(value);
};

// ============================================
// Notification Type Guards
// ============================================

export const isNotificationType = (value: any): value is NotificationType => {
  return Object.values(NotificationType).includes(value);
};

// ============================================
// Engagement Type Guards
// ============================================

export const isTargetType = (value: any): value is TargetType => {
  return Object.values(TargetType).includes(value);
};

export const isEngagementAction = (value: any): value is EngagementAction => {
  return Object.values(EngagementAction).includes(value);
};

// ============================================
// Generic Type Guards
// ============================================

export const isString = (value: any): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean';
};

export const isDate = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isISODateString = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);
};

export const isUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

export const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isPhoneNumber = (value: string): boolean => {
  return /^\+?[\d\s-]{10,}$/.test(value);
};

export const isUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isJsonString = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

// ============================================
// Array Type Guards
// ============================================

export const isArrayOfStrings = (value: any): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

export const isArrayOfNumbers = (value: any): value is number[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'number' && !isNaN(item));
};

export const isArrayOfUUIDs = (value: any): value is string[] => {
  return Array.isArray(value) && value.every(item => isUUID(item));
};

// ============================================
// Object Type Guards
// ============================================

export const hasProperty = <T extends object>(obj: T, prop: keyof any): prop is keyof T => {
  return prop in obj;
};

export const hasRequiredFields = <T extends object>(obj: T, requiredFields: (keyof T)[]): boolean => {
  return requiredFields.every(field => field in obj && obj[field] !== null && obj[field] !== undefined);
};

// ============================================
// API Response Type Guards
// ============================================

export const isApiSuccess = (response: any): response is { success: true; data: any } => {
  return response && response.success === true && 'data' in response;
};

export const isApiError = (response: any): response is { success: false; error: { code: string; message: string } } => {
  return response && response.success === false && 'error' in response;
};