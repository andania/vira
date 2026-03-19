/**
 * Configuration Type Definitions
 */

export interface ServerConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  port: number;
  apiVersion: string;
  apiPrefix: string;
  apiUrl: string;
  frontendUrl: string;
  corsOrigin: string[];
}

export interface DatabaseConfig {
  url: string;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  ssl: boolean | { rejectUnauthorized: boolean; ca?: string; cert?: string; key?: string };
  logging: {
    enabled: boolean;
    level: string;
    slowQueryThreshold: number;
  };
  migrations: {
    runOnStartup: boolean;
    tableName: string;
    directory: string;
  };
  extensions: string[];
  readReplicas: string[];
  retry: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    factor: number;
  };
}

export interface RedisConfig {
  url: string;
  password?: string;
  db: number;
  keyPrefix: string;
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  retryStrategy: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    factor: number;
  };
  tls: boolean | { rejectUnauthorized: boolean };
  cache: {
    defaultTTL: number;
    userTTL: number;
    sessionTTL: number;
    campaignTTL: number;
    roomTTL: number;
    feedTTL: number;
    leaderboardTTL: number;
  };
  session: {
    prefix: string;
    ttl: number;
    rolling: boolean;
    touchAfter: number;
  };
  rateLimit: {
    prefix: string;
    windowMs: number;
    maxRequests: number;
  };
  queue: {
    prefix: string;
    defaultJobOptions: {
      attempts: number;
      backoff: {
        type: string;
        delay: number;
      };
      removeOnComplete: number;
      removeOnFail: number;
    };
  };
  pubsub: {
    prefix: string;
    channels: Record<string, string>;
  };
}

export interface AuthConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
    issuer: string;
    audience: string;
    algorithm: string;
  };
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    bcryptRounds: number;
  };
  session: {
    maxActiveSessions: number;
    extendOnActivity: boolean;
    inactivityTimeout: number;
    absoluteTimeout: number;
  };
  twoFactor: {
    enabled: boolean;
    methods: string[];
    issuer: string;
    codeLength: number;
    codeExpiry: number;
    backupCodesCount: number;
  };
  oauth: {
    google?: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    facebook?: {
      appId: string;
      appSecret: string;
      callbackUrl: string;
    };
    apple?: {
      clientId: string;
      teamId: string;
      keyId: string;
      privateKey: string;
      callbackUrl: string;
    };
  };
  rateLimits: {
    login: { windowMs: number; max: number };
    register: { windowMs: number; max: number };
    verifyEmail: { windowMs: number; max: number };
    verifyPhone: { windowMs: number; max: number };
    passwordReset: { windowMs: number; max: number };
  };
  verification: {
    email: {
      enabled: boolean;
      tokenExpiry: number;
      codeLength: number;
    };
    phone: {
      enabled: boolean;
      tokenExpiry: number;
      codeLength: number;
      maxAttempts: number;
    };
  };
  security: {
    maxLoginAttempts: number;
    lockoutTime: number;
    requireEmailVerification: boolean;
    requirePhoneVerification: boolean;
    allowMultipleSessions: boolean;
    enforcePasswordHistory: number;
    passwordExpiryDays: number;
  };
}

export interface PaymentConfig {
  defaultCurrency: string;
  supportedCurrencies: string[];
  providers: {
    stripe?: {
      enabled: boolean;
      secretKey: string;
      webhookSecret: string;
      apiVersion: string;
      supportedMethods: string[];
      fees: Record<string, number>;
    };
    paypal?: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      mode: string;
      webhookId?: string;
      supportedMethods: string[];
      fees: Record<string, number>;
    };
    flutterwave?: {
      enabled: boolean;
      secretKey: string;
      publicKey?: string;
      encryptionKey?: string;
      supportedMethods: string[];
      fees: Record<string, number>;
    };
    paystack?: {
      enabled: boolean;
      secretKey: string;
      publicKey?: string;
      supportedMethods: string[];
      fees: Record<string, number>;
    };
  };
  capConversion: {
    rate: number;
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
    fees: {
      deposit: number;
      withdrawal: number;
      conversion: number;
    };
  };
  payouts: {
    methods: string[];
    schedule: string;
    minimumAmount: number;
    maximumAmount: number;
    processingTime: string;
    currencies: string[];
  };
  webhooks: Record<string, { path: string; events: string[] }>;
  security: {
    encryptCredentials: boolean;
    validateIps: boolean;
    allowedIps: string[];
    webhookSecrets: Record<string, string>;
  };
}