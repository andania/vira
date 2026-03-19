/**
 * VIRAZ Backend - Server Setup
 * Creates and configures the HTTP server with Socket.io
 */

import http from 'http';
import { app } from './app';
import { initializeSocket } from './core/socket/socket.server';
import { logger } from './core/logger';
import { config } from './config';
import { prisma } from './core/database/client';
import { redis } from './core/cache/redis.client';

// Create HTTP server
export const server = http.createServer(app);

// Initialize Socket.io
export const io = initializeSocket(server);

// Server port
const PORT = config.port || 3000;

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected successfully');

    // Start listening
    server.listen(PORT, () => {
      logger.info(`
      =====================================
      🚀 VIRAZ Backend Server Started
      =====================================
      🌐 Environment: ${config.nodeEnv}
      🚪 Port: ${PORT}
      📡 API: http://localhost:${PORT}${config.apiPrefix}/${config.apiVersion}
      🔌 WebSocket: ws://localhost:${PORT}
      =====================================
      `);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`📥 Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    logger.info('✅ HTTP server closed');

    await prisma.$disconnect();
    logger.info('✅ Database disconnected');

    await redis.quit();
    logger.info('✅ Redis disconnected');

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

export default server;