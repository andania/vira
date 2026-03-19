/**
 * Authentication API Service
 */

import { ApiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  accountType: 'user' | 'sponsor';
  agreeToTerms: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    email: string;
    phone?: string;
    accountType: string;
    displayName?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

export const authApi = {
  /**
   * Login user
   */
  login: (data: LoginRequest) =>
    ApiClient.post<AuthResponse>('/api/v1/auth/login', data),

  /**
   * Register new user
   */
  register: (data: RegisterRequest) =>
    ApiClient.post<{ id: string; email: string; username: string; requiresVerification: boolean }>(
      '/api/v1/auth/register',
      data
    ),

  /**
   * Logout user
   */
  logout: () =>
    ApiClient.post('/api/v1/auth/logout', {}),

  /**
   * Refresh access token
   */
  refreshToken: () =>
    ApiClient.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/v1/auth/refresh',
      {}
    ),

  /**
   * Get current user
   */
  getCurrentUser: () =>
    ApiClient.get<any>('/api/v1/auth/me'),

  /**
   * Verify email with token
   */
  verifyEmail: (token: string) =>
    ApiClient.post(`/api/v1/auth/verify-email/${token}`, {}),

  /**
   * Send phone verification OTP
   */
  sendPhoneOTP: (phone: string) =>
    ApiClient.post('/api/v1/auth/verify/phone/send', { phone }),

  /**
   * Verify phone with OTP
   */
  verifyPhone: (code: string) =>
    ApiClient.post('/api/v1/auth/verify/phone', { code }),

  /**
   * Change password
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    ApiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword }),

  /**
   * Request password reset
   */
  forgotPassword: (email: string) =>
    ApiClient.post('/api/v1/auth/password-reset/request', { email }),

  /**
   * Reset password with token
   */
  resetPassword: (token: string, password: string) =>
    ApiClient.post('/api/v1/auth/password-reset/reset', { token, password }),

  /**
   * Check username availability
   */
  checkUsername: (username: string) =>
    ApiClient.get<{ available: boolean }>(`/api/v1/auth/check-username/${username}`),

  /**
   * Check email availability
   */
  checkEmail: (email: string) =>
    ApiClient.get<{ available: boolean }>(`/api/v1/auth/check-email/${email}`),

  /**
   * Get active sessions
   */
  getSessions: () =>
    ApiClient.get('/api/v1/auth/sessions'),

  /**
   * Revoke session
   */
  revokeSession: (sessionId: string) =>
    ApiClient.delete(`/api/v1/auth/sessions/${sessionId}`),

  /**
   * Google OAuth login
   */
  googleLogin: (token: string) =>
    ApiClient.post<AuthResponse>('/api/v1/auth/oauth/google', { token }),

  /**
   * Facebook OAuth login
   */
  facebookLogin: (accessToken: string) =>
    ApiClient.post<AuthResponse>('/api/v1/auth/oauth/facebook', { accessToken }),

  /**
   * Apple OAuth login
   */
  appleLogin: (identityToken: string, user?: any) =>
    ApiClient.post<AuthResponse>('/api/v1/auth/oauth/apple', { identityToken, user }),
};

export default authApi;