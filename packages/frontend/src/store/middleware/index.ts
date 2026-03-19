/**
 * Store Middleware Index
 * Exports all middleware and middleware utilities
 */

import { loggerMiddleware } from './logger.middleware';
import apiMiddleware, { injectStore, cacheUtils, offlineUtils } from './api.middleware';

// Export middleware
export { loggerMiddleware, apiMiddleware };

// Export utilities
export { cacheUtils, offlineUtils };

// Export store injector
export { injectStore };

// Combined middleware array for store configuration
export const middleware = [loggerMiddleware, apiMiddleware];

export default middleware;