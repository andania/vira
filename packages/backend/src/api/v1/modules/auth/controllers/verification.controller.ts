/**
 * Verification Controller
 * Handles email and phone verification
 */

import { Request, Response } from 'express';
import { prisma } from '../../../../../core/database/client';
import { otpService } from '../services/otp.service';
import { authService } from '../services/auth.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class VerificationController {
  /**
   * Send email verification
   */
  async sendEmailVerification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { email } = req.body;

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

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Email already verified',
          },
        });
      }

      // Send OTP via email
      await otpService.sendEmailOTP(email || user.email, userId);

      return res.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      logger.error('Error in sendEmailVerification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to send verification email',
        },
      });
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      const result = await otpService.verifyEmailOTP(email, otp);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Invalid or expired OTP',
            data: result,
          },
        });
      }

      return res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Error in verifyEmail:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to verify email',
        },
      });
    }
  }

  /**
   * Verify email with token (legacy method)
   */
  async verifyEmailWithToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      await authService.verifyEmail(token);

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL}/verification-success`);
    } catch (error) {
      logger.error('Error in verifyEmailWithToken:', error);
      res.redirect(`${process.env.FRONTEND_URL}/verification-failed`);
    }
  }

  /**
   * Send phone verification
   */
  async sendPhoneVerification(req: Request, res: Response) {
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

      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (user.phoneVerified) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Phone already verified',
          },
        });
      }

      // Send OTP via SMS
      await otpService.sendSMSOTP(phone || user.phone!, userId);

      return res.json({
        success: true,
        message: 'Verification code sent',
      });
    } catch (error) {
      logger.error('Error in sendPhoneVerification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to send verification code',
        },
      });
    }
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;

      const result = await otpService.verifySMSOTP(phone, otp);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Invalid or expired OTP',
            data: result,
          },
        });
      }

      return res.json({
        success: true,
        message: 'Phone verified successfully',
      });
    } catch (error) {
      logger.error('Error in verifyPhone:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to verify phone',
        },
      });
    }
  }

  /**
   * Resend verification code
   */
  async resendCode(req: Request, res: Response) {
    try {
      const { type, identifier } = req.params;

      let result;

      if (type === 'email') {
        result = await otpService.resendOTP(identifier, 'email');
      } else if (type === 'phone') {
        result = await otpService.resendOTP(identifier, 'sms');
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Invalid verification type',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Verification code resent',
      });
    } catch (error) {
      logger.error('Error in resendCode:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to resend code',
        },
      });
    }
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(req: Request, res: Response) {
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
        select: {
          emailVerified: true,
          phoneVerified: true,
          email: true,
          phone: true,
        },
      });

      return res.json({
        success: true,
        data: {
          email: {
            verified: user?.emailVerified,
            address: user?.email,
          },
          phone: {
            verified: user?.phoneVerified,
            number: user?.phone,
          },
        },
      });
    } catch (error) {
      logger.error('Error in getVerificationStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get verification status',
        },
      });
    }
  }

  /**
   * Update email (requires verification)
   */
  async updateEmail(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { newEmail, password } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid password',
          },
        });
      }

      // Check if email is already taken
      const existing = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.DUPLICATE_VALUE,
            message: 'Email already in use',
          },
        });
      }

      // Update email and mark as unverified
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerified: false,
        },
      });

      // Send verification email
      await otpService.sendEmailOTP(newEmail, userId);

      return res.json({
        success: true,
        message: 'Email updated. Please verify your new email.',
      });
    } catch (error) {
      logger.error('Error in updateEmail:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update email',
        },
      });
    }
  }

  /**
   * Update phone (requires verification)
   */
  async updatePhone(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { newPhone, password } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid password',
          },
        });
      }

      // Check if phone is already taken
      const existing = await prisma.user.findUnique({
        where: { phone: newPhone },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.DUPLICATE_VALUE,
            message: 'Phone number already in use',
          },
        });
      }

      // Update phone and mark as unverified
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: newPhone,
          phoneVerified: false,
        },
      });

      // Send verification SMS
      await otpService.sendSMSOTP(newPhone, userId);

      return res.json({
        success: true,
        message: 'Phone updated. Please verify your new number.',
      });
    } catch (error) {
      logger.error('Error in updatePhone:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update phone',
        },
      });
    }
  }

  /**
   * Get remaining attempts
   */
  async getRemainingAttempts(req: Request, res: Response) {
    try {
      const { type, identifier } = req.params;

      const remaining = await otpService.getRemainingAttempts(
        identifier,
        type as 'sms' | 'email'
      );

      return res.json({
        success: true,
        data: {
          remaining,
          type,
        },
      });
    } catch (error) {
      logger.error('Error in getRemainingAttempts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get remaining attempts',
        },
      });
    }
  }
}

export const verificationController = new VerificationController();