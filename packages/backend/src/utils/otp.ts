/**
 * OTP (One-Time Password) Utilities
 * For generating and verifying OTP codes
 */

import crypto from 'crypto';
import { authenticator } from 'otplib';
import { generateRandomNumber } from './encryption';
import { redis } from '../core/cache/redis.client';

// Configure otplib
authenticator.options = {
  step: 30, // 30 seconds
  window: 1, // 1 step before/after
  digits: 6,
};

/**
 * Generate a numeric OTP
 */
export const generateOTP = (length: number = 6): string => {
  return generateRandomNumber(length);
};

/**
 * Generate a TOTP secret
 */
export const generateTOTPSecret = (): string => {
  return authenticator.generateSecret();
};

/**
 * Generate TOTP token
 */
export const generateTOTP = (secret: string): string => {
  return authenticator.generate(secret);
};

/**
 * Verify TOTP token
 */
export const verifyTOTP = (token: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
};

/**
 * Generate TOTP URI for QR code
 */
export const generateTOTPURI = (
  secret: string,
  email: string,
  issuer: string = 'VIRAZ'
): string => {
  return authenticator.keyuri(email, issuer, secret);
};

/**
 * Store OTP in Redis with expiry
 */
export const storeOTP = async (
  identifier: string,
  otp: string,
  ttl: number = 300 // 5 minutes
): Promise<void> => {
  await redis.setex(`otp:${identifier}`, ttl, otp);
};

/**
 * Verify OTP from Redis
 */
export const verifyStoredOTP = async (
  identifier: string,
  otp: string,
  deleteIfValid: boolean = true
): Promise<boolean> => {
  const stored = await redis.get(`otp:${identifier}`);
  
  if (!stored || stored !== otp) {
    return false;
  }

  if (deleteIfValid) {
    await redis.del(`otp:${identifier}`);
  }

  return true;
};

/**
 * Generate and store OTP
 */
export const generateAndStoreOTP = async (
  identifier: string,
  ttl: number = 300
): Promise<string> => {
  const otp = generateOTP();
  await storeOTP(identifier, otp, ttl);
  return otp;
};

/**
 * Generate backup codes
 */
export const generateBackupCodes = (count: number = 10, length: number = 8): string[] => {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    codes.push(generateRandomNumber(length));
  }
  
  return codes;
};

/**
 * Hash backup codes for storage
 */
export const hashBackupCodes = (codes: string[]): string[] => {
  return codes.map(code => 
    crypto.createHash('sha256').update(code).digest('hex')
  );
};

/**
 * Verify backup code
 */
export const verifyBackupCode = (
  code: string,
  hashedCodes: string[]
): { valid: boolean; index?: number } => {
  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  const index = hashedCodes.indexOf(hashed);
  
  return {
    valid: index !== -1,
    index: index !== -1 ? index : undefined,
  };
};

/**
 * Generate HOTP (HMAC-based OTP)
 */
export const generateHOTP = (secret: string, counter: number): string => {
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(Buffer.from(counter.toString(), 'utf8'));
  const hmacResult = hmac.digest();
  
  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
};

/**
 * Get remaining seconds for current TOTP
 */
export const getTOTPRemainingSeconds = (): number => {
  const step = authenticator.options.step || 30;
  const now = Math.floor(Date.now() / 1000);
  return step - (now % step);
};

/**
 * Validate OTP format
 */
export const isValidOTP = (otp: string, length: number = 6): boolean => {
  const regex = new RegExp(`^\\d{${length}}$`);
  return regex.test(otp);
};

/**
 * Generate phone verification code
 */
export const generatePhoneVerificationCode = (): string => {
  return generateOTP(6);
};

/**
 * Generate email verification code
 */
export const generateEmailVerificationCode = (): string => {
  return generateOTP(6);
};

/**
 * Create OTP rate limiter key
 */
export const getOTPRateLimitKey = (identifier: string): string => {
  return `otp:ratelimit:${identifier}`;
};

/**
 * Check OTP rate limit
 */
export const checkOTPRateLimit = async (
  identifier: string,
  maxAttempts: number = 3,
  windowSeconds: number = 300
): Promise<boolean> => {
  const key = getOTPRateLimitKey(identifier);
  const attempts = await redis.get(key);
  
  if (attempts && parseInt(attempts) >= maxAttempts) {
    return false;
  }

  await redis.incr(key);
  await redis.expire(key, windowSeconds);
  
  return true;
};

/**
 * Generate random recovery codes
 */
export const generateRecoveryCodes = (count: number = 8): string[] => {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code.match(/.{1,4}/g)?.join('-') || code);
  }
  
  return codes;
};