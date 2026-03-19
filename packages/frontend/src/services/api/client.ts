/**
 * API Client
 * Axios instance with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { store } from '../../../store';
import { logout, refreshToken } from '../../../store/slices/auth.slice';
import { addToast } from '../../../store/slices/ui.slice';
import { apiLogger } from '../../../store/middleware/logger.middleware';
import config from '../../../config';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    firstItem: number;
    lastItem: number;
  };
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      apiLogger.request(config);
    }

    // Add auth token
    const token = localStorage.getItem(config.storage.token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      apiLogger.error(error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      apiLogger.response(response);
    }

    // Extract data from ApiResponse wrapper
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        return Promise.reject({
          response: {
            ...response,
            data: response.data.error,
          },
        });
      }
      response.data = response.data.data;
    }

    return response;
  },
  async (error: AxiosError) => {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      apiLogger.error(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshTokenValue = localStorage.getItem(config.storage.refreshToken);
        if (!refreshTokenValue) {
          throw new Error('No refresh token');
        }

        // Attempt to refresh token
        const response = await axios.post(`${config.apiUrl}/api/v1/auth/refresh`, {
          refreshToken: refreshTokenValue,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update tokens
        localStorage.setItem(config.storage.token, accessToken);
        localStorage.setItem(config.storage.refreshToken, newRefreshToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        store.dispatch(logout());
        store.dispatch(
          addToast({
            type: 'error',
            message: 'Your session has expired. Please log in again.',
          })
        );
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
    const errorCode = error.response?.data?.error?.code;

    // Show toast for user-facing errors (excluding 401 which is handled above)
    if (error.response?.status !== 401) {
      store.dispatch(
        addToast({
          type: 'error',
          message: errorMessage,
          duration: 5000,
        })
      );
    }

    return Promise.reject({
      message: errorMessage,
      code: errorCode,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// API client with convenience methods
export const ApiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then(res => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then(res => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then(res => res.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then(res => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then(res => res.data),
};

export default ApiClient;