/**
 * Campaign API Service
 */

import { ApiClient } from './client';

export interface Campaign {
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
}

export interface Ad {
  id: string;
  name: string;
  type: string;
  content: any;
  status: string;
  campaignId: string;
  createdAt: string;
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

export interface AdAsset {
  id: string;
  url: string;
  type: string;
  adId: string;
}

export interface TargetingCriteria {
  locations?: Array<{
    type: string;
    country?: string;
    city?: string;
    radius?: number;
  }>;
  demographic?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    income?: string[];
  };
  interests?: string[];
  devices?: string[];
  schedule?: {
    days?: number[];
    hours?: string[];
    timezone?: string;
  };
}

export interface AudienceEstimate {
  size: number;
  demographics: Record<string, number>;
  locations: Record<string, number>;
}

export const campaignApi = {
  /**
   * Get campaigns
   */
  getCampaigns: (brandId?: string, page: number = 1, limit: number = 20, status?: string) =>
    ApiClient.get<PaginatedResponse<Campaign>>('/api/v1/campaigns', {
      params: { brandId, page, limit, status },
    }),

  /**
   * Get campaign by ID
   */
  getCampaignById: (campaignId: string) =>
    ApiClient.get<Campaign>(`/api/v1/campaigns/${campaignId}`),

  /**
   * Create campaign
   */
  createCampaign: (data: Partial<Campaign>) =>
    ApiClient.post<Campaign>('/api/v1/campaigns', data),

  /**
   * Update campaign
   */
  updateCampaign: (campaignId: string, data: Partial<Campaign>) =>
    ApiClient.put<Campaign>(`/api/v1/campaigns/${campaignId}`, data),

  /**
   * Delete campaign
   */
  deleteCampaign: (campaignId: string) =>
    ApiClient.delete(`/api/v1/campaigns/${campaignId}`),

  /**
   * Launch campaign
   */
  launchCampaign: (campaignId: string) =>
    ApiClient.post<Campaign>(`/api/v1/campaigns/${campaignId}/launch`, {}),

  /**
   * Pause campaign
   */
  pauseCampaign: (campaignId: string) =>
    ApiClient.post<Campaign>(`/api/v1/campaigns/${campaignId}/pause`, {}),

  /**
   * End campaign
   */
  endCampaign: (campaignId: string) =>
    ApiClient.post<Campaign>(`/api/v1/campaigns/${campaignId}/end`, {}),

  /**
   * Duplicate campaign
   */
  duplicateCampaign: (campaignId: string, name?: string) =>
    ApiClient.post<Campaign>(`/api/v1/campaigns/${campaignId}/duplicate`, { name }),

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics: (campaignId: string, startDate?: string, endDate?: string) =>
    ApiClient.get<any>(`/api/v1/campaigns/${campaignId}/analytics/metrics`, {
      params: { startDate, endDate },
    }),

  /**
   * Get campaign ROI
   */
  getCampaignROI: (campaignId: string) =>
    ApiClient.get<any>(`/api/v1/campaigns/${campaignId}/analytics/roi`),

  /**
   * Get campaign budget report
   */
  getBudgetReport: (campaignId: string, days: number = 30) =>
    ApiClient.get<any>(`/api/v1/campaigns/${campaignId}/budget/report`, { params: { days } }),

  /**
   * Allocate budget
   */
  allocateBudget: (campaignId: string, amount: number, currency: string = 'USD') =>
    ApiClient.post(`/api/v1/campaigns/${campaignId}/budget/allocate`, { amount, currency }),

  /**
   * Get ads
   */
  getAds: (campaignId: string) =>
    ApiClient.get<Ad[]>(`/api/v1/campaigns/${campaignId}/ads`),

  /**
   * Create ad
   */
  createAd: (data: Partial<Ad>) =>
    ApiClient.post<Ad>('/api/v1/campaigns/ads', data),

  /**
   * Update ad
   */
  updateAd: (adId: string, data: Partial<Ad>) =>
    ApiClient.put<Ad>(`/api/v1/campaigns/ads/${adId}`, data),

  /**
   * Delete ad
   */
  deleteAd: (adId: string) =>
    ApiClient.delete(`/api/v1/campaigns/ads/${adId}`),

  /**
   * Upload ad asset
   */
  uploadAdAsset: (adId: string, file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return ApiClient.post<AdAsset>(`/api/v1/campaigns/ads/${adId}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Delete ad asset
   */
  deleteAdAsset: (assetId: string) =>
    ApiClient.delete(`/api/v1/campaigns/ads/assets/${assetId}`),

  /**
   * Get ad analytics
   */
  getAdAnalytics: (adId: string, startDate: string, endDate: string) =>
    ApiClient.get<any>(`/api/v1/campaigns/ads/${adId}/analytics`, {
      params: { startDate, endDate },
    }),

  /**
   * Estimate audience
   */
  estimateAudience: (criteria: TargetingCriteria) =>
    ApiClient.post<AudienceEstimate>('/api/v1/campaigns/targeting/estimate', { criteria }),

  /**
   * Validate targeting
   */
  validateTargeting: (criteria: TargetingCriteria) =>
    ApiClient.post<{ isValid: boolean; errors: string[] }>('/api/v1/campaigns/targeting/validate', { criteria }),

  /**
   * Get audience segments
   */
  getAudienceSegments: () =>
    ApiClient.get<any[]>('/api/v1/campaigns/targeting/segments'),

  /**
   * Create audience segment
   */
  createAudienceSegment: (name: string, criteria: TargetingCriteria) =>
    ApiClient.post('/api/v1/campaigns/targeting/segments', { name, criteria }),

  /**
   * Update audience segment
   */
  updateAudienceSegment: (segmentId: string, name?: string, criteria?: TargetingCriteria) =>
    ApiClient.put(`/api/v1/campaigns/targeting/segments/${segmentId}`, { name, criteria }),

  /**
   * Delete audience segment
   */
  deleteAudienceSegment: (segmentId: string) =>
    ApiClient.delete(`/api/v1/campaigns/targeting/segments/${segmentId}`),
};

export default campaignApi;