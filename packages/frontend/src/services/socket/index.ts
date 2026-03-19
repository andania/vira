/**
 * Socket Services Index
 * Central export point for all socket-related services and types
 */

// Socket client
export { default as socketClient, socketService } from './socket.client';

// Socket events and types
export * from './events';

// Re-export types with more convenient names
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketEventMap,
  SocketResponse,
  SocketOptions,
  SocketMiddleware,
  SocketMiddlewareConfig,
} from './events';

export { SocketEvent, SocketStatus } from './events';

// Socket connection status hook (optional)
export const getSocketStatus = (): boolean => {
  return socketService.isConnected();
};

// Socket ID helper
export const getSocketId = (): string | null => {
  return socketService.getSocketId();
};

// Default export
export default socketService;