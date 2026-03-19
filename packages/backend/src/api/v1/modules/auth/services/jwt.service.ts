/**
 * JWT Service
 * Handles JWT token generation, verification, and management
 */

import jwt from 'jsonwebtoken';
import { config } from '../../../../../config';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'email_verification' | 'password_reset';
  permissions?: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export class JwtService {
  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'access',
    };

    return jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'refresh',
    };

    return jwt.sign(tokenPayload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiry,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role: 'user',
      type: 'email_verification',
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '24h',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role: 'user',
      type: 'password_reset',
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as TokenPayload;

      if (decoded.type !== 'access') {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtRefreshSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as TokenPayload;

      if (decoded.type !== 'refresh') {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify email verification token
   */
  verifyEmailToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as TokenPayload;

      if (decoded.type !== 'email_verification') {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as TokenPayload;

      if (decoded.type !== 'password_reset') {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate token pair
   */
  generateTokenPair(userId: string, email: string, role: string): TokenResponse {
    const payload = { sub: userId, email, role };
    
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(config.jwtAccessExpiry),
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh token pair
   */
  async refreshTokenPair(refreshToken: string): Promise<TokenResponse> {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:token:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    return this.generateTokenPair(payload.sub, payload.email, payload.role);
  }

  /**
   * Blacklist token
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    await redis.setex(`blacklist:token:${token}`, expiresIn, '1');
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redis.get(`blacklist:token:${token}`);
    return !!result;
  }

  /**
   * Decode token without verification
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900; // 15 minutes default
    }
  }

  /**
   * Validate token signature
   */
  validateTokenSignature(token: string, secret: string = config.jwtSecret): boolean {
    try {
      jwt.verify(token, secret);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token claims
   */
  getTokenClaims(token: string): Record<string, any> | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as Record<string, any>;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create service token (for internal service communication)
   */
  createServiceToken(serviceName: string): string {
    return jwt.sign(
      {
        sub: serviceName,
        type: 'service',
        role: 'service',
      },
      config.jwtSecret,
      {
        expiresIn: '1h',
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }
    );
  }
}

export const jwtService = new JwtService();