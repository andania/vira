/**
 * Frontend Configuration
 */

const config = {
  // API configuration
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
  apiVersion: 'v1',

  // App configuration
  appName: 'VIRAZ',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  // Feature flags
  features: {
    enableLiveStreaming: process.env.REACT_APP_ENABLE_LIVE_STREAMING === 'true',
    enableMarketplace: process.env.REACT_APP_ENABLE_MARKETPLACE === 'true',
    enableGamification: process.env.REACT_APP_ENABLE_GAMIFICATION === 'true',
    enableAI: process.env.REACT_APP_ENABLE_AI === 'true',
    enablePushNotifications: process.env.REACT_APP_ENABLE_PUSH === 'true',
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // File upload limits
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm'],
      document: ['application/pdf'],
    },
  },

  // CAP display settings
  cap: {
    symbol: 'CAP',
    decimals: 0,
    format: 'compact', // 'compact' or 'full'
  },

  // Currency settings
  currency: {
    default: 'USD',
    symbol: '$',
    position: 'prefix', // 'prefix' or 'suffix'
    decimals: 2,
  },

  // Date/time formats
  dateFormat: {
    full: 'MMMM D, YYYY h:mm A',
    short: 'MMM D, YYYY',
    time: 'h:mm A',
    relative: true,
  },

  // Theme
  theme: {
    default: 'light',
    storageKey: 'viraz-theme',
    colors: {
      primary: '#6366f1',
      secondary: '#10b981',
      accent: '#f59e0b',
      danger: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
  },

  // Local storage keys
  storage: {
    token: 'viraz_token',
    refreshToken: 'viraz_refresh_token',
    user: 'viraz_user',
    theme: 'viraz_theme',
    cart: 'viraz_cart',
  },

  // WebSocket events
  socketEvents: {
    connect: 'connect',
    disconnect: 'disconnect',
    error: 'error',
    roomJoin: 'room:join',
    roomLeave: 'room:leave',
    roomMessage: 'room:message',
    notification: 'notification:new',
    walletUpdate: 'wallet:update',
    engagement: 'engagement:new',
  },

  // Animation durations (ms)
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Toast notifications
  toast: {
    duration: 5000,
    position: 'top-right',
  },
};

// Validate required config
const validateConfig = () => {
  if (!config.apiUrl) {
    throw new Error('API URL is required');
  }
  if (!config.socketUrl) {
    throw new Error('Socket URL is required');
  }
};

validateConfig();

export default config;