/**
 * Central exports for all utilities
 */

export * from './encryption';
export * from './formatting';
export * from './validation';
export * from './pagination';
export * from './date-helpers';
export * from './currency';

// Re-export commonly used functions
import { formatCurrency, formatNumber, formatPercentage } from './formatting';
import { encrypt, decrypt, hash, compare, generateRandomString } from './encryption';
import { validateEmail, validatePhone, validatePassword, validateUrl } from './validation';
import { getPaginationParams, getPaginationMeta } from './pagination';
import { formatDate, formatRelativeTime, getDateRange, isDateInRange } from './date-helpers';
import { convertCapToFiat, convertFiatToCap, calculateCapValue } from './currency';

export const utils = {
  // Formatting
  formatCurrency,
  formatNumber,
  formatPercentage,
  
  // Encryption
  encrypt,
  decrypt,
  hash,
  compare,
  generateRandomString,
  
  // Validation
  validateEmail,
  validatePhone,
  validatePassword,
  validateUrl,
  
  // Pagination
  getPaginationParams,
  getPaginationMeta,
  
  // Date helpers
  formatDate,
  formatRelativeTime,
  getDateRange,
  isDateInRange,
  
  // Currency
  convertCapToFiat,
  convertFiatToCap,
  calculateCapValue,
};