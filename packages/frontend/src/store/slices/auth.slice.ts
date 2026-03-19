/**
 * Authentication Slice
 * Manages authentication state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/api/auth.api';

interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  accountType: 'USER' | 'SPONSOR' | 'ADMIN' | 'MODERATOR';
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  expiresIn: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await authApi.login({ email, password, rememberMe });
    return response.data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    accountType: string;
    agreeToTerms: boolean;
  }) => {
    const response = await authApi.register(userData);
    return response.data;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
});

export const refreshToken = createAsyncThunk('auth/refreshToken', async () => {
  const response = await authApi.refreshToken();
  return response.data;
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async () => {
  const response = await authApi.getCurrentUser();
  return response.data;
});

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ token }: { token: string }) => {
    const response = await authApi.verifyEmail(token);
    return response.data;
  }
);

export const verifyPhone = createAsyncThunk(
  'auth/verifyPhone',
  async ({ code }: { code: string }) => {
    const response = await authApi.verifyPhone(code);
    return response.data;
  }
);

export const sendPhoneOTP = createAsyncThunk(
  'auth/sendPhoneOTP',
  async ({ phone }: { phone: string }) => {
    const response = await authApi.sendPhoneOTP(phone);
    return response.data;
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    const response = await authApi.changePassword(currentPassword, newPassword);
    return response.data;
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }: { email: string }) => {
    const response = await authApi.forgotPassword(email);
    return response.data;
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }) => {
    const response = await authApi.resetPassword(token, password);
    return response.data;
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; expiresIn: number }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.expiresIn = action.payload.expiresIn;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresIn = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.expiresIn = action.payload.expiresIn;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })

      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        state.expiresIn = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      })

      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.expiresIn = action.payload.expiresIn;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      })

      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem('user');
      })

      // Verify email
      .addCase(verifyEmail.fulfilled, (state) => {
        if (state.user) {
          state.user.emailVerified = true;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })

      // Verify phone
      .addCase(verifyPhone.fulfilled, (state) => {
        if (state.user) {
          state.user.phoneVerified = true;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      });
  },
});

export const { setCredentials, clearCredentials, setUser, updateUser, clearError } = authSlice.actions;
export default authSlice.reducer;