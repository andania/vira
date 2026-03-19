/**
 * Authentication and authorization validators using Zod
 */

import { z } from 'zod';
import { AccountType } from '../types/user.types';

// Base schemas
const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must not exceed 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens')
  .toLowerCase()
  .trim();

// Login request validation
export const loginValidator = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

export type LoginRequest = z.infer<typeof loginValidator>['body'];

// Register request validation
export const registerValidator = z.object({
  body: z.object({
    username: usernameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum([AccountType.USER, AccountType.SPONSOR], {
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

export type RegisterRequest = z.infer<typeof registerValidator>['body'];

// Email verification validation
export const verifyEmailValidator = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailValidator>['body'];

// Phone verification validation
export const verifyPhoneValidator = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});

export type VerifyPhoneRequest = z.infer<typeof verifyPhoneValidator>['body'];

// Forgot password validation
export const forgotPasswordValidator = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordValidator>['body'];

// Reset password validation
export const resetPasswordValidator = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordValidator>['body'];

// Change password validation
export const changePasswordValidator = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordValidator>['body'];

// Refresh token validation
export const refreshTokenValidator = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenValidator>['body'];

// Logout validation
export const logoutValidator = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export type LogoutRequest = z.infer<typeof logoutValidator>['body'];

// Two-factor authentication validation
export const enable2FAValidator = z.object({
  body: z.object({
    method: z.enum(['app', 'sms', 'email'], {
      errorMap: () => ({ message: '2FA method must be app, sms, or email' }),
    }),
    phone: phoneSchema.optional(),
  }).refine(data => {
    if (data.method === 'sms' && !data.phone) {
      return false;
    }
    return true;
  }, {
    message: 'Phone number is required for SMS 2FA',
    path: ['phone'],
  }),
});

export type Enable2FARequest = z.infer<typeof enable2FAValidator>['body'];

export const verify2FAValidator = z.object({
  body: z.object({
    code: z.string().length(6, '2FA code must be 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
  }),
});

export type Verify2FARequest = z.infer<typeof verify2FAValidator>['body'];

// OAuth validation
export const oauthCallbackValidator = z.object({
  query: z.object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  }),
});

export type OAuthCallbackParams = z.infer<typeof oauthCallbackValidator>['query'];

// Session validation
export const sessionValidator = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
  }),
});

export type SessionParams = z.infer<typeof sessionValidator>['params'];