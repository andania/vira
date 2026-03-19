/**
 * Campaign Slice
 * Manages campaigns and ads state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { campaignApi } from '../../services/api/campaign.api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  objective: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  dailyBudget?: number;
  currency: string;
  targeting?: any;
  brandId: string;
  brandName?: string;
  createdAt: string;
  metrics?: {
    impressions: number;
    clicks: number;
    engagements: number;
    ctr: number;
    capSpent: number;
  };
  ads?: Ad[];
}

interface Ad {
  id: string;
  name: string;
  type: string;
  content: any;
  status: string;
  campaignId: string;
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

interface AudienceSegment {
  id: string;
  name: string;
  size: number;
  criteria: any;
}

interface CampaignState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  ads: Ad[];
  currentAd: Ad | null;
  audienceSegments: AudienceSegment[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: CampaignState = {
  campaigns: [],
  currentCampaign: null,
  ads: [],
  currentAd: null,
  audienceSegments: [],
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
export const fetchCampaigns = createAsyncThunk(
  'campaign/fetchCampaigns',
  async ({ brandId, page = 1, limit = 20, status }: { brandId?: string; page?: number; limit?: number; status?: string }) => {
    const response = await campaignApi.getCampaigns(brandId, page, limit, status);
    return response.data;
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaign/fetchCampaignById',
  async (campaignId: string) => {
    const response = await campaignApi.getCampaignById(campaignId);
    return response.data;
  }
);

export const createCampaign = createAsyncThunk(
  'campaign/createCampaign',
  async (campaignData: any) => {
    const response = await campaignApi.createCampaign(campaignData);
    return response.data;
  }
);

export const updateCampaign = createAsyncThunk(
  'campaign/updateCampaign',
  async ({ campaignId, data }: { campaignId: string; data: any }) => {
    const response = await campaignApi.updateCampaign(campaignId, data);
    return response.data;
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaign/deleteCampaign',
  async (campaignId: string) => {
    await campaignApi.deleteCampaign(campaignId);
    return campaignId;
  }
);

export const launchCampaign = createAsyncThunk(
  'campaign/launchCampaign',
  async (campaignId: string) => {
    const response = await campaignApi.launchCampaign(campaignId);
    return response.data;
  }
);

export const pauseCampaign = createAsyncThunk(
  'campaign/pauseCampaign',
  async (campaignId: string) => {
    const response = await campaignApi.pauseCampaign(campaignId);
    return response.data;
  }
);

export const endCampaign = createAsyncThunk(
  'campaign/endCampaign',
  async (campaignId: string) => {
    const response = await campaignApi.endCampaign(campaignId);
    return response.data;
  }
);

export const duplicateCampaign = createAsyncThunk(
  'campaign/duplicateCampaign',
  async ({ campaignId, name }: { campaignId: string; name?: string }) => {
    const response = await campaignApi.duplicateCampaign(campaignId, name);
    return response.data;
  }
);

export const fetchCampaignAnalytics = createAsyncThunk(
  'campaign/fetchCampaignAnalytics',
  async ({ campaignId, startDate, endDate }: { campaignId: string; startDate?: string; endDate?: string }) => {
    const response = await campaignApi.getCampaignAnalytics(campaignId, startDate, endDate);
    return response.data;
  }
);

export const fetchAds = createAsyncThunk(
  'campaign/fetchAds',
  async (campaignId: string) => {
    const response = await campaignApi.getAds(campaignId);
    return response.data;
  }
);

export const createAd = createAsyncThunk(
  'campaign/createAd',
  async (adData: any) => {
    const response = await campaignApi.createAd(adData);
    return response.data;
  }
);

export const updateAd = createAsyncThunk(
  'campaign/updateAd',
  async ({ adId, data }: { adId: string; data: any }) => {
    const response = await campaignApi.updateAd(adId, data);
    return response.data;
  }
);

export const deleteAd = createAsyncThunk(
  'campaign/deleteAd',
  async (adId: string) => {
    await campaignApi.deleteAd(adId);
    return adId;
  }
);

export const fetchAudienceSegments = createAsyncThunk(
  'campaign/fetchAudienceSegments',
  async () => {
    const response = await campaignApi.getAudienceSegments();
    return response.data;
  }
);

export const estimateAudience = createAsyncThunk(
  'campaign/estimateAudience',
  async (criteria: any) => {
    const response = await campaignApi.estimateAudience(criteria);
    return response.data;
  }
);

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    clearCurrentCampaign: (state) => {
      state.currentCampaign = null;
    },
    clearCurrentAd: (state) => {
      state.currentAd = null;
    },
    updateCampaignField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      if (state.currentCampaign) {
        (state.currentCampaign as any)[action.payload.field] = action.payload.value;
      }
    },
    resetCampaignPagination: (state) => {
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch campaigns
      .addCase(fetchCampaigns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.campaigns = action.payload.campaigns;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch campaigns';
      })

      // Fetch campaign by ID
      .addCase(fetchCampaignById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCampaign = action.payload;
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch campaign';
      })

      // Create campaign
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.campaigns.unshift(action.payload);
        state.currentCampaign = action.payload;
      })

      // Update campaign
      .addCase(updateCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })

      // Delete campaign
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.campaigns = state.campaigns.filter(c => c.id !== action.payload);
        if (state.currentCampaign?.id === action.payload) {
          state.currentCampaign = null;
        }
      })

      // Launch campaign
      .addCase(launchCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })

      // Pause campaign
      .addCase(pauseCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })

      // End campaign
      .addCase(endCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })

      // Duplicate campaign
      .addCase(duplicateCampaign.fulfilled, (state, action) => {
        state.campaigns.unshift(action.payload);
      })

      // Fetch campaign analytics
      .addCase(fetchCampaignAnalytics.fulfilled, (state, action) => {
        if (state.currentCampaign) {
          state.currentCampaign.metrics = action.payload;
        }
      })

      // Fetch ads
      .addCase(fetchAds.fulfilled, (state, action) => {
        state.ads = action.payload;
      })

      // Create ad
      .addCase(createAd.fulfilled, (state, action) => {
        state.ads.push(action.payload);
        if (state.currentCampaign && action.payload.campaignId === state.currentCampaign.id) {
          state.currentCampaign.ads = [...(state.currentCampaign.ads || []), action.payload];
        }
      })

      // Update ad
      .addCase(updateAd.fulfilled, (state, action) => {
        const index = state.ads.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.ads[index] = action.payload;
        }
      })

      // Delete ad
      .addCase(deleteAd.fulfilled, (state, action) => {
        state.ads = state.ads.filter(a => a.id !== action.payload);
      })

      // Fetch audience segments
      .addCase(fetchAudienceSegments.fulfilled, (state, action) => {
        state.audienceSegments = action.payload;
      })

      // Estimate audience
      .addCase(estimateAudience.fulfilled, (state, action) => {
        // Handle audience estimation result
      });
  },
});

export const { clearCurrentCampaign, clearCurrentAd, updateCampaignField, resetCampaignPagination } = campaignSlice.actions;
export default campaignSlice.reducer;