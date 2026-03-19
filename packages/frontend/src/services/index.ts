/**
 * Services Index
 * Central export point for all services
 */

// API services
export * from './api/client';
export * from './api/auth.api';
export * from './api/user.api';
export * from './api/wallet.api';
export * from './api/campaign.api';
export * from './api/room.api';
export * from './api/billboard.api';
export * from './api/marketplace.api';
export * from './api/notification.api';
export * from './api/gamification.api';
export * from './api/analytics.api';
export * from './api/admin.api';

// Socket services
export * from './socket/socket.client';
export * from './socket/events';

// Re-export commonly used types
export type { ApiClient, ApiResponse, PaginatedResponse } from './api/client';
export type { SocketEvent, SocketEventMap } from './socket/events';