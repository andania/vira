/**
 * Notification Slice
 * Manages notifications and preferences state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '../../services/api/notification.api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  isClicked: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface NotificationPreference {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: Record<string, boolean>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async ({ page = 1, limit = 20, unreadOnly = false }: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await notificationApi.getNotifications(page, limit, unreadOnly);
    return response.data;
  }
);

export const getUnreadCount = createAsyncThunk(
  'notification/getUnreadCount',
  async () => {
    const response = await notificationApi.getUnreadCount();
    return response.data;
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (notificationId: string) => {
    const response = await notificationApi.markAsRead(notificationId);
    return { notificationId, ...response.data };
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async () => {
    await notificationApi.markAllAsRead();
    return true;
  }
);

export const deleteNotification = createAsyncThunk(
  'notification/deleteNotification',
  async (notificationId: string) => {
    await notificationApi.deleteNotification(notificationId);
    return notificationId;
  }
);

export const getPreferences = createAsyncThunk(
  'notification/getPreferences',
  async () => {
    const response = await notificationApi.getPreferences();
    return response.data;
  }
);

export const updatePreferences = createAsyncThunk(
  'notification/updatePreferences',
  async (preferences: Partial<NotificationPreference>) => {
    const response = await notificationApi.updatePreferences(preferences);
    return response.data;
  }
);

export const registerPushToken = createAsyncThunk(
  'notification/registerPushToken',
  async ({ token, deviceInfo }: { token: string; deviceInfo: any }) => {
    await notificationApi.registerPushToken(token, deviceInfo);
    return token;
  }
);

export const unregisterPushToken = createAsyncThunk(
  'notification/unregisterPushToken',
  async (token: string) => {
    await notificationApi.unregisterPushToken(token);
    return token;
  }
);

// WebSocket events (handled separately)
export const receiveNewNotification = createAsyncThunk(
  'notification/receiveNewNotification',
  async (notification: Notification) => {
    return notification;
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.pagination = initialState.pagination;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    resetNotificationState: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.pagination?.page === 1) {
          state.notifications = action.payload.notifications;
        } else {
          state.notifications = [...state.notifications, ...action.payload.notifications];
        }
        state.pagination = {
          page: action.payload.pagination?.page || 1,
          limit: action.payload.pagination?.limit || 20,
          total: action.payload.pagination?.total || 0,
          hasMore: action.payload.pagination?.hasMore || false,
        };
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      })

      // Get unread count
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      })

      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload.notificationId);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => {
          n.isRead = true;
        });
        state.unreadCount = 0;
      })

      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      })

      // Get preferences
      .addCase(getPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })

      // Update preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
      })

      // Receive new notification (from WebSocket)
      .addCase(receiveNewNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      });
  },
});

export const { clearNotifications, addNotification, resetNotificationState } = notificationSlice.actions;
export default notificationSlice.reducer;