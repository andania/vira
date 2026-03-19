/**
 * Database Configuration
 * Prisma and connection pool settings
 */

import { config } from './index';

export const databaseConfig = {
  // Connection settings
  url: config.databaseUrl,
  pool: {
    min: config.databasePoolMin,
    max: config.databasePoolMax,
    idleTimeoutMillis: config.databaseIdleTimeout,
    connectionTimeoutMillis: config.databaseConnectionTimeout,
  },

  // Query settings
  query: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Logging
  logging: {
    enabled: config.nodeEnv === 'development',
    level: config.nodeEnv === 'development' ? 'all' : 'error',
    slowQueryThreshold: 1000, // Log queries slower than 1 second
  },

  // Migrations
  migrations: {
    runOnStartup: config.nodeEnv !== 'production',
    tableName: '_migrations',
    directory: './prisma/migrations',
  },

  // Extensions
  extensions: {
    pgcrypto: true,
    vector: true,
    uuid: true,
  },

  // Replication (for production)
  replication: config.nodeEnv === 'production' ? {
    readReplicas: [
      // Add read replica URLs here
    ],
    writeUrl: config.databaseUrl,
  } : undefined,

  // SSL settings
  ssl: config.nodeEnv === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA,
    cert: process.env.DB_SSL_CERT,
    key: process.env.DB_SSL_KEY,
  } : false,
};

export default databaseConfig;