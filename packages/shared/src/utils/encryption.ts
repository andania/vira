/**
 * Encryption and hashing utilities
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

/**
 * Generate a random string of specified length
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate a random numeric code (for OTP, etc.)
 */
export const generateRandomCode = (length: number = 6): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Hash a password using PBKDF2
 */
export const hash = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
};

/**
 * Compare a password with a hash
 */
export const compare = async (password: string, hash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
};

/**
 * Encrypt sensitive data
 */
export const encrypt = (text: string, key: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv, { authTagLength: TAG_LENGTH });
  
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
};

/**
 * Decrypt encrypted data
 */
export const decrypt = (encryptedText: string, key: string): string => {
  const [ivHex, encryptedHex, tagHex] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

/**
 * Generate a secure token (for JWT, API keys, etc.)
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('base64url');
};

/**
 * Generate a UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Create a SHA-256 hash of data
 */
export const sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Create a HMAC signature
 */
export const hmac = (data: string, key: string): string => {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
};

/**
 * Generate a one-time password (OTP)
 */
export const generateOTP = (): string => {
  return generateRandomCode(6);
};

/**
 * Verify OTP (simple comparison with timing-safe equal)
 */
export const verifyOTP = (provided: string, stored: string): boolean => {
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(stored));
};

/**
 * Generate API key and secret pair
 */
export const generateApiKeyPair = (): { key: string; secret: string } => {
  return {
    key: `vz_${generateToken(32)}`,
    secret: generateToken(64),
  };
};