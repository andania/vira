/**
 * Backend Configuration
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment type
export type NodeEnv = 'development' | 'staging' | 'production' | 'test';

// Configuration interface
interface Config {
  // Server
  nodeEnv: NodeEnv;
  port: number;
  apiVersion: string;
  apiPrefix: string;
  corsOrigin: string[];

  // Database
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;
  databaseIdleTimeout: number;
  databaseConnectionTimeout: number;

  // Redis
  redisUrl: string;
  redisPassword?: string;
  redisDb: number;
  redisKeyPrefix: string;

  // JWT
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  jwtIssuer: string;
  jwtAudience: string;

  // Email
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpFromName: string;

  // SMS
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;

  // Push notifications
  firebaseProjectId?: string;
  firebasePrivateKey?: string;
  firebaseClientEmail?: string;

  // Payment gateways
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalMode?: 'sandbox' | 'live';
  flutterwaveSecretKey?: string;
  paystackSecretKey?: string;

  // File storage
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsS3Bucket?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;

  // Monitoring
  sentryDsn?: string;
  newRelicLicenseKey?: string;

  // Rate limiting
  rateLimit: {
    windowMs: number;
    public: number;
    authenticated: number;
    sponsor: number;
    admin: number;
  };

  // Security
  bcryptRounds: number;
  sessionSecret: string;
  encryptionKey: string;
  maxLoginAttempts: number;
  loginLockoutTime: number;

  // Feature flags
  features: {
    enable2FA: boolean;
    enableEmailVerification: boolean;
    enablePhoneVerification: boolean;
    enablePushNotifications: boolean;
    enableLiveStreaming: boolean;
    enableAiRecommendations: boolean;
    enableMarketplace: boolean;
    enableGamification: boolean;
  };

  // Background jobs
  jobs: {
    capDecaySchedule: string;
    leaderboardSchedule: string;
    analyticsSchedule: string;
    notificationSchedule: string;
  };

  // Third-party OAuth
  googleClientId?: string;
  googleClientSecret?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
  appleClientId?: string;
  appleTeamId?: string;
  appleKeyId?: string;
  applePrivateKey?: string;
}

// Helper to parse boolean from string
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper to parse number from string
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper to parse array from string
const parseArray = (value: string | undefined, defaultValue: string[]): string[] => {
  if (value === undefined) return defaultValue;
  return value.split(',').map(item => item.trim());
};

// Configuration object
export const config: Config = {
  // Server
  nodeEnv: (process.env.NODE_ENV as NodeEnv) || 'development',
  port: parseNumber(process.env.PORT, 3000),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: parseArray(process.env.CORS_ORIGIN, ['http://localhost:3000', 'http://localhost:3001']),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/viraz',
  databasePoolMin: parseNumber(process.env.DATABASE_POOL_MIN, 2),
  databasePoolMax: parseNumber(process.env.DATABASE_POOL_MAX, 20),
  databaseIdleTimeout: parseNumber(process.env.DATABASE_IDLE_TIMEOUT, 10000),
  databaseConnectionTimeout: parseNumber(process.env.DATABASE_CONNECTION_TIMEOUT, 30000),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: parseNumber(process.env.REDIS_DB, 0),
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX || 'viraz:',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'viraz-platform',
  jwtAudience: process.env.JWT_AUDIENCE || 'viraz-users',

  // Email
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseNumber(process.env.SMTP_PORT, 587),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@viraz.com',
  smtpFromName: process.env.SMTP_FROM_NAME || 'Viraz Platform',

  // SMS
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

  // Push notifications
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,

  // Payment gateways
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  paypalMode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,

  // File storage
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // Monitoring
  sentryDsn: process.env.SENTRY_DSN,
  newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,

  // Rate limiting
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    public: parseNumber(process.env.RATE_LIMIT_MAX_PUBLIC, 10),
    authenticated: parseNumber(process.env.RATE_LIMIT_MAX_AUTH, 100),
    sponsor: parseNumber(process.env.RATE_LIMIT_MAX_SPONSOR, 500),
    admin: parseNumber(process.env.RATE_LIMIT_MAX_ADMIN, 1000),
  },

  // Security
  bcryptRounds: parseNumber(process.env.BCRYPT_ROUNDS, 10),
  sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!',
  maxLoginAttempts: parseNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
  loginLockoutTime: parseNumber(process.env.LOGIN_LOCKOUT_TIME, 900000),

  // Feature flags
  features: {
    enable2FA: parseBoolean(process.env.ENABLE_2FA, true),
    enableEmailVerification: parseBoolean(process.env.ENABLE_EMAIL_VERIFICATION, true),
    enablePhoneVerification: parseBoolean(process.env.ENABLE_PHONE_VERIFICATION, true),
    enablePushNotifications: parseBoolean(process.env.ENABLE_PUSH_NOTIFICATIONS, true),
    enableLiveStreaming: parseBoolean(process.env.ENABLE_LIVE_STREAMING, true),
    enableAiRecommendations: parseBoolean(process.env.ENABLE_AI_RECOMMENDATIONS, true),
    enableMarketplace: parseBoolean(process.env.ENABLE_MARKETPLACE, true),
    enableGamification: parseBoolean(process.env.ENABLE_GAMIFICATION, true),
  },

  // Background jobs
  jobs: {
    capDecaySchedule: process.env.CAP_DECAY_JOB_SCHEDULE || '0 0 * * *',
    leaderboardSchedule: process.env.LEADERBOARD_JOB_SCHEDULE || '0 * * * *',
    analyticsSchedule: process.env.ANALYTICS_JOB_SCHEDULE || '0 0 * * *',
    notificationSchedule: process.env.NOTIFICATION_JOB_SCHEDULE || '* * * * *',
  },

  // Third-party OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  facebookAppId: process.env.FACEBOOK_APP_ID,
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  appleClientId: process.env.APPLE_CLIENT_ID,
  appleTeamId: process.env.APPLE_TEAM_ID,
  appleKeyId: process.env.APPLE_KEY_ID,
  applePrivateKey: process.env.APPLE_PRIVATE_KEY,
};

// Validate required configuration
export const validateConfig = (): void => {
  const requiredVars: (keyof Config)[] = [
    'jwtSecret',
    'jwtRefreshSecret',
    'sessionSecret',
    'encryptionKey',
  ];

  const missing = requiredVars.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Additional validation for production
  if (config.nodeEnv === 'production') {
    if (config.jwtSecret === 'default-secret-change-in-production') {
      throw new Error('JWT_SECRET must be changed in production');
    }
    if (config.encryptionKey === 'default-encryption-key-32-chars!!') {
      throw new Error('ENCRYPTION_KEY must be changed in production');
    }
  }
};

export default config;