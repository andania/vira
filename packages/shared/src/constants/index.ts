/**
 * Central exports for all constants
 */

export * from './roles';
export * from './permissions';
export * from './cap-weights';
export * from './ad-categories';
export * from './notification-types';
export * from './error-codes';

// Platform-wide constants
export const PLATFORM_NAME = 'VIRAZ';
export const PLATFORM_VERSION = '1.0.0';
export const PLATFORM_URL = 'https://viraz.com';
export const SUPPORT_EMAIL = 'support@viraz.com';
export const SUPPORT_PHONE = '+1234567890';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

// Rate limits
export const RATE_LIMITS = {
  PUBLIC: { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute
  AUTHENTICATED: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
  SPONSOR: { windowMs: 60 * 1000, max: 500 }, // 500 requests per minute
  ADMIN: { windowMs: 60 * 1000, max: 1000 }, // 1000 requests per minute
};

// File upload limits (in bytes)
export const FILE_UPLOAD_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 20 * 1024 * 1024, // 20MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Date formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DISPLAY: 'MMM D, YYYY',
  DISPLAY_TIME: 'MMM D, YYYY h:mm A',
  TIME: 'h:mm A',
  DATE: 'YYYY-MM-DD',
  TIME_24H: 'HH:mm:ss',
};

// Currency codes
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR', 'XOF'] as const;
export const DEFAULT_CURRENCY = 'USD';

// Language codes
export const LANGUAGES = [
  'en', // English
  'fr', // French
  'es', // Spanish
  'pt', // Portuguese
  'ar', // Arabic
  'zh', // Chinese
  'hi', // Hindi
  'sw', // Swahili
  'yo', // Yoruba
  'ha', // Hausa
  'ig', // Igbo
  'am', // Amharic
] as const;
export const DEFAULT_LANGUAGE = 'en';

// Timezones (major ones for target markets)
export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;