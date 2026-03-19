/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */

import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { jwtService } from '../services/jwt.service';
import { otpService } from '../services/otp.service';
import { sessionService } from '../services/session.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response) {
    try {
      const { username, email, phone, password, accountType, agreeToTerms } = req.body;

      if (!agreeToTerms) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'You must agree to the terms and conditions',
          },
        });
      }

      const result = await authService.register({
        username,
        email,
        phone,
        password,
        accountType,
        agreeToTerms,
      });

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error) {
      logger.error('Error in register:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Registration failed',
        },
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;

      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(
        { email, password, rememberMe },
        ipAddress,
        userAgent
      );

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 or 7 days
      });

      return res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
      });
    } catch (error) {
      logger.error('Error in login:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.INVALID_CREDENTIALS,
          message: error.message || 'Invalid credentials',
        },
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Refresh token required',
          },
        });
      }

      const result = await authService.refreshToken(refreshToken);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in refreshToken:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.INVALID_TOKEN,
          message: error.message || 'Invalid refresh token',
        },
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear cookie
      res.clearCookie('refreshToken');

      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Error in logout:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Logout failed',
        },
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await authService.logoutAll(userId);

      // Clear cookie
      res.clearCookie('refreshToken');

      return res.json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      logger.error('Error in logoutAll:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Logout failed',
        },
      });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      await authService.verifyEmail(token);

      return res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Error in verifyEmail:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Email verification failed',
        },
      });
    }
  }

  /**
   * Verify phone
   */
  async verifyPhone(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await authService.verifyPhone(userId, code);

      return res.json({
        success: true,
        message: 'Phone verified successfully',
      });
    } catch (error) {
      logger.error('Error in verifyPhone:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Phone verification failed',
        },
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      // Always return success even if email doesn't exist (security)
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      logger.error('Error in requestPasswordReset:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to process request',
        },
      });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      return res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Error in resetPassword:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Password reset failed',
        },
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Error in changePassword:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Password change failed',
        },
      });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'User not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          accountType: user.accountType,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          displayName: user.profile?.displayName,
          avatarUrl: user.profile?.avatarUrl,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error in getCurrentUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user',
        },
      });
    }
  }

  /**
   * Get active sessions
   */
  async getSessions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const sessions = await sessionService.getUserSessions(userId);

      return res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      logger.error('Error in getSessions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get sessions',
        },
      });
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await sessionService.revokeSession(sessionId, userId);

      return res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Error in revokeSession:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to revoke session',
        },
      });
    }
  }

  /**
   * Send phone OTP
   */
  async sendPhoneOTP(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { phone } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await otpService.sendSMSOTP(phone, userId);

      return res.json({
        success: true,
        message: 'OTP sent successfully',
      });
    } catch (error) {
      logger.error('Error in sendPhoneOTP:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to send OTP',
        },
      });
    }
  }

  /**
   * Verify phone OTP
   */
  async verifyPhoneOTP(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;

      const result = await otpService.verifySMSOTP(phone, otp);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in verifyPhoneOTP:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'OTP verification failed',
        },
      });
    }
  }

  /**
   * Check username availability
   */
  async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;

      const existing = await prisma.user.findUnique({
        where: { username },
      });

      return res.json({
        success: true,
        data: {
          available: !existing,
          username,
        },
      });
    } catch (error) {
      logger.error('Error in checkUsername:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check username',
        },
      });
    }
  }

  /**
   * Check email availability
   */
  async checkEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;

      const existing = await prisma.user.findUnique({
        where: { email },
      });

      return res.json({
        success: true,
        data: {
          available: !existing,
          email,
        },
      });
    } catch (error) {
      logger.error('Error in checkEmail:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check email',
        },
      });
    }
  }
}

export const authController = new AuthController();