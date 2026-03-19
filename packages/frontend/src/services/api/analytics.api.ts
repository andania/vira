/**
 * Analytics API Service
 */

import { ApiClient } from './client';

export interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  history?: Array<{ date: string; value: number }>;
}

export interface UserAnalytics {
  totalUsers: MetricData;
  activeUsers: MetricData;
  newUsers: MetricData;
  retentionRate: MetricData;
  userGrowth: Array<{ date: string; count: number }>;
  userSegments: Record<string, number>;
  geoDistribution: Array<{ country: string; count: number }>;
  deviceDistribution: Record<string, number>;
}

export interface CampaignAnalytics {
  impressions: MetricData;
  clicks: MetricData;
  ctr: MetricData;
  engagements: MetricData;
  conversionRate: MetricData;
  roi: MetricData;
  performance: Array<{ date: string; impressions: number; clicks: number; conversions: number }>;
  topAds: Array<{ adId: string; name: string; impressions: number; clicks: number }>;
  demographics: {
    age: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
  };
}

export interface FinancialAnalytics {
  revenue: MetricData;
  deposits: MetricData;
  withdrawals: MetricData;
  capCirculation: MetricData;
  transactionVolume: MetricData;
  averageOrderValue: MetricData;
  revenueBySource: Record<string, number>;
  revenueByPeriod: Array<{ date: string; amount: number }>;
}

export interface EngagementAnalytics {
  totalEngagements: MetricData;
  averagePerUser: MetricData;
  topActions: Array<{ action: string; count: number }>;
  engagementByHour: Array<{ hour: number; count: number }>;
  engagementByDay: Array<{ day: string; count: number }>;
  engagementByType: Record<string, number>;
}

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  url: string;
  createdAt: string;
  period: {
    start: string;
    end: string;
  };
}

export const analyticsApi = {
  /**
   * Get user analytics
   */
  getUserAnalytics: (userId?: string, days: number = 30) =>
    ApiClient.get<UserAnalytics>('/api/v1/analytics/users/me', { params: { userId, days } }),

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics: (campaignId: string, startDate?: string, endDate?: string) =>
    ApiClient.get<CampaignAnalytics>(`/api/v1/analytics/campaigns/${campaignId}`, {
      params: { startDate, endDate },
    }),

  /**
   * Get financial analytics
   */
  getFinancialAnalytics: (startDate?: string, endDate?: string) =>
    ApiClient.get<FinancialAnalytics>('/api/v1/analytics/financial', { params: { startDate, endDate } }),

  /**
   * Get engagement analytics
   */
  getEngagementAnalytics: (startDate?: string, endDate?: string) =>
    ApiClient.get<EngagementAnalytics>('/api/v1/analytics/engagement', { params: { startDate, endDate } }),

  /**
   * Get platform analytics
   */
  getPlatformAnalytics: (days: number = 30) =>
    ApiClient.get<any>('/api/v1/analytics/platform', { params: { days } }),

  /**
   * Get realtime analytics
   */
  getRealtimeAnalytics: () =>
    ApiClient.get<any>('/api/v1/analytics/realtime'),

  /**
   * Get active users
   */
  getActiveUsers: (period: 'realtime' | 'today' | 'week' | 'month' = 'today') =>
    ApiClient.get<{ period: string; count: number }>('/api/v1/analytics/users/active', { params: { period } }),

  /**
   * Query analytics
   */
  queryAnalytics: (query: any) =>
    ApiClient.post<any>('/api/v1/analytics/query', query),

  /**
   * Export analytics
   */
  exportAnalytics: (format: string, startDate: string, endDate: string, filters?: any) =>
    ApiClient.post('/api/v1/analytics/export', { format, startDate, endDate, filters }, {
      responseType: 'blob',
    }),

  /**
   * Get reports
   */
  getReports: (type?: string, startDate?: string, endDate?: string, limit: number = 50, offset: number = 0) =>
    ApiClient.get<PaginatedResponse<Report>>('/api/v1/analytics/reports', {
      params: { type, startDate, endDate, limit, offset },
    }),

  /**
   * Create report
   */
  createReport: (data: {
    name: string;
    type: string;
    format: string;
    filters: any;
    metrics: string[];
    schedule?: string;
    recipients?: string[];
  }) =>
    ApiClient.post<Report>('/api/v1/analytics/reports', data),

  /**
   * Get report by ID
   */
  getReportById: (reportId: string) =>
    ApiClient.get<Report>(`/api/v1/analytics/reports/${reportId}`),

  /**
   * Delete report
   */
  deleteReport: (reportId: string) =>
    ApiClient.delete(`/api/v1/analytics/reports/${reportId}`),

  /**
   * Download report
   */
  downloadReport: (reportId: string) =>
    ApiClient.get(`/api/v1/analytics/reports/${reportId}/download`, {
      responseType: 'blob',
    }),

  /**
   * Schedule report
   */
  scheduleReport: (reportId: string, schedule: string, recipients?: string[]) =>
    ApiClient.post(`/api/v1/analytics/reports/schedule`, { reportId, schedule, recipients }),

  /**
   * Get report templates
   */
  getReportTemplates: () =>
    ApiClient.get<any[]>('/api/v1/analytics/reports/templates/list'),
};

export default analyticsApi;