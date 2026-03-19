/**
 * Database Client (Prisma)
 * Singleton pattern for Prisma client with connection management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';
import { config } from '../../config';

// Prisma client instance
let prisma: PrismaClient;

// Connection options
const connectionOptions = {
  log: config.nodeEnv === 'development' 
    ? ['query', 'info', 'warn', 'error'] as const
    : ['error'] as const,
  errorFormat: 'pretty' as const,
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  // Connection pool settings
  pool: {
    min: config.databasePoolMin,
    max: config.databasePoolMax,
    idleTimeoutMillis: config.databaseIdleTimeout,
    connectionTimeoutMillis: config.databaseConnectionTimeout,
  },
};

// Initialize Prisma client
if (config.nodeEnv === 'production') {
  prisma = new PrismaClient(connectionOptions);
} else {
  // In development, use global to prevent multiple instances during hot reload
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient(connectionOptions);
  }
  prisma = (global as any).prisma;
}

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection test successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected successfully');
  } catch (error) {
    logger.error('❌ Error disconnecting database:', error);
  }
};

// Middleware for query logging and monitoring
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  logger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`);
  
  return result;
});

// Middleware for soft deletes
prisma.$use(async (params, next) => {
  // Check if this is a find operation that should exclude deleted items
  if (params.model && ['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
    // Add deletedAt null check if not explicitly asked for deleted
    if (!params.args?.where?.deletedAt) {
      params.args = {
        ...params.args,
        where: {
          ...params.args?.where,
          deletedAt: null,
        },
      };
    }
  }
  
  // Handle delete operations as soft deletes
  if (params.action === 'delete') {
    params.action = 'update';
    params.args = {
      ...params.args,
      data: {
        deletedAt: new Date(),
      },
    };
  }
  
  // Handle deleteMany as soft deletes
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    params.args = {
      ...params.args,
      data: {
        deletedAt: new Date(),
      },
    };
  }
  
  return next(params);
});

// Middleware for audit logging
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  // Log sensitive operations
  if (['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(params.action)) {
    logger.info(`Audit: ${params.model}.${params.action}`, {
      model: params.model,
      action: params.action,
      args: params.args,
      timestamp: new Date().toISOString(),
    });
  }
  
  return result;
});

export { prisma };
export default prisma;