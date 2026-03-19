/**
 * WebRTC Streaming Service
 * Peer-to-peer streaming with WebRTC
 */

import { logger } from '../../../core/logger';
import { v4 as uuidv4 } from 'uuid';

export interface PeerConnection {
  id: string;
  userId: string;
  streamId: string;
  role: 'host' | 'viewer';
  joinedAt: Date;
  iceCandidates: any[];
  sdpOffer?: string;
  sdpAnswer?: string;
}

export interface RoomParticipant {
  userId: string;
  streamId: string;
  role: 'host' | 'viewer';
  joinedAt: Date;
  metadata?: any;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
  from: string;
  to?: string;
  streamId: string;
  data?: any;
}

export class WebRTCService {
  private rooms: Map<string, Map<string, RoomParticipant>> = new Map();
  private connections: Map<string, PeerConnection> = new Map();
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map();

  constructor() {
    logger.info('✅ WebRTC service initialized');
  }

  /**
   * Create a new room
   */
  async createRoom(streamId: string, options: {
    maxParticipants?: number;
    isPrivate?: boolean;
    password?: string;
  }): Promise<void> {
    if (this.rooms.has(streamId)) {
      throw new Error('Room already exists');
    }

    this.rooms.set(streamId, new Map());
    
    // Store room metadata in memory (would use Redis in production)
    await this.saveRoomMetadata(streamId, options);

    logger.info(`WebRTC room created: ${streamId}`);
  }

  /**
   * Join a room
   */
  async joinRoom(streamId: string, userId: string, role: 'host' | 'viewer' = 'viewer'): Promise<RoomParticipant[]> {
    const room = this.rooms.get(streamId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if user already in room
    if (room.has(userId)) {
      return Array.from(room.values());
    }

    const participant: RoomParticipant = {
      userId,
      streamId,
      role,
      joinedAt: new Date(),
    };

    room.set(userId, participant);

    // Create peer connection
    const connection: PeerConnection = {
      id: uuidv4(),
      userId,
      streamId,
      role,
      joinedAt: new Date(),
      iceCandidates: [],
    };
    this.connections.set(connection.id, connection);

    // Notify other participants
    this.broadcastToRoom(streamId, {
      type: 'join',
      from: userId,
      streamId,
      data: { userId, role },
    });

    logger.info(`User ${userId} joined WebRTC room: ${streamId}`);
    return Array.from(room.values());
  }

  /**
   * Leave a room
   */
  async leaveRoom(streamId: string, userId: string): Promise<void> {
    const room = this.rooms.get(streamId);
    if (room) {
      room.delete(userId);

      // Clean up connections
      for (const [connId, conn] of this.connections) {
        if (conn.userId === userId && conn.streamId === streamId) {
          this.connections.delete(connId);
        }
      }

      // Notify other participants
      this.broadcastToRoom(streamId, {
        type: 'leave',
        from: userId,
        streamId,
        data: { userId },
      });

      // Clean up empty room
      if (room.size === 0) {
        this.rooms.delete(streamId);
      }

      logger.info(`User ${userId} left WebRTC room: ${streamId}`);
    }
  }

  /**
   * Close a room
   */
  async closeRoom(streamId: string): Promise<void> {
    const room = this.rooms.get(streamId);
    if (room) {
      // Notify all participants
      this.broadcastToRoom(streamId, {
        type: 'leave',
        from: 'system',
        streamId,
        data: { reason: 'room_closed' },
      });

      // Clean up
      for (const [userId] of room) {
        await this.leaveRoom(streamId, userId);
      }

      this.rooms.delete(streamId);
      logger.info(`WebRTC room closed: ${streamId}`);
    }
  }

  /**
   * Handle signaling message
   */
  async handleSignal(message: SignalingMessage): Promise<void> {
    const { type, from, to, streamId, data } = message;

    // Store the message for the target
    if (to) {
      // Direct message to specific user
      this.queueMessage(to, message);
    } else {
      // Broadcast to room
      this.broadcastToRoom(streamId, message);
    }

    // Handle specific message types
    switch (type) {
      case 'offer':
        await this.handleOffer(streamId, from, data);
        break;
      case 'answer':
        await this.handleAnswer(streamId, from, data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(streamId, from, data);
        break;
    }
  }

  /**
   * Handle WebRTC offer
   */
  private async handleOffer(streamId: string, userId: string, data: any): Promise<void> {
    // Find or create connection
    let connection: PeerConnection | undefined;
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && conn.streamId === streamId) {
        connection = conn;
        break;
      }
    }

    if (connection) {
      connection.sdpOffer = data.sdp;
    }
  }

  /**
   * Handle WebRTC answer
   */
  private async handleAnswer(streamId: string, userId: string, data: any): Promise<void> {
    // Find connection
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && conn.streamId === streamId) {
        conn.sdpAnswer = data.sdp;
        break;
      }
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(streamId: string, userId: string, data: any): Promise<void> {
    // Find connection
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && conn.streamId === streamId) {
        conn.iceCandidates.push(data.candidate);
        break;
      }
    }
  }

  /**
   * Get room participants
   */
  getRoomParticipants(streamId: string): RoomParticipant[] {
    const room = this.rooms.get(streamId);
    return room ? Array.from(room.values()) : [];
  }

  /**
   * Get participant count
   */
  getParticipantCount(streamId: string): number {
    const room = this.rooms.get(streamId);
    return room ? room.size : 0;
  }

  /**
   * Get streaming URL (signaling server)
   */
  getStreamingUrl(streamId: string): string {
    return `${process.env.WS_URL || 'ws://localhost:3000'}/webrtc/${streamId}`;
  }

  /**
   * Broadcast message to room
   */
  private broadcastToRoom(streamId: string, message: SignalingMessage): void {
    const room = this.rooms.get(streamId);
    if (room) {
      for (const [userId] of room) {
        if (userId !== message.from) {
          this.queueMessage(userId, message);
        }
      }
    }
  }

  /**
   * Queue message for user
   */
  private queueMessage(userId: string, message: SignalingMessage): void {
    const handler = this.messageHandlers.get(userId);
    if (handler) {
      handler(message);
    } else {
      // Store in Redis for offline delivery
      this.storeOfflineMessage(userId, message);
    }
  }

  /**
   * Register message handler for user
   */
  registerMessageHandler(userId: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(userId, handler);
  }

  /**
   * Unregister message handler
   */
  unregisterMessageHandler(userId: string): void {
    this.messageHandlers.delete(userId);
  }

  /**
   * Store offline message
   */
  private async storeOfflineMessage(userId: string, message: SignalingMessage): Promise<void> {
    // Would use Redis in production
    logger.debug(`Storing offline message for user ${userId}`);
  }

  /**
   * Save room metadata
   */
  private async saveRoomMetadata(streamId: string, metadata: any): Promise<void> {
    // Would use Redis in production
    logger.debug(`Saving room metadata for ${streamId}`);
  }

  /**
   * Get room metadata
   */
  private async getRoomMetadata(streamId: string): Promise<any> {
    // Would use Redis in production
    return null;
  }

  /**
   * Clean up inactive rooms
   */
  async cleanupInactiveRooms(): Promise<number> {
    let cleaned = 0;
    for (const [streamId, room] of this.rooms) {
      if (room.size === 0) {
        this.rooms.delete(streamId);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      activeParticipants: Array.from(this.rooms.values()).reduce(
        (sum, room) => sum + room.size,
        0
      ),
    };
  }
}

export const webrtcService = new WebRTCService();