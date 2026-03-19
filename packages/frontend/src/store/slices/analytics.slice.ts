/**
 * Analytics Slice
 * Manages analytics and reporting state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { analyticsApi } from '../../services/api/analytics.api';

interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  history?: Array<{ date: string; value: number }>;
}

interface UserAnalytics {
  totalUsers: MetricData;
  activeUsers: MetricData;
  newUsers: MetricData;
  retentionRate: MetricData;
  userGrowth: Array<{ date: string; count: number }>;
  userSegments: Record<string, number>;
}

interface CampaignAnalytics {
  impressions: MetricData;
  clicks: MetricData;
  ctr: MetricData;
  engagements: MetricData;
  conversionRate: MetricData;
  roi: MetricData;
  performance: Array<{ date: string; impressions: number; clicks: number; conversions: number }>;
}

interface FinancialAnalytics {
  revenue: MetricData;
  deposits: MetricData;
  withdrawals: MetricData;
  capCirculation: MetricData;
  transactionVolume: MetricData;
  revenueBySource: Record<string, number>;
}

interface EngagementAnalytics {
  totalEngagements: MetricData;
  averageEngagementsPerUser: MetricData;
  topActions: Array<{ action: string; count: number }>;
  engagementByHour: Array<{ hour: number; count: number }>;
  engagementByDay: Array<{ day: string; count: number }>;
}

interface Report {
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

interface AnalyticsState {
  userAnalytics: UserAnalytics | null;
  campaignAnalytics: CampaignAnalytics | null;
  financialAnalytics: FinancialAnalytics | null;
  engagementAnalytics: EngagementAnalytics | null;
  reports: Report[];
  currentReport: Report | null;
  isLoading: boolean;
  error: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const initialState: AnalyticsState = {
  userAnalytics: null,
  campaignAnalytics: null,
  financialAnalytics: null,
  engagementAnalytics: null,
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,
  dateRange: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
};

// Async thunks
export const getUserAnalytics = createAsyncThunk(
  'analytics/getUserAnalytics',
  async ({ userId, days }: { userId?: string; days?: number }) => {
    const response = await analyticsApi.getUserAnalytics(userId, days);
    return response.data;
  }
);

export const getCampaignAnalytics = createAsyncThunk(
  'analytics/getCampaignAnalytics',
  async ({ campaignId, startDate, endDate }: { campaignId: string; startDate?: string; endDate?: string }) => {
    const response = await analyticsApi.getCampaignAnalytics(campaignId, startDate, endDate);
    return response.data;
  }
);

export const getFinancialAnalytics = createAsyncThunk(
  'analytics/getFinancialAnalytics',
  async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    const response = await analyticsApi.getFinancialAnalytics(startDate, endDate);
    return response.data;
  }
);

export const getEngagementAnalytics = createAsyncThunk(
  'analytics/getEngagementAnalytics',
  async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    const response = await analyticsApi.getEngagementAnalytics(startDate, endDate);
    return response.data;
  }
);

export const getPlatformAnalytics = createAsyncThunk(
  'analytics/getPlatformAnalytics',
  async (days?: number) => {
    const response = await analyticsApi.getPlatformAnalytics(days);
    return response.data;
  }
);

export const getReports = createAsyncThunk(
  'analytics/getReports',
  async ({ type, startDate, endDate, limit, offset }: {
    type?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await analyticsApi.getReports(type, startDate, endDate, limit, offset);
    return response.data;
  }
);

export const createReport = createAsyncThunk(
  'analytics/createReport',
  async (reportData: any) => {
    const response = await analyticsApi.createReport(reportData);
    return response.data;
  }
);

export const getReportById = createAsyncThunk(
  'analytics/getReportById',
  async (reportId: string) => {
    const response = await analyticsApi.getReportById(reportId);
    return response.data;
  }
);

export const deleteReport = createAsyncThunk(
  'analytics/deleteReport',
  async (reportId: string) => {
    await analyticsApi.deleteReport(reportId);
    return reportId;
  }
);

export const exportData = createAsyncThunk(
  'analytics/exportData',
  async ({ format, startDate, endDate }: { format: string; startDate: string; endDate: string }) => {
    const response = await analyticsApi.exportData(format, startDate, endDate);
    return response.data;
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
      state.dateRange = action.payload;
    },
    clearAnalytics: (state) => {
      state.userAnalytics = null;
      state.campaignAnalytics = null;
      state.financialAnalytics = null;
      state.engagementAnalytics = null;
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get user analytics
      .addCase(getUserAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userAnalytics = action.payload;
      })
      .addCase(getUserAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get user analytics';
      })

      // Get campaign analytics
      .addCase(getCampaignAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCampaignAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.campaignAnalytics = action.payload;
      })
      .addCase(getCampaignAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get campaign analytics';
      })

      // Get financial analytics
      .addCase(getFinancialAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getFinancialAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.financialAnalytics = action.payload;
      })
      .addCase(getFinancialAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get financial analytics';
      })

      // Get engagement analytics
      .addCase(getEngagementAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getEngagementAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.engagementAnalytics = action.payload;
      })
      .addCase(getEngagementAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get engagement analytics';
      })

      // Get platform analytics
      .addCase(getPlatformAnalytics.fulfilled, (state, action) => {
        // This might set multiple analytics types
        if (action.payload.users) state.userAnalytics = action.payload.users;
        if (action.payload.financial) state.financialAnalytics = action.payload.financial;
        if (action.payload.engagement) state.engagementAnalytics = action.payload.engagement;
      })

      // Get reports
      .addCase(getReports.fulfilled, (state, action) => {
        state.reports = action.payload.reports;
      })

      // Create report
      .addCase(createReport.fulfilled, (state, action) => {
        state.reports.unshift(action.payload);
        state.currentReport = action.payload;
      })

      // Get report by ID
      .addCase(getReportById.fulfilled, (state, action) => {
        state.currentReport = action.payload;
      })

      // Delete report
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter(r => r.id !== action.payload);
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      })

      // Export data
      .addCase(exportData.fulfilled, (state, action) => {
        // Handle export data (e.g., download file)
      });
  },
});

export const { setDateRange, clearAnalytics, clearCurrentReport } = analyticsSlice.actions;
export default analyticsSlice.reducer;