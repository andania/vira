/**
 * VIRAZ Backend - Main Entry Point
 * Exports the Express app and server instance
 */

export { app } from './app';
export { server, io } from './server';
export { prisma } from './core/database/client';
export { redis } from './core/cache/redis.client';
export { queue } from './core/queue/bull.queue';

// Export types
export * from './types';