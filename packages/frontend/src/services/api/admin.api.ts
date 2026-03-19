/**
 * Admin API Service
 */

import { ApiClient } from './client';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; latency: number };
    redis: { status: 'up' | 'down'; latency: number };
    queue: { status: 'up' | 'down'; jobs: number };
    storage: { status: 'up' | 'down' };
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    requestsPerSecond: number;
  };
}

export interface PlatformStats {
  users: {
    total: number;
    active: number;
    new: number;
    byType: Record<string, number>;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    totalSpend: number;
  };
  financial: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalRevenue: number;
    capInCirculation: number;
  };
  engagement: {
    totalEngagements: number;
    averagePerUser: number;
    topActions: Array<{ action: string; count: number }>;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface SystemConfig {
  key: string;
  value: any;
  type: string;
  description: string;
}

export interface UserManagement {
  id: string;
  username: string;
  email: string;
  accountType: string;
  status: string;
  createdAt: string;
  lastActive: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
  };
  statistics?: {
    totalCapEarned: number;
    totalEngagements: number;
    totalFollowers: number;
  };
}

export interface SponsorManagement {
  id: string;
  companyName: string;
  email: string;
  verificationStatus: string;
  subscriptionTier: string;
  subscriptionExpires?: string;
  totalCampaigns: number;
  totalSpend: number;
  createdAt: string;
}

export interface ModerationItem {
  id: string;
  type: 'room' | 'message' | 'comment' | 'review' | 'user';
  content: any;
  reportedBy: {
    id: string;
    username: string;
  };
  reportedAt: string;
  reason: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

export interface FraudAlert {
  id: string;
  userId: string;
  username: string;
  alertType: string;
  score: number;
  details: any;
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive';
  createdAt: string;
}

export interface JobStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export const adminApi = {
  // =====================================================
  // Dashboard
  // =====================================================

  /**
   * Get system health
   */
  getSystemHealth: () =>
    ApiClient.get<SystemHealth>('/api/v1/admin/health'),

  /**
   * Get platform statistics
   */
  getPlatformStats: () =>
    ApiClient.get<PlatformStats>('/api/v1/admin/stats/platform'),

  /**
   * Get dashboard summary
   */
  getDashboardSummary: () =>
    ApiClient.get<{ health: SystemHealth; stats: PlatformStats; jobs: any; recentActivity: any }>(
      '/api/v1/admin/dashboard'
    ),

  // =====================================================
  // Audit Logs
  // =====================================================

  /**
   * Get audit logs
   */
  getAuditLogs: (
    page: number = 1,
    limit: number = 50,
    userId?: string,
    action?: string,
    resourceType?: string,
    startDate?: string,
    endDate?: string
  ) =>
    ApiClient.get<PaginatedResponse<AuditLog>>('/api/v1/admin/audit-logs', {
      params: { page, limit, userId, action, resourceType, startDate, endDate },
    }),

  // =====================================================
  // System Configuration
  // =====================================================

  /**
   * Get system config
   */
  getSystemConfig: () =>
    ApiClient.get<Record<string, SystemConfig>>('/api/v1/admin/config'),

  /**
   * Update system config
   */
  updateSystemConfig: (settings: Record<string, any>) =>
    ApiClient.put('/api/v1/admin/config', { settings }),

  /**
   * Get jobs status
   */
  getJobsStatus: () =>
    ApiClient.get<Record<string, JobStatus>>('/api/v1/admin/jobs'),

  /**
   * Clear cache
   */
  clearCache: (type?: string) =>
    ApiClient.post('/api/v1/admin/cache/clear', { type }),

  /**
   * Run maintenance task
   */
  runMaintenance: (task: 'cleanup' | 'reindex' | 'optimize') =>
    ApiClient.post(`/api/v1/admin/maintenance/${task}`, {}),

  // =====================================================
  // User Management
  // =====================================================

  /**
   * Get users
   */
  getUsers: (
    page: number = 1,
    limit: number = 50,
    status?: string,
    accountType?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) =>
    ApiClient.get<PaginatedResponse<UserManagement>>('/api/v1/admin/users', {
      params: { page, limit, status, accountType, search, sortBy, sortOrder },
    }),

  /**
   * Get user details
   */
  getUserDetails: (userId: string) =>
    ApiClient.get<UserManagement & { reports: any[]; sessions: any[] }>(
      `/api/v1/admin/users/${userId}`
    ),

  /**
   * Update user status
   */
  updateUserStatus: (userId: string, status: string, reason?: string) =>
    ApiClient.patch(`/api/v1/admin/users/${userId}/status`, { status, reason }),

  /**
   * Update user role
   */
  updateUserRole: (userId: string, role: string) =>
    ApiClient.patch(`/api/v1/admin/users/${userId}/role`, { role }),

  /**
   * Verify user
   */
  verifyUser: (userId: string, type: 'email' | 'phone' | 'identity') =>
    ApiClient.post(`/api/v1/admin/users/${userId}/verify`, { type }),

  /**
   * Suspend user
   */
  suspendUser: (userId: string, reason: string, duration?: number) =>
    ApiClient.post(`/api/v1/admin/users/${userId}/suspend`, { reason, duration }),

  /**
   * Unsuspend user
   */
  unsuspendUser: (userId: string) =>
    ApiClient.post(`/api/v1/admin/users/${userId}/unsuspend`, {}),

  /**
   * Ban user
   */
  banUser: (userId: string, reason: string, permanent: boolean = true) =>
    ApiClient.post(`/api/v1/admin/users/${userId}/ban`, { reason, permanent }),

  /**
   * Delete user (GDPR)
   */
  deleteUser: (userId: string) =>
    ApiClient.delete(`/api/v1/admin/users/${userId}`),

  /**
   * Get user reports
   */
  getUserReports: (userId: string, page: number = 1, limit: number = 50) =>
    ApiClient.get<PaginatedResponse<any>>(`/api/v1/admin/users/${userId}/reports`, {
      params: { page, limit },
    }),

  /**
   * Get user growth chart
   */
  getUserGrowth: (days: number = 30) =>
    ApiClient.get<Array<{ date: string; count: number }>>('/api/v1/admin/users/growth/chart', {
      params: { days },
    }),

  /**
   * Export user data (GDPR)
   */
  exportUserData: (userId: string) =>
    ApiClient.get(`/api/v1/admin/users/${userId}/export`, { responseType: 'blob' }),

  // =====================================================
  // Sponsor Management
  // =====================================================

  /**
   * Get sponsors
   */
  getSponsors: (page: number = 1, limit: number = 50, verificationStatus?: string) =>
    ApiClient.get<PaginatedResponse<SponsorManagement>>('/api/v1/admin/sponsors', {
      params: { page, limit, verificationStatus },
    }),

  /**
   * Get sponsor details
   */
  getSponsorDetails: (sponsorId: string) =>
    ApiClient.get<any>(`/api/v1/admin/sponsors/${sponsorId}`),

  /**
   * Verify sponsor
   */
  verifySponsor: (sponsorId: string, approved: boolean, notes?: string) =>
    ApiClient.post(`/api/v1/admin/sponsors/${sponsorId}/verify`, { approved, notes }),

  /**
   * Update subscription tier
   */
  updateSubscriptionTier: (sponsorId: string, tier: string, expiresAt?: string) =>
    ApiClient.patch(`/api/v1/admin/sponsors/${sponsorId}/subscription`, { tier, expiresAt }),

  // =====================================================
  // Moderation
  // =====================================================

  /**
   * Get moderation queue
   */
  getModerationQueue: (
    page: number = 1,
    limit: number = 50,
    type?: string,
    status: string = 'pending'
  ) =>
    ApiClient.get<PaginatedResponse<ModerationItem>>('/api/v1/admin/moderation/queue', {
      params: { page, limit, type, status },
    }),

  /**
   * Get report details
   */
  getReportDetails: (reportId: string) =>
    ApiClient.get<any>(`/api/v1/admin/moderation/reports/${reportId}`),

  /**
   * Resolve report
   */
  resolveReport: (reportId: string, resolution: string, action?: string) =>
    ApiClient.post(`/api/v1/admin/moderation/reports/${reportId}/resolve`, { resolution, action }),

  /**
   * Dismiss report
   */
  dismissReport: (reportId: string, reason: string) =>
    ApiClient.post(`/api/v1/admin/moderation/reports/${reportId}/dismiss`, { reason }),

  /**
   * Take moderation action
   */
  takeModerationAction: (targetUserId: string, action: string, reason: string, duration?: number) =>
    ApiClient.post('/api/v1/admin/moderation/actions', { targetUserId, actionType: action, reason, duration }),

  /**
   * Remove moderation action
   */
  removeModerationAction: (actionId: string) =>
    ApiClient.delete(`/api/v1/admin/moderation/actions/${actionId}`),

  /**
   * Get moderation statistics
   */
  getModerationStats: () =>
    ApiClient.get<any>('/api/v1/admin/moderation/stats'),

  // =====================================================
  // Fraud Detection
  // =====================================================

  /**
   * Get fraud alerts
   */
  getFraudAlerts: (
    page: number = 1,
    limit: number = 50,
    status?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ) =>
    ApiClient.get<PaginatedResponse<FraudAlert>>('/api/v1/admin/fraud/alerts', {
      params: { page, limit, status, userId, startDate, endDate },
    }),

  /**
   * Get fraud alert details
   */
  getFraudAlertDetails: (alertId: string) =>
    ApiClient.get<FraudAlert>(`/api/v1/admin/fraud/alerts/${alertId}`),

  /**
   * Update fraud alert status
   */
  updateFraudAlertStatus: (alertId: string, status: string, notes?: string) =>
    ApiClient.patch(`/api/v1/admin/fraud/alerts/${alertId}/status`, { status, notes }),

  /**
   * Get fraud statistics
   */
  getFraudStatistics: () =>
    ApiClient.get<any>('/api/v1/admin/fraud/stats'),

  /**
   * Get blacklisted items
   */
  getBlacklistedItems: () =>
    ApiClient.get<{ users: any[]; devices: any[]; ips: any[] }>('/api/v1/admin/fraud/blacklist'),

  /**
   * Add to blacklist
   */
  addToBlacklist: (type: 'user' | 'device' | 'ip', value: string, reason: string) =>
    ApiClient.post('/api/v1/admin/fraud/blacklist', { type, value, reason }),

  /**
   * Remove from blacklist
   */
  removeFromBlacklist: (type: 'user' | 'device' | 'ip', value: string) =>
    ApiClient.delete('/api/v1/admin/fraud/blacklist', { data: { type, value } }),
};

export default adminApi;