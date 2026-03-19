/**
 * Encryption Utilities
 * For encrypting and decrypting sensitive data
 */

import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

/**
 * Generate a random encryption key
 */
export const generateKey = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Derive a key from password using PBKDF2
 */
export const deriveKey = (password: string, salt: string): Buffer => {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
};

/**
 * Encrypt data
 */
export const encrypt = (text: string, key?: string): string => {
  const encryptionKey = key || config.encryptionKey;
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const derivedKey = deriveKey(encryptionKey, salt.toString('hex'));
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_LENGTH,
  });
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Combine salt, iv, tag, and encrypted data
  const result = Buffer.concat([
    salt,
    iv,
    tag,
    encrypted,
  ]);
  
  return result.toString('base64');
};

/**
 * Decrypt data
 */
export const decrypt = (encryptedData: string, key?: string): string => {
  const encryptionKey = key || config.encryptionKey;
  const data = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const derivedKey = deriveKey(encryptionKey, salt.toString('hex'));
  
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_LENGTH,
  });
  
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
};

/**
 * Generate a random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate a random number of specified length
 */
export const generateRandomNumber = (length: number = 6): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
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
 * Create HMAC signature
 */
export const hmac = (data: string, key: string): string => {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
};

/**
 * Generate API key pair
 */
export const generateApiKeyPair = (): { key: string; secret: string } => {
  return {
    key: `vz_${generateRandomString(32)}`,
    secret: generateRandomString(64),
  };
};

/**
 * Mask sensitive data
 */
export const maskData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars) return data;
  
  const masked = '*'.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  
  return masked + visible;
};

/**
 * Mask email
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * Encrypt object
 */
export const encryptObject = <T extends object>(obj: T, key?: string): string => {
  return encrypt(JSON.stringify(obj), key);
};

/**
 * Decrypt object
 */
export const decryptObject = <T extends object>(encrypted: string, key?: string): T => {
  return JSON.parse(decrypt(encrypted, key));
};

/**
 * Check if string is encrypted
 */
export const isEncrypted = (data: string): boolean => {
  try {
    const buffer = Buffer.from(data, 'base64');
    return buffer.length > SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
};

/**
 * Generate secure token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('base64url');
};