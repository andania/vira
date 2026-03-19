/**
 * Utilities Index
 * Central export point for all utility functions
 */

export * from './encryption';
export * from './hash';
export * from './token';
export * from './otp';
export * from './geolocation';
export * from './file-upload';
export * from './pagination';
export * from './helpers';
export * from './validation';
export * from './date';
export * from './currency';
export * from './logger';
export * from './string';
export * from './array';
export * from './object';

// Re-export commonly used utilities
import { encrypt, decrypt, generateKey } from './encryption';
import { hash, compare, hashPassword, verifyPassword } from './hash';
import { generateToken, verifyToken, decodeToken } from './token';
import { generateOTP, verifyOTP, generateBackupCodes } from './otp';
import { getGeoLocation, calculateDistance, getTimeZone } from './geolocation';
import { validateFile, uploadFile, deleteFile, getFileUrl } from './file-upload';
import { paginate, getPaginationMeta, getPaginationParams } from './pagination';
import { formatDate, formatRelativeTime, getDateRange, addDays, subDays } from './date';
import { formatCurrency, formatCap, convertCapToFiat, convertFiatToCap } from './currency';
import { createLogger, logError, logInfo, logDebug, logWarn } from './logger';
import { truncate, slugify, capitalize, camelCase, snakeCase } from './string';
import { groupBy, chunk, unique, shuffle, pluck } from './array';
import { pick, omit, deepClone, merge, flatten } from './object';

export const utils = {
  // Encryption
  encrypt,
  decrypt,
  generateKey,

  // Hash
  hash,
  compare,
  hashPassword,
  verifyPassword,

  // Token
  generateToken,
  verifyToken,
  decodeToken,

  // OTP
  generateOTP,
  verifyOTP,
  generateBackupCodes,

  // Geolocation
  getGeoLocation,
  calculateDistance,
  getTimeZone,

  // File upload
  validateFile,
  uploadFile,
  deleteFile,
  getFileUrl,

  // Pagination
  paginate,
  getPaginationMeta,
  getPaginationParams,

  // Date
  formatDate,
  formatRelativeTime,
  getDateRange,
  addDays,
  subDays,

  // Currency
  formatCurrency,
  formatCap,
  convertCapToFiat,
  convertFiatToCap,

  // Logger
  createLogger,
  logError,
  logInfo,
  logDebug,
  logWarn,

  // String
  truncate,
  slugify,
  capitalize,
  camelCase,
  snakeCase,

  // Array
  groupBy,
  chunk,
  unique,
  shuffle,
  pluck,

  // Object
  pick,
  omit,
  deepClone,
  merge,
  flatten,
};