/**
 * Auth Validators
 * Zod validation schemas for authentication operations
 */

import { z } from 'zod';

// Register validation
export const registerValidator = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    accountType: z.enum(['user', 'sponsor'], {
      errorMap: () => ({ message: 'Account type must be either user or sponsor' }),
    }),
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

// Login validation
export const loginValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

// Refresh token validation
export const refreshTokenValidator = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Change password validation
export const changePasswordValidator = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

// Request password reset validation
export const requestPasswordResetValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
  }),
});

// Reset password validation
export const resetPasswordValidator = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

// Verify email with token validation
export const verifyEmailTokenValidator = z.object({
  params: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

// Send email verification validation
export const sendEmailVerificationValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
  }),
});

// Send phone verification validation
export const sendPhoneVerificationValidator = z.object({
  body: z.object({
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  }),
});

// Verify OTP validation
export const verifyOTPValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
  }).refine(data => data.email || data.phone, {
    message: 'Either email or phone is required',
  }),
});

// Resend code validation
export const resendCodeValidator = z.object({
  params: z.object({
    type: z.enum(['email', 'phone']),
    identifier: z.string().min(1, 'Identifier is required'),
  }),
});

// Update email validation
export const updateEmailValidator = z.object({
  body: z.object({
    newEmail: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Update phone validation
export const updatePhoneValidator = z.object({
  body: z.object({
    newPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Get remaining attempts validation
export const getRemainingAttemptsValidator = z.object({
  params: z.object({
    type: z.enum(['email', 'phone']),
    identifier: z.string().min(1, 'Identifier is required'),
  }),
});

// Revoke session validation
export const revokeSessionValidator = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
  }),
});

// Check username availability validation
export const checkUsernameValidator = z.object({
  params: z.object({
    username: z.string().min(3).max(20),
  }),
});

// Check email availability validation
export const checkEmailValidator = z.object({
  params: z.object({
    email: z.string().email('Invalid email address'),
  }),
});