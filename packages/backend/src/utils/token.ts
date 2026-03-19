/**
 * Token Utilities
 * For generating and verifying various tokens
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { redis } from '../core/cache/redis.client';

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  type: 'access' | 'refresh' | 'email_verification' | 'password_reset' | 'api_key';
  [key: string]: any;
}

export interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
}

/**
 * Generate JWT token
 */
export const generateToken = (
  payload: TokenPayload,
  options: TokenOptions = {}
): string => {
  const {
    expiresIn = config.jwtAccessExpiry,
    issuer = config.jwtIssuer,
    audience = config.jwtAudience,
  } = options;

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn,
    issuer,
    audience,
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (
  payload: Omit<TokenPayload, 'type'>,
  options: TokenOptions = {}
): string => {
  return generateToken(
    { ...payload, type: 'refresh' },
    {
      expiresIn: config.jwtRefreshExpiry,
      ...options,
    }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = <T = TokenPayload>(
  token: string,
  secret: string = config.jwtSecret
): T | null => {
  try {
    return jwt.verify(token, secret) as T;
  } catch (error) {
    return null;
  }
};

/**
 * Decode token without verification
 */
export const decodeToken = <T = TokenPayload>(token: string): T | null => {
  try {
    return jwt.decode(token) as T;
  } catch (error) {
    return null;
  }
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  return generateToken(
    {
      sub: userId,
      email,
      type: 'email_verification',
    },
    { expiresIn: '24h' }
  );
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  return generateToken(
    {
      sub: userId,
      email,
      type: 'password_reset',
    },
    { expiresIn: '1h' }
  );
};

/**
 * Generate API key
 */
export const generateApiKey = (): { key: string; secret: string } => {
  const key = `vz_${crypto.randomBytes(24).toString('base64url')}`;
  const secret = crypto.randomBytes(32).toString('base64url');
  
  return { key, secret };
};

/**
 * Generate API token
 */
export const generateApiToken = (userId: string, permissions: string[] = []): string => {
  return generateToken(
    {
      sub: userId,
      type: 'api_key',
      permissions,
    },
    { expiresIn: '365d' }
  );
};

/**
 * Blacklist a token
 */
export const blacklistToken = async (token: string, expiresIn?: number): Promise<void> {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return;

  const ttl = expiresIn || Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  await redis.setex(`blacklist:token:${token}`, ttl, '1');
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(`blacklist:token:${token}`);
  return !!result;
};

/**
 * Generate session token
 */
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate invite token
 */
export const generateInviteToken = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate OAuth state token
 */
export const generateOAuthState = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  
  return new Date(decoded.exp * 1000);
};

/**
 * Refresh token
 */
export const refreshToken = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  const payload = verifyToken(refreshToken, config.jwtRefreshSecret);
  if (!payload || payload.type !== 'refresh') return null;

  // Check if blacklisted
  if (await isTokenBlacklisted(refreshToken)) return null;

  // Generate new tokens
  const newPayload = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  const accessToken = generateToken({ ...newPayload, type: 'access' });
  const newRefreshToken = generateRefreshToken(newPayload);

  // Blacklist old refresh token
  await blacklistToken(refreshToken);

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Validate token signature
 */
export const validateTokenSignature = (token: string, secret?: string): boolean => {
  try {
    jwt.verify(token, secret || config.jwtSecret);
    return true;
  } catch {
    return false;
  }
};