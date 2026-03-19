/**
 * Hashing Utilities
 * For password hashing and comparison
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config';

const SALT_ROUNDS = config.bcryptRounds || 10;

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Hash data using bcrypt (general purpose)
 */
export const hash = async (data: string): Promise<string> => {
  return bcrypt.hash(data, SALT_ROUNDS);
};

/**
 * Compare data with hash
 */
export const compare = async (data: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(data, hash);
};

/**
 * Create MD5 hash (not for passwords!)
 */
export const md5 = (data: string): string => {
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Create SHA-1 hash (not for passwords!)
 */
export const sha1 = (data: string): string => {
  return crypto.createHash('sha1').update(data).digest('hex');
};

/**
 * Create SHA-256 hash
 */
export const sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Create SHA-512 hash
 */
export const sha512 = (data: string): string => {
  return crypto.createHash('sha512').update(data).digest('hex');
};

/**
 * Create HMAC
 */
export const hmac = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Generate a random salt
 */
export const generateSalt = (length: number = 16): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash with salt (using SHA-256)
 */
export const hashWithSalt = (data: string, salt: string): string => {
  return sha256(data + salt);
};

/**
 * Create a hash of an object
 */
export const hashObject = (obj: any): string => {
  return sha256(JSON.stringify(obj));
};

/**
 * Create a hash of multiple values
 */
export const hashValues = (...values: any[]): string => {
  return sha256(values.map(v => String(v)).join('|'));
};

/**
 * Check password strength
 */
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add at least one lowercase letter');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add at least one number');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add at least one special character');
  }

  return { score, feedback };
};

/**
 * Generate password reset token
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash email for gravatar
 */
export const gravatarHash = (email: string): string => {
  return md5(email.trim().toLowerCase());
};

/**
 * Create a fingerprint from device info
 */
export const createFingerprint = (info: {
  ip?: string;
  userAgent?: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
}): string => {
  const data = [
    info.ip || '',
    info.userAgent || '',
    info.acceptLanguage || '',
    info.acceptEncoding || '',
  ].join('|');
  
  return sha256(data);
};