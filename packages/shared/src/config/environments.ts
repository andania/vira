/**
 * Environment configuration types and utilities
 */

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  apiUrl: string;
  socketUrl: string;
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  isTest: boolean;
  appName: string;
  appVersion: string;
  supportEmail: string;
  supportPhone: string;
  recaptchaSiteKey?: string;
  googleAnalyticsId?: string;
  sentryDsn?: string;
  hotjarId?: string;
  featureFlags: Record<string, boolean>;
}

// Default configuration
const defaultConfig: Partial<EnvironmentConfig> = {
  appName: 'VIRAZ',
  appVersion: '1.0.0',
  supportEmail: 'support@viraz.com',
  supportPhone: '+1234567890',
  featureFlags: {
    enableLiveStreaming: true,
    enableMarketplace: true,
    enableGamification: true,
    enableAIPersonalization: true,
    enablePushNotifications: true,
    enableTwoFactorAuth: true,
  },
};

// Development environment
const development: EnvironmentConfig = {
  ...defaultConfig as EnvironmentConfig,
  apiUrl: process.env.VITE_API_URL || 'http://localhost:3000/api',
  socketUrl: process.env.VITE_SOCKET_URL || 'http://localhost:3000',
  environment: 'development',
  isProduction: false,
  isDevelopment: true,
  isStaging: false,
  isTest: false,
  featureFlags: {
    ...defaultConfig.featureFlags,
    enableLiveStreaming: true,
    enableMarketplace: true,
    enableGamification: true,
    enableAIPersonalization: true,
    enablePushNotifications: true,
    enableTwoFactorAuth: true,
  },
};

// Staging environment
const staging: EnvironmentConfig = {
  ...defaultConfig as EnvironmentConfig,
  apiUrl: process.env.VITE_API_URL || 'https://staging-api.viraz.com/v1',
  socketUrl: process.env.VITE_SOCKET_URL || 'https://staging-api.viraz.com',
  environment: 'staging',
  isProduction: false,
  isDevelopment: false,
  isStaging: true,
  isTest: false,
  recaptchaSiteKey: process.env.VITE_RECAPTCHA_SITE_KEY,
  sentryDsn: process.env.VITE_SENTRY_DSN,
  featureFlags: {
    ...defaultConfig.featureFlags,
    enableLiveStreaming: true,
    enableMarketplace: true,
    enableGamification: true,
    enableAIPersonalization: true,
    enablePushNotifications: true,
    enableTwoFactorAuth: true,
  },
};

// Production environment
const production: EnvironmentConfig = {
  ...defaultConfig as EnvironmentConfig,
  apiUrl: process.env.VITE_API_URL || 'https://api.viraz.com/v1',
  socketUrl: process.env.VITE_SOCKET_URL || 'https://api.viraz.com',
  environment: 'production',
  isProduction: true,
  isDevelopment: false,
  isStaging: false,
  isTest: false,
  recaptchaSiteKey: process.env.VITE_RECAPTCHA_SITE_KEY,
  googleAnalyticsId: process.env.VITE_GA_ID,
  sentryDsn: process.env.VITE_SENTRY_DSN,
  hotjarId: process.env.VITE_HOTJAR_ID,
  featureFlags: {
    ...defaultConfig.featureFlags,
    enableLiveStreaming: true,
    enableMarketplace: true,
    enableGamification: true,
    enableAIPersonalization: true,
    enablePushNotifications: true,
    enableTwoFactorAuth: true,
  },
};

// Test environment
const test: EnvironmentConfig = {
  ...defaultConfig as EnvironmentConfig,
  apiUrl: 'http://localhost:3001/api',
  socketUrl: 'http://localhost:3001',
  environment: 'test',
  isProduction: false,
  isDevelopment: false,
  isStaging: false,
  isTest: true,
  featureFlags: {
    ...defaultConfig.featureFlags,
    enableLiveStreaming: false,
    enableMarketplace: true,
    enableGamification: true,
    enableAIPersonalization: false,
    enablePushNotifications: false,
    enableTwoFactorAuth: false,
  },
};

// Get current environment
export const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV as Environment;
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  if (env === 'test') return 'test';
  return 'development';
};

// Get environment config
export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return production;
    case 'staging':
      return staging;
    case 'test':
      return test;
    default:
      return development;
  }
};

// Export environment-specific configs
export const configs = {
  development,
  staging,
  production,
  test,
};

// Export current config
export const currentConfig = getConfig();

// Helper to check if feature is enabled
export const isFeatureEnabled = (featureName: keyof EnvironmentConfig['featureFlags']): boolean => {
  return currentConfig.featureFlags[featureName] || false;
};