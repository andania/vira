/**
 * Billboard Slice
 * Manages feed, discovery, and recommendations state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { billboardApi } from '../../services/api/billboard.api';

interface FeedItem {
  id: string;
  type: 'ad' | 'room' | 'campaign' | 'product' | 'brand';
  title: string;
  description?: string;
  image?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  reward?: {
    action: string;
    amount: number;
  };
  metadata: Record<string, any>;
  score: number;
  createdAt: string;
}

interface BillboardSection {
  id: string;
  name: string;
  description: string;
  items: any[];
  layout: 'grid' | 'list' | 'carousel' | 'hero';
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  image?: string;
  url: string;
  metadata: Record<string, any>;
  score: number;
}

interface BillboardState {
  feed: FeedItem[];
  trending: FeedItem[];
  recommended: FeedItem[];
  nearby: FeedItem[];
  sections: BillboardSection[];
  searchResults: SearchResult[];
  searchSuggestions: string[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  feedPagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  searchPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: BillboardState = {
  feed: [],
  trending: [],
  recommended: [],
  nearby: [],
  sections: [],
  searchResults: [],
  searchSuggestions: [],
  categories: [],
  isLoading: false,
  error: null,
  feedPagination: {
    page: 1,
    limit: 20,
    hasMore: false,
  },
  searchPagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

// Async thunks
export const getFeed = createAsyncThunk(
  'billboard/getFeed',
  async ({ page = 1, limit = 20, type, categories, location }: {
    page?: number;
    limit?: number;
    type?: string;
    categories?: string[];
    location?: { lat: number; lng: number; radius?: number };
  }) => {
    const response = await billboardApi.getFeed(page, limit, type, categories, location);
    return response.data;
  }
);

export const getTrending = createAsyncThunk(
  'billboard/getTrending',
  async ({ limit = 20 }: { limit?: number }) => {
    const response = await billboardApi.getTrending(limit);
    return response.data;
  }
);

export const getRecommended = createAsyncThunk(
  'billboard/getRecommended',
  async ({ limit = 20 }: { limit?: number }) => {
    const response = await billboardApi.getRecommended(limit);
    return response.data;
  }
);

export const getNearby = createAsyncThunk(
  'billboard/getNearby',
  async ({ lat, lng, radius, limit = 20 }: { lat: number; lng: number; radius?: number; limit?: number }) => {
    const response = await billboardApi.getNearby(lat, lng, radius, limit);
    return response.data;
  }
);

export const getBillboard = createAsyncThunk(
  'billboard/getBillboard',
  async ({ limit, location }: { limit?: number; location?: { lat: number; lng: number; radius?: number } }) => {
    const response = await billboardApi.getBillboard(limit, location);
    return response.data;
  }
);

export const search = createAsyncThunk(
  'billboard/search',
  async ({ query, type, category, page = 1, limit = 20, sortBy }: {
    query: string;
    type?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => {
    const response = await billboardApi.search(query, type, category, page, limit, sortBy);
    return response.data;
  }
);

export const getSuggestions = createAsyncThunk(
  'billboard/getSuggestions',
  async (query: string) => {
    const response = await billboardApi.getSuggestions(query);
    return response.data;
  }
);

export const getCategories = createAsyncThunk(
  'billboard/getCategories',
  async () => {
    const response = await billboardApi.getCategories();
    return response.data;
  }
);

export const getTrendingSearches = createAsyncThunk(
  'billboard/getTrendingSearches',
  async (limit?: number) => {
    const response = await billboardApi.getTrendingSearches(limit);
    return response.data;
  }
);

export const filter = createAsyncThunk(
  'billboard/filter',
  async (filters: any) => {
    const response = await billboardApi.filter(filters);
    return response.data;
  }
);

export const getContentById = createAsyncThunk(
  'billboard/getContentById',
  async ({ type, id }: { type: string; id: string }) => {
    const response = await billboardApi.getContentById(type, id);
    return response.data;
  }
);

export const trackInteraction = createAsyncThunk(
  'billboard/trackInteraction',
  async ({ itemId, itemType, action }: { itemId: string; itemType: string; action: string }) => {
    await billboardApi.trackInteraction(itemId, itemType, action);
  }
);

const billboardSlice = createSlice({
  name: 'billboard',
  initialState,
  reducers: {
    clearFeed: (state) => {
      state.feed = [];
      state.feedPagination = initialState.feedPagination;
    },
    clearSearch: (state) => {
      state.searchResults = [];
      state.searchPagination = initialState.searchPagination;
    },
    resetBillboard: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Feed
      .addCase(getFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.pagination?.page === 1) {
          state.feed = action.payload.items;
        } else {
          state.feed = [...state.feed, ...action.payload.items];
        }
        state.feedPagination = {
          page: action.payload.pagination?.page || 1,
          limit: action.payload.pagination?.limit || 20,
          hasMore: action.payload.pagination?.hasMore || false,
        };
      })
      .addCase(getFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load feed';
      })

      // Get Trending
      .addCase(getTrending.fulfilled, (state, action) => {
        state.trending = action.payload;
      })

      // Get Recommended
      .addCase(getRecommended.fulfilled, (state, action) => {
        state.recommended = action.payload;
      })

      // Get Nearby
      .addCase(getNearby.fulfilled, (state, action) => {
        state.nearby = action.payload;
      })

      // Get Billboard
      .addCase(getBillboard.fulfilled, (state, action) => {
        state.sections = action.payload.sections;
      })

      // Search
      .addCase(search.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(search.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.meta?.page === 1) {
          state.searchResults = action.payload.results;
        } else {
          state.searchResults = [...state.searchResults, ...action.payload.results];
        }
        state.searchPagination = {
          page: action.payload.meta?.page || 1,
          limit: action.payload.meta?.limit || 20,
          total: action.payload.meta?.total || 0,
          hasMore: action.payload.meta?.hasMore || false,
        };
      })
      .addCase(search.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Search failed';
      })

      // Get Suggestions
      .addCase(getSuggestions.fulfilled, (state, action) => {
        const suggestions = [];
        if (action.payload.brands) {
          suggestions.push(...action.payload.brands.map((b: any) => b.text));
        }
        if (action.payload.campaigns) {
          suggestions.push(...action.payload.campaigns.map((c: any) => c.text));
        }
        if (action.payload.products) {
          suggestions.push(...action.payload.products.map((p: any) => p.text));
        }
        state.searchSuggestions = suggestions.slice(0, 10);
      })

      // Get Categories
      .addCase(getCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })

      // Get Trending Searches
      .addCase(getTrendingSearches.fulfilled, (state, action) => {
        // Could store trending searches
      })

      // Filter
      .addCase(filter.fulfilled, (state, action) => {
        state.searchResults = action.payload.results;
        state.searchPagination = {
          page: action.payload.meta?.page || 1,
          limit: action.payload.meta?.limit || 20,
          total: action.payload.meta?.total || 0,
          hasMore: action.payload.meta?.hasMore || false,
        };
      });
  },
});

export const { clearFeed, clearSearch, resetBillboard } = billboardSlice.actions;
export default billboardSlice.reducer;