/**
 * Admin Slice
 * Manages admin panel state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/api/admin.api';

interface SystemHealth {
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

interface PlatformStats {
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

interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  createdAt: string;
}

interface SystemConfig {
  key: string;
  value: any;
  type: string;
  description: string;
}

interface ModerationItem {
  id: string;
  type: string;
  content: any;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

interface FraudAlert {
  id: string;
  userId: string;
  username: string;
  alertType: string;
  score: number;
  details: any;
  status: string;
  createdAt: string;
}

interface AdminState {
  systemHealth: SystemHealth | null;
  platformStats: PlatformStats | null;
  auditLogs: AuditLog[];
  systemConfig: SystemConfig[];
  moderationQueue: ModerationItem[];
  fraudAlerts: FraudAlert[];
  users: any[];
  sponsors: any[];
  isLoading: boolean;
  error: string | null;
  auditLogPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  moderationPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  fraudPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: AdminState = {
  systemHealth: null,
  platformStats: null,
  auditLogs: [],
  systemConfig: [],
  moderationQueue: [],
  fraudAlerts: [],
  users: [],
  sponsors: [],
  isLoading: false,
  error: null,
  auditLogPagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false,
  },
  moderationPagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false,
  },
  fraudPagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false,
  },
};

// Async thunks
export const getSystemHealth = createAsyncThunk(
  'admin/getSystemHealth',
  async () => {
    const response = await adminApi.getSystemHealth();
    return response.data;
  }
);

export const getPlatformStats = createAsyncThunk(
  'admin/getPlatformStats',
  async () => {
    const response = await adminApi.getPlatformStats();
    return response.data;
  }
);

export const getDashboardSummary = createAsyncThunk(
  'admin/getDashboardSummary',
  async () => {
    const response = await adminApi.getDashboardSummary();
    return response.data;
  }
);

export const getAuditLogs = createAsyncThunk(
  'admin/getAuditLogs',
  async ({ page = 1, limit = 50, userId, action, resourceType, startDate, endDate }: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await adminApi.getAuditLogs(page, limit, userId, action, resourceType, startDate, endDate);
    return response.data;
  }
);

export const getSystemConfig = createAsyncThunk(
  'admin/getSystemConfig',
  async () => {
    const response = await adminApi.getSystemConfig();
    return response.data;
  }
);

export const updateSystemConfig = createAsyncThunk(
  'admin/updateSystemConfig',
  async (settings: Record<string, any>) => {
    const response = await adminApi.updateSystemConfig(settings);
    return response.data;
  }
);

export const getJobsStatus = createAsyncThunk(
  'admin/getJobsStatus',
  async () => {
    const response = await adminApi.getJobsStatus();
    return response.data;
  }
);

export const clearCache = createAsyncThunk(
  'admin/clearCache',
  async (type?: string) => {
    await adminApi.clearCache(type);
    return type;
  }
);

export const runMaintenance = createAsyncThunk(
  'admin/runMaintenance',
  async (task: string) => {
    const response = await adminApi.runMaintenance(task);
    return response.data;
  }
);

export const getUsers = createAsyncThunk(
  'admin/getUsers',
  async ({ page = 1, limit = 50, status, accountType, search }: {
    page?: number;
    limit?: number;
    status?: string;
    accountType?: string;
    search?: string;
  }) => {
    const response = await adminApi.getUsers(page, limit, status, accountType, search);
    return response.data;
  }
);

export const updateUserStatus = createAsyncThunk(
  'admin/updateUserStatus',
  async ({ userId, status, reason }: { userId: string; status: string; reason?: string }) => {
    const response = await adminApi.updateUserStatus(userId, status, reason);
    return response.data;
  }
);

export const getSponsors = createAsyncThunk(
  'admin/getSponsors',
  async ({ page = 1, limit = 50, verificationStatus }: {
    page?: number;
    limit?: number;
    verificationStatus?: string;
  }) => {
    const response = await adminApi.getSponsors(page, limit, verificationStatus);
    return response.data;
  }
);

export const verifySponsor = createAsyncThunk(
  'admin/verifySponsor',
  async ({ sponsorId, approved, notes }: { sponsorId: string; approved: boolean; notes?: string }) => {
    const response = await adminApi.verifySponsor(sponsorId, approved, notes);
    return response.data;
  }
);

export const getModerationQueue = createAsyncThunk(
  'admin/getModerationQueue',
  async ({ page = 1, limit = 50, type, status }: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) => {
    const response = await adminApi.getModerationQueue(page, limit, type, status);
    return response.data;
  }
);

export const resolveReport = createAsyncThunk(
  'admin/resolveReport',
  async ({ reportId, resolution, action }: { reportId: string; resolution: string; action?: string }) => {
    const response = await adminApi.resolveReport(reportId, resolution, action);
    return { reportId, ...response.data };
  }
);

export const getFraudAlerts = createAsyncThunk(
  'admin/getFraudAlerts',
  async ({ page = 1, limit = 50, status, userId }: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) => {
    const response = await adminApi.getFraudAlerts(page, limit, status, userId);
    return response.data;
  }
);

export const updateFraudAlertStatus = createAsyncThunk(
  'admin/updateFraudAlertStatus',
  async ({ alertId, status, notes }: { alertId: string; status: string; notes?: string }) => {
    const response = await adminApi.updateFraudAlertStatus(alertId, status, notes);
    return { alertId, ...response.data };
  }
);

export const addToBlacklist = createAsyncThunk(
  'admin/addToBlacklist',
  async ({ type, value, reason }: { type: string; value: string; reason: string }) => {
    await adminApi.addToBlacklist(type, value, reason);
    return { type, value };
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminData: (state) => {
      state.systemHealth = null;
      state.platformStats = null;
      state.auditLogs = [];
      state.moderationQueue = [];
      state.fraudAlerts = [];
    },
    resetAdminPagination: (state) => {
      state.auditLogPagination = initialState.auditLogPagination;
      state.moderationPagination = initialState.moderationPagination;
      state.fraudPagination = initialState.fraudPagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get system health
      .addCase(getSystemHealth.fulfilled, (state, action) => {
        state.systemHealth = action.payload;
      })

      // Get platform stats
      .addCase(getPlatformStats.fulfilled, (state, action) => {
        state.platformStats = action.payload;
      })

      // Get dashboard summary
      .addCase(getDashboardSummary.fulfilled, (state, action) => {
        state.systemHealth = action.payload.health;
        state.platformStats = action.payload.stats;
      })

      // Get audit logs
      .addCase(getAuditLogs.fulfilled, (state, action) => {
        if (action.payload.page === 1) {
          state.auditLogs = action.payload.logs;
        } else {
          state.auditLogs = [...state.auditLogs, ...action.payload.logs];
        }
        state.auditLogPagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Get system config
      .addCase(getSystemConfig.fulfilled, (state, action) => {
        state.systemConfig = Object.entries(action.payload).map(([key, value]: [string, any]) => ({
          key,
          value: value.value,
          type: value.type,
          description: value.description,
        }));
      })

      // Update system config
      .addCase(updateSystemConfig.fulfilled, (state, action) => {
        // Update the config in state
        Object.entries(action.payload).forEach(([key, value]) => {
          const configItem = state.systemConfig.find(c => c.key === key);
          if (configItem) {
            configItem.value = value;
          }
        });
      })

      // Get jobs status
      .addCase(getJobsStatus.fulfilled, (state, action) => {
        // Handle jobs status
      })

      // Get users
      .addCase(getUsers.fulfilled, (state, action) => {
        state.users = action.payload.users;
      })

      // Update user status
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })

      // Get sponsors
      .addCase(getSponsors.fulfilled, (state, action) => {
        state.sponsors = action.payload.sponsors;
      })

      // Verify sponsor
      .addCase(verifySponsor.fulfilled, (state, action) => {
        const index = state.sponsors.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sponsors[index] = action.payload;
        }
      })

      // Get moderation queue
      .addCase(getModerationQueue.fulfilled, (state, action) => {
        if (action.payload.page === 1) {
          state.moderationQueue = action.payload.reports;
        } else {
          state.moderationQueue = [...state.moderationQueue, ...action.payload.reports];
        }
        state.moderationPagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Resolve report
      .addCase(resolveReport.fulfilled, (state, action) => {
        const index = state.moderationQueue.findIndex(r => r.id === action.payload.reportId);
        if (index !== -1) {
          state.moderationQueue.splice(index, 1);
        }
      })

      // Get fraud alerts
      .addCase(getFraudAlerts.fulfilled, (state, action) => {
        if (action.payload.page === 1) {
          state.fraudAlerts = action.payload.alerts;
        } else {
          state.fraudAlerts = [...state.fraudAlerts, ...action.payload.alerts];
        }
        state.fraudPagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Update fraud alert status
      .addCase(updateFraudAlertStatus.fulfilled, (state, action) => {
        const index = state.fraudAlerts.findIndex(f => f.id === action.payload.alertId);
        if (index !== -1) {
          state.fraudAlerts[index].status = action.payload.status;
        }
      });
  },
});

export const { clearAdminData, resetAdminPagination } = adminSlice.actions;
export default adminSlice.reducer;