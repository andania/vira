/**
 * Socket.IO Client
 * Handles real-time WebSocket connections
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../../../store';
import { addNotification } from '../../../store/slices/notification.slice';
import { updateWalletBalance } from '../../../store/slices/wallet.slice';
import { addMessage, updateParticipantCount } from '../../../store/slices/room.slice';
import { addToast } from '../../../store/slices/ui.slice';
import config from '../../../config';
import { SocketEvent, SocketEventMap } from './events';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): void {
    if (this.socket?.connected) return;

    this.socket = io(config.socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupBaseListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Set up base socket listeners
   */
  private setupBaseListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.reconnectAttempts = 0;
      store.dispatch(addToast({
        type: 'success',
        message: 'Real-time connection established',
        duration: 3000,
      }));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        store.dispatch(addToast({
          type: 'info',
          message: 'Disconnected from server',
          duration: 3000,
        }));
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        store.dispatch(addToast({
          type: 'error',
          message: 'Unable to establish real-time connection',
          duration: 5000,
        }));
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      store.dispatch(addToast({
        type: 'success',
        message: 'Real-time connection reestablished',
        duration: 3000,
      }));
    });

    // Notification events
    this.socket.on('notification:new', (data) => {
      store.dispatch(addNotification(data));
    });

    this.socket.on('notification:unread:count', (data) => {
      // Update unread count in notification slice
    });

    // Wallet events
    this.socket.on('wallet:update', (data) => {
      store.dispatch(updateWalletBalance(data.balance));
    });

    // Room events
    this.socket.on('room:participant:joined', (data) => {
      store.dispatch(updateParticipantCount(data.participants));
    });

    this.socket.on('room:participant:left', (data) => {
      store.dispatch(updateParticipantCount(data.participants));
    });

    this.socket.on('room:message:new', (data) => {
      store.dispatch(addMessage(data));
    });

    // Engagement events
    this.socket.on('engagement:liked', (data) => {
      // Handle like update
    });

    this.socket.on('engagement:comment:new', (data) => {
      // Handle new comment
    });

    // System events
    this.socket.on('system:alert', (data) => {
      store.dispatch(addToast({
        type: data.type || 'info',
        message: data.message,
        duration: 5000,
      }));
    });

    this.socket.on('system:maintenance', (data) => {
      store.dispatch(addToast({
        type: 'warning',
        message: `Maintenance in ${data.duration} minutes`,
        duration: 10000,
      }));
    });
  }

  /**
   * Emit an event to the server
   */
  emit<T extends keyof SocketEventMap>(
    event: T,
    ...args: Parameters<SocketEventMap[T]>
  ): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, message queued');
      // Queue message for later sending
      this.queueMessage(event, args);
      return;
    }

    this.socket.emit(event as string, ...args);
  }

  /**
   * Listen for an event from the server
   */
  on<T extends keyof SocketEventMap>(
    event: T,
    callback: SocketEventMap[T]
  ): void {
    if (!this.socket) return;

    // Store listener for cleanup
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, []);
    }
    this.listeners.get(event as string)?.push(callback as Function);

    this.socket.on(event as string, callback as any);
  }

  /**
   * Remove listener for an event
   */
  off<T extends keyof SocketEventMap>(event: T, callback?: SocketEventMap[T]): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event as string, callback as any);
      const listeners = this.listeners.get(event as string);
      if (listeners) {
        const index = listeners.indexOf(callback as Function);
        if (index !== -1) listeners.splice(index, 1);
      }
    } else {
      this.socket.off(event as string);
      this.listeners.delete(event as string);
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string, metadata?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:join', { roomId, metadata }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:leave', { roomId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send a message to a room
   */
  sendRoomMessage(roomId: string, content: string, mentions?: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('chat:room:message', { roomId, content, mentions }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean): void {
    this.emit('chat:room:typing', { roomId, isTyping });
  }

  /**
   * Send a reaction in a room
   */
  sendReaction(roomId: string, reaction: string): void {
    this.emit('room:reaction', { roomId, reaction });
  }

  /**
   * Queue messages when offline
   */
  private messageQueue: Array<{ event: string; args: any[] }> = [];

  private queueMessage(event: string, args: any[]): void {
    this.messageQueue.push({ event, args });

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  /**
   * Process queued messages when reconnected
   */
  private processQueue(): void {
    while (this.messageQueue.length > 0) {
      const { event, args } = this.messageQueue.shift()!;
      this.socket?.emit(event, ...args);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Clean up all listeners
   */
  removeAllListeners(): void {
    if (!this.socket) return;

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.off(event, callback as any);
      });
    });
    this.listeners.clear();
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Re-export for convenience
export default socketService;