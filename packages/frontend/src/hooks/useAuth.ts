/**
 * useAuth Hook
 * Provides authentication state and methods
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import {
  login as loginAction,
  register as registerAction,
  logout as logoutAction,
  getCurrentUser,
  refreshToken,
  clearError,
} from '../store/slices/auth.slice';
import { socketService } from '../services/socket/socket.client';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone?: string;
  accountType: 'user' | 'sponsor';
  agreeToTerms: boolean;
}

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken');
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user]);

  // Token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      dispatch(refreshToken() as any);
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, dispatch]);

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const result = await dispatch(loginAction(credentials) as any);
        if (!result.error) {
          navigate('/');
        }
        return result;
      } catch (error) {
        return { error };
      }
    },
    [dispatch, navigate]
  );

  // Register
  const register = useCallback(
    async (data: RegisterData) => {
      try {
        const result = await dispatch(registerAction(data) as any);
        if (!result.error) {
          navigate('/login', {
            state: { message: 'Registration successful! Please verify your email.' },
          });
        }
        return result;
      } catch (error) {
        return { error };
      }
    },
    [dispatch, navigate]
  );

  // Logout
  const logout = useCallback(async () => {
    await dispatch(logoutAction() as any);
    navigate('/login');
  }, [dispatch, navigate]);

  // Refresh user data
  const refreshUser = useCallback(() => {
    return dispatch(getCurrentUser() as any);
  }, [dispatch]);

  // Clear auth error
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Check if user has role
  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!user) return false;
      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(user.accountType);
    },
    [user]
  );

  // Check if user is sponsor
  const isSponsor = useCallback(() => {
    return hasRole(['SPONSOR', 'ADMIN']);
  }, [hasRole]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return hasRole('ADMIN');
  }, [hasRole]);

  // Check if email is verified
  const isEmailVerified = useCallback(() => {
    return user?.emailVerified || false;
  }, [user]);

  // Check if phone is verified
  const isPhoneVerified = useCallback(() => {
    return user?.phoneVerified || false;
  }, [user]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    login,
    register,
    logout,
    refreshUser,
    clearAuthError,

    // Permissions
    hasRole,
    isSponsor,
    isAdmin,
    isEmailVerified,
    isPhoneVerified,

    // User info
    userId: user?.id,
    username: user?.username,
    email: user?.email,
    accountType: user?.accountType,
  };
};

export default useAuth;