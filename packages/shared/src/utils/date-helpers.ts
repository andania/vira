/**
 * Date and time utilities
 */

import { DateTime } from '../types';

/**
 * Format date to string
 */
export const formatDate = (
  date: DateTime,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string => {
  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: format,
  };
  
  return new Intl.DateTimeFormat(locale, options).format(d);
};

/**
 * Format date with time
 */
export const formatDateTime = (
  date: DateTime,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string => {
  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: format,
    timeStyle: format,
  };
  
  return new Intl.DateTimeFormat(locale, options).format(d);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (
  date: DateTime,
  locale: string = 'en-US'
): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffYears > 0) {
    return rtf.format(Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)), 'year');
  }
  if (diffMonths > 0) {
    return rtf.format(Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)), 'month');
  }
  if (diffDays > 0) {
    return rtf.format(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 'day');
  }
  if (diffHours > 0) {
    return rtf.format(Math.floor(diffMs / (1000 * 60 * 60)), 'hour');
  }
  if (diffMins > 0) {
    return rtf.format(Math.floor(diffMs / (1000 * 60)), 'minute');
  }
  return rtf.format(Math.floor(diffMs / 1000), 'second');
};

/**
 * Check if date is today
 */
export const isToday = (date: DateTime): boolean => {
  const d = new Date(date);
  const today = new Date();
  
  return d.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: DateTime): boolean => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date: DateTime): boolean => {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return d.toDateString() === tomorrow.toDateString();
};

/**
 * Check if date is in the past
 */
export const isPast = (date: DateTime): boolean => {
  return new Date(date) < new Date();
};

/**
 * Check if date is in the future
 */
export const isFuture = (date: DateTime): boolean => {
  return new Date(date) > new Date();
};

/**
 * Get start of day
 */
export const startOfDay = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const endOfDay = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of week (Sunday)
 */
export const startOfWeek = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return startOfDay(d);
};

/**
 * Get end of week (Saturday)
 */
export const endOfWeek = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return endOfDay(d);
};

/**
 * Get start of month
 */
export const startOfMonth = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  d.setDate(1);
  return startOfDay(d);
};

/**
 * Get end of month
 */
export const endOfMonth = (date: DateTime = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return endOfDay(d);
};

/**
 * Get date range between two dates
 */
export const getDateRange = (
  startDate: DateTime,
  endDate: DateTime
): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  
  return dates;
};

/**
 * Check if date is within range
 */
export const isDateInRange = (
  date: DateTime,
  startDate: DateTime,
  endDate: DateTime
): boolean => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return d >= start && d <= end;
};

/**
 * Add days to date
 */
export const addDays = (date: DateTime, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Subtract days from date
 */
export const subtractDays = (date: DateTime, days: number): Date => {
  return addDays(date, -days);
};

/**
 * Get difference in days between two dates
 */
export const daysDiff = (date1: DateTime, date2: DateTime): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Get age from birth date
 */
export const getAge = (birthDate: DateTime): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format time in seconds to HH:MM:SS
 */
export const formatTimeFromSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (num: number): string => num.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
};