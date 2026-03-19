/**
 * Validation utilities
 */

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (international format)
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[];
  score: number;
} => {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    score += password.length >= 12 ? 2 : 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score,
  };
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate username
 * - 3-20 characters
 * - Alphanumeric, underscore, hyphen
 * - No spaces
 */
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validate date
 */
export const validateDate = (date: any): boolean => {
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') return !isNaN(new Date(date).getTime());
  return false;
};

/**
 * Validate age (must be >= minAge)
 */
export const validateAge = (birthDate: Date, minAge: number = 13): boolean => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= minAge;
  }
  
  return age >= minAge;
};

/**
 * Validate CAP amount (must be positive integer)
 */
export const validateCapAmount = (amount: number): boolean => {
  return Number.isInteger(amount) && amount > 0;
};

/**
 * Validate percentage (0-100)
 */
export const validatePercentage = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

/**
 * Validate range
 */
export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate array length
 */
export const validateArrayLength = <T>(array: T[], min: number, max: number): boolean => {
  return array.length >= min && array.length <= max;
};

/**
 * Validate that all values are present in an object
 */
export const validateRequired = <T extends object>(obj: T, requiredFields: (keyof T)[]): string[] => {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      missing.push(String(field));
    }
  }
  
  return missing;
};

/**
 * Validate that a string is not empty or only whitespace
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate that a value is a valid ID (UUID format)
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate that a string contains only letters and spaces
 */
export const isAlpha = (value: string): boolean => {
  return /^[a-zA-Z\s]*$/.test(value);
};

/**
 * Validate that a string contains only numbers
 */
export const isNumeric = (value: string): boolean => {
  return /^\d+$/.test(value);
};

/**
 * Validate that a string is alphanumeric
 */
export const isAlphanumeric = (value: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(value);
};