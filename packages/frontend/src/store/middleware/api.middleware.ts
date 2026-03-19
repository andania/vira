/**
 * API Middleware
 * Handles API requests, caching, offline queue, and retry logic
 */

import { Middleware } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/client';
import { storage } from '../../config';

interface QueuedRequest {
  id: string;
  action: any;
  timestamp: number;
  retryCount: number;
}

// Queue for offline requests
let offlineQueue: QueuedRequest[] = [];

// Check if online
const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// Process offline queue
const processOfflineQueue = async () => {
  if (!isOnline() || offlineQueue.length === 0) return;

  const queue = [...offlineQueue];
  offlineQueue = [];

  for (const queued of queue) {
    try {
      // Re-dispatch the action
      store.dispatch(queued.action);
    } catch (error) {
      console.error('Failed to process queued request:', error);
      // Re-queue if failed
      if (queued.retryCount < 3) {
        offlineQueue.push({
          ...queued,
          retryCount: queued.retryCount + 1,
        });
      }
    }
  }
};

// Listen for online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineQueue();
  });
}

/**
 * API middleware
 */
export const apiMiddleware: Middleware = (store) => (next) => (action) => {
  // Check if action has API metadata
  if (!action.meta?.api) {
    return next(action);
  }

  const { api } = action.meta;
  const { endpoint, method, data, params, cache, retry } = api;

  // Generate cache key
  const cacheKey = cache ? `${method}:${endpoint}:${JSON.stringify(params)}` : null;

  // Check cache
  if (cache && cacheKey) {
    const cached = localStorage.getItem(`api-cache:${cacheKey}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return next({
          ...action,
          payload: data,
          meta: { ...action.meta, fromCache: true },
        });
      }
    }
  }

  // Handle offline
  if (!isOnline()) {
    // Queue for later
    offlineQueue.push({
      id: Date.now().toString(),
      action,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Show offline notification
    store.dispatch({
      type: 'ui/addToast',
      payload: {
        type: 'warning',
        message: 'You are offline. Request will be processed when connection is restored.',
        duration: 5000,
      },
    });

    return;
  }

  // Make API request
  const makeRequest = async (retryCount = 0) => {
    try {
      let response;
      
      switch (method?.toLowerCase()) {
        case 'get':
          response = await apiClient.get(endpoint, { params });
          break;
        case 'post':
          response = await apiClient.post(endpoint, data, { params });
          break;
        case 'put':
          response = await apiClient.put(endpoint, data, { params });
          break;
        case 'patch':
          response = await apiClient.patch(endpoint, data, { params });
          break;
        case 'delete':
          response = await apiClient.delete(endpoint, { params });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Cache response
      if (cache && cacheKey) {
        localStorage.setItem(
          `api-cache:${cacheKey}`,
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          })
        );
      }

      return next({
        ...action,
        payload: response.data,
        meta: { ...action.meta, requestId: response.headers['x-request-id'] },
      });
    } catch (error: any) {
      // Handle retry logic
      if (retry && retryCount < (retry.maxAttempts || 3)) {
        const delay = retry.delay || Math.pow(2, retryCount) * 1000;
        
        // Show retry notification
        store.dispatch({
          type: 'ui/addToast',
          payload: {
            type: 'info',
            message: `Request failed. Retrying in ${delay/1000}s... (${retryCount + 1}/${retry.maxAttempts || 3})`,
            duration: 3000,
          },
        });

        setTimeout(() => {
          makeRequest(retryCount + 1);
        }, delay);

        return;
      }

      // Handle error
      const errorAction = {
        type: `${action.type}/rejected`,
        error: {
          message: error.response?.data?.error?.message || error.message || 'Request failed',
          status: error.response?.status,
          data: error.response?.data,
        },
        meta: action.meta,
      };

      return next(errorAction);
    }
  };

  makeRequest();
};

/**
 * Cache utilities
 */
export const cacheUtils = {
  /**
   * Clear all API cache
   */
  clearAllCache: () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api-cache:')) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Clear cache by pattern
   */
  clearCacheByPattern: (pattern: string) => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api-cache:') && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Get cache size
   */
  getCacheSize: (): number => {
    const keys = Object.keys(localStorage);
    return keys.filter(key => key.startsWith('api-cache:')).length;
  },
};

/**
 * Offline queue utilities
 */
export const offlineUtils = {
  /**
   * Get queued requests count
   */
  getQueuedCount: (): number => {
    return offlineQueue.length;
  },

  /**
   * Clear offline queue
   */
  clearQueue: () => {
    offlineQueue = [];
  },

  /**
   * Process queue manually
   */
  processQueue: async () => {
    await processOfflineQueue();
  },
};

// Store reference (will be set by store)
let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

export default apiMiddleware;