/**
 * Notification API Service
 */

import { ApiClient } from './client';

export interface Notification {
  id: string;
  type: 'financial' | 'engagement' | 'campaign' | 'room' | 'achievement' | 'system' | 'ai' | 'social';
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  isClicked: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface NotificationPreference {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: Record<string, boolean>;
}

export const notificationApi = {
  /**
   * Get notifications
   */
  getNotifications: (page: number = 1, limit: number = 20, unreadOnly: boolean = false) =>
    ApiClient.get<PaginatedResponse<Notification>>('/api/v1/notifications', {
      params: { page, limit, unread: unreadOnly },
    }),

  /**
   * Get unread count
   */
  getUnreadCount: () =>
    ApiClient.get<{ count: number }>('/api/v1/notifications/unread/count'),

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    ApiClient.put(`/api/v1/notifications/${notificationId}/read`, {}),

  /**
   * Mark all as read
   */
  markAllAsRead: () =>
    ApiClient.post('/api/v1/notifications/read/all', {}),

  /**
   * Delete notification
   */
  deleteNotification: (notificationId: string) =>
    ApiClient.delete(`/api/v1/notifications/${notificationId}`),

  /**
   * Get preferences
   */
  getPreferences: () =>
    ApiClient.get<NotificationPreference>('/api/v1/notifications/preferences'),

  /**
   * Update preferences
   */
  updatePreferences: (preferences: Partial<NotificationPreference>) =>
    ApiClient.put('/api/v1/notifications/preferences', preferences),

  /**
   * Update quiet hours
   */
  updateQuietHours: (enabled: boolean, start?: string, end?: string) =>
    ApiClient.put('/api/v1/notifications/preferences/quiet-hours', { enabled, start, end }),

  /**
   * Toggle category
   */
  toggleCategory: (category: string, enabled: boolean) =>
    ApiClient.put(`/api/v1/notifications/preferences/categories/${category}`, { enabled }),

  /**
   * Toggle channel
   */
  toggleChannel: (channel: string, enabled: boolean) =>
    ApiClient.put(`/api/v1/notifications/preferences/channels/${channel}`, { enabled }),

  /**
   * Reset preferences to default
   */
  resetPreferences: () =>
    ApiClient.post('/api/v1/notifications/preferences/reset', {}),

  /**
   * Register push token
   */
  registerPushToken: (token: string, deviceInfo: any) =>
    ApiClient.post('/api/v1/notifications/push/register', { token, deviceInfo }),

  /**
   * Unregister push token
   */
  unregisterPushToken: (token: string) =>
    ApiClient.post('/api/v1/notifications/push/unregister', { token }),
};

export default notificationApi;