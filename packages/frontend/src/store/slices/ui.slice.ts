/**
 * UI Slice
 * Manages UI state (theme, modals, toasts, sidebar, loading states)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ModalState {
  [key: string]: {
    isOpen: boolean;
    data?: any;
  };
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Layout
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  
  // Modals
  modals: ModalState;
  
  // Toasts
  toasts: Toast[];
  
  // Loading states
  isLoading: boolean;
  loadingCount: number;
  globalLoading: boolean;
  
  // Page transitions
  pageTransition: boolean;
  
  // Notifications
  lastNotification: number;
  
  // Viewport dimensions
  dimensions: {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
  };
  
  // Scroll position
  scrollPositions: Record<string, number>;
  
  // Search
  searchOpen: boolean;
  searchQuery: string;
  
  // Filters
  activeFilters: Record<string, any>;
  
  // Cookies consent
  cookiesConsent: boolean | null;
  
  // Announcements
  lastAnnouncementId: string | null;
  
  // Feature flags
  featureFlags: Record<string, boolean>;
  
  // Performance
  reducedMotion: boolean;
  highContrast: boolean;
}

const initialState: UIState = {
  theme: (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system',
  
  sidebarOpen: true,
  mobileMenuOpen: false,
  
  modals: {},
  toasts: [],
  
  isLoading: false,
  loadingCount: 0,
  globalLoading: false,
  
  pageTransition: false,
  
  lastNotification: Date.now(),
  
  dimensions: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: false,
  },
  
  scrollPositions: {},
  
  searchOpen: false,
  searchQuery: '',
  
  activeFilters: {},
  
  cookiesConsent: localStorage.getItem('cookiesConsent') === 'true' ? true : 
                  localStorage.getItem('cookiesConsent') === 'false' ? false : null,
  
  lastAnnouncementId: localStorage.getItem('lastAnnouncementId'),
  
  featureFlags: {},
  
  reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
  highContrast: window.matchMedia?.('(prefers-contrast: high)').matches || false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      
      // Apply theme to document
      if (action.payload === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
      } else {
        document.documentElement.setAttribute('data-theme', action.payload);
      }
    },
    
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    },

    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Mobile menu
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },

    // Modals
    openModal: (state, action: PayloadAction<{ modalId: string; data?: any }>) => {
      const { modalId, data } = action.payload;
      state.modals[modalId] = { isOpen: true, data };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      const modalId = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId].isOpen = false;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key].isOpen = false;
      });
    },
    updateModalData: (state, action: PayloadAction<{ modalId: string; data: any }>) => {
      const { modalId, data } = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId].data = { ...state.modals[modalId].data, ...data };
      }
    },

    // Toasts
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      state.toasts.push({ 
        id, 
        position: 'top-right',
        duration: 5000,
        ...action.payload 
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },

    // Loading states
    startLoading: (state) => {
      state.loadingCount += 1;
      state.isLoading = true;
    },
    stopLoading: (state) => {
      state.loadingCount = Math.max(0, state.loadingCount - 1);
      state.isLoading = state.loadingCount > 0;
    },
    resetLoading: (state) => {
      state.loadingCount = 0;
      state.isLoading = false;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },

    // Page transition
    setPageTransition: (state, action: PayloadAction<boolean>) => {
      state.pageTransition = action.payload;
    },

    // Notifications
    updateLastNotification: (state) => {
      state.lastNotification = Date.now();
    },

    // Viewport dimensions
    setDimensions: (state, action: PayloadAction<{ width: number; height: number }>) => {
      const { width, height } = action.payload;
      state.dimensions = {
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLandscape: width > height,
      };
    },

    // Scroll positions
    setScrollPosition: (state, action: PayloadAction<{ key: string; position: number }>) => {
      const { key, position } = action.payload;
      state.scrollPositions[key] = position;
    },
    clearScrollPosition: (state, action: PayloadAction<string>) => {
      delete state.scrollPositions[action.payload];
    },
    clearAllScrollPositions: (state) => {
      state.scrollPositions = {};
    },

    // Search
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSearch: (state) => {
      state.searchQuery = '';
      state.searchOpen = false;
    },

    // Filters
    setActiveFilter: (state, action: PayloadAction<{ key: string; value: any }>) => {
      const { key, value } = action.payload;
      state.activeFilters[key] = value;
    },
    removeActiveFilter: (state, action: PayloadAction<string>) => {
      delete state.activeFilters[action.payload];
    },
    clearActiveFilters: (state) => {
      state.activeFilters = {};
    },

    // Cookies consent
    setCookiesConsent: (state, action: PayloadAction<boolean>) => {
      state.cookiesConsent = action.payload;
      localStorage.setItem('cookiesConsent', String(action.payload));
    },

    // Announcements
    setLastAnnouncementId: (state, action: PayloadAction<string>) => {
      state.lastAnnouncementId = action.payload;
      localStorage.setItem('lastAnnouncementId', action.payload);
    },

    // Feature flags
    setFeatureFlag: (state, action: PayloadAction<{ flag: string; enabled: boolean }>) => {
      const { flag, enabled } = action.payload;
      state.featureFlags[flag] = enabled;
    },
    setFeatureFlags: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.featureFlags = { ...state.featureFlags, ...action.payload };
    },

    // Accessibility
    setReducedMotion: (state, action: PayloadAction<boolean>) => {
      state.reducedMotion = action.payload;
    },
    setHighContrast: (state, action: PayloadAction<boolean>) => {
      state.highContrast = action.payload;
    },

    // Reset UI state
    resetUI: (state) => {
      // Preserve theme and cookies consent
      const theme = state.theme;
      const cookiesConsent = state.cookiesConsent;
      const reducedMotion = state.reducedMotion;
      const highContrast = state.highContrast;
      
      Object.assign(state, initialState);
      
      // Restore preserved values
      state.theme = theme;
      state.cookiesConsent = cookiesConsent;
      state.reducedMotion = reducedMotion;
      state.highContrast = highContrast;
    },
  },
});

// Convenience action creators for common toast types
export const showSuccessToast = (message: string, title?: string) => 
  addToast({ type: 'success', message, title });

export const showErrorToast = (message: string, title?: string) => 
  addToast({ type: 'error', message, title });

export const showInfoToast = (message: string, title?: string) => 
  addToast({ type: 'info', message, title });

export const showWarningToast = (message: string, title?: string) => 
  addToast({ type: 'warning', message, title });

export const {
  // Theme
  setTheme,
  toggleTheme,
  
  // Sidebar
  toggleSidebar,
  setSidebarOpen,
  
  // Mobile menu
  toggleMobileMenu,
  setMobileMenuOpen,
  
  // Modals
  openModal,
  closeModal,
  closeAllModals,
  updateModalData,
  
  // Toasts
  addToast,
  removeToast,
  clearToasts,
  
  // Loading states
  startLoading,
  stopLoading,
  resetLoading,
  setGlobalLoading,
  
  // Page transition
  setPageTransition,
  
  // Notifications
  updateLastNotification,
  
  // Viewport dimensions
  setDimensions,
  
  // Scroll positions
  setScrollPosition,
  clearScrollPosition,
  clearAllScrollPositions,
  
  // Search
  setSearchOpen,
  toggleSearch,
  setSearchQuery,
  clearSearch,
  
  // Filters
  setActiveFilter,
  removeActiveFilter,
  clearActiveFilters,
  
  // Cookies consent
  setCookiesConsent,
  
  // Announcements
  setLastAnnouncementId,
  
  // Feature flags
  setFeatureFlag,
  setFeatureFlags,
  
  // Accessibility
  setReducedMotion,
  setHighContrast,
  
  // Reset
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;