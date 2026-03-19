/**
 * API V1 Index
 * Main entry point for API version 1
 * Aggregates and exports all modules
 */

import { Router } from 'express';

// Import all module routers
import { authRouter } from './modules/auth/routes';
import { userRouter } from './modules/users/routes';
import { walletRouter } from './modules/wallet/routes';
import { campaignRouter } from './modules/campaigns/routes';
import { roomRouter } from './modules/rooms/routes';
import { billboardRouter } from './modules/billboard/routes';
import { engagementRouter } from './modules/engagement/routes';
import { notificationRouter } from './modules/notifications/routes';
import { gamificationRouter } from './modules/gamification/routes';
import { analyticsRouter } from './modules/analytics/routes';
import { adminRouter } from './modules/admin/routes';
import { aiRouter } from './modules/ai/routes';
import { sponsorRouter } from './modules/sponsors/routes';
import { marketplaceRouter } from './modules/marketplace/routes';

// Import middleware
import { authenticate } from './modules/auth/middleware/auth.middleware';
import { apiRateLimiter } from './modules/auth/middleware/rate-limit.middleware';
import { errorHandler } from '../middlewares/error.middleware';
import { requestLogger } from '../middlewares/logger.middleware';

// Create main API router
const router = Router();

// Apply global middleware to all routes
router.use(requestLogger);
router.use(apiRateLimiter);

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// Mount module routes
router.use('/auth', authRouter);                     // Authentication (public)
router.use('/users', authenticate, userRouter);      // User management
router.use('/wallet', authenticate, walletRouter);   // Wallet operations
router.use('/campaigns', authenticate, campaignRouter); // Campaign management
router.use('/rooms', authenticate, roomRouter);      // Room management
router.use('/billboard', billboardRouter);           // Billboard (partially public)
router.use('/engagement', authenticate, engagementRouter); // Engagement tracking
router.use('/notifications', authenticate, notificationRouter); // Notifications
router.use('/gamification', authenticate, gamificationRouter); // Gamification
router.use('/analytics', authenticate, analyticsRouter); // Analytics
router.use('/admin', authenticate, adminRouter);     // Admin operations
router.use('/ai', aiRouter);                          // AI features (partially public)
router.use('/sponsors', authenticate, sponsorRouter); // Sponsor management
router.use('/marketplace', marketplaceRouter);        // Marketplace (partially public)

// Error handling middleware (should be last)
router.use(errorHandler);

// Export all module components for use in other parts of the application
export * from './modules/auth';
export * from './modules/users';
export * from './modules/wallet';
export * from './modules/campaigns';
export * from './modules/rooms';
export * from './modules/billboard';
export * from './modules/engagement';
export * from './modules/notifications';
export * from './modules/gamification';
export * from './modules/analytics';
export * from './modules/admin';
export * from './modules/ai';
export * from './modules/sponsors';
export * from './modules/marketplace';

// Export router as default
export default router;

// Export API metadata
export const apiVersion = '1.0.0';
export const apiName = 'VIRAZ Platform API';
export const apiDescription = 'Enterprise-grade engagement economy platform API';

// API documentation summary
export const apiDocs = {
  version: apiVersion,
  name: apiName,
  description: apiDescription,
  modules: [
    { name: 'auth', path: '/auth', description: 'Authentication and authorization' },
    { name: 'users', path: '/users', description: 'User profile management' },
    { name: 'wallet', path: '/wallet', description: 'CAP wallet and transactions' },
    { name: 'campaigns', path: '/campaigns', description: 'Campaign and ad management' },
    { name: 'rooms', path: '/rooms', description: 'Live rooms and streaming' },
    { name: 'billboard', path: '/billboard', description: 'Content discovery and feed' },
    { name: 'engagement', path: '/engagement', description: 'User engagement tracking' },
    { name: 'notifications', path: '/notifications', description: 'Multi-channel notifications' },
    { name: 'gamification', path: '/gamification', description: 'Ranks, achievements, leaderboards' },
    { name: 'analytics', path: '/analytics', description: 'Analytics and reporting' },
    { name: 'admin', path: '/admin', description: 'Administrative operations' },
    { name: 'ai', path: '/ai', description: 'AI-powered features' },
    { name: 'sponsors', path: '/sponsors', description: 'Sponsor and brand management' },
    { name: 'marketplace', path: '/marketplace', description: 'Product marketplace' },
  ],
  totalEndpoints: 300, // Approximate total number of endpoints
};

// Helper to get all routes (for documentation)
export const getRoutes = () => {
  const routes: Array<{ method: string; path: string; auth: boolean }> = [];
  
  const extractRoutes = (stack: any, basePath: string = '') => {
    if (!stack) return;
    
    stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          routes.push({
            method: method.toUpperCase(),
            path: basePath + layer.route.path,
            auth: basePath.includes('/auth') ? false : true, // Simplified auth check
          });
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        extractRoutes(layer.handle.stack, basePath + (layer.regexp.source.replace('\\/?(?=\\/|$)', '')));
      }
    });
  };

  extractRoutes(router.stack);
  return routes;
};