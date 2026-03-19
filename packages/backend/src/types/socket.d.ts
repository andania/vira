/**
 * Socket.IO Type Definitions
 */

import { Socket as IOSocket } from 'socket.io';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface SocketData {
  user: SocketUser;
  authenticated: boolean;
  connectedAt: Date;
}

export interface AuthenticatedSocket extends IOSocket {
  data: SocketData;
}

export interface ServerToClientEvents {
  // Room events
  'room:participant:joined': (data: { userId: string; username: string; avatar?: string }) => void;
  'room:participant:left': (data: { userId: string }) => void;
  'room:message:new': (data: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    mentions?: string[];
    createdAt: Date;
  }) => void;
  'room:reaction:new': (data: { userId: string; reaction: string; timestamp: number }) => void;
  'room:host:muted': (data: { roomId: string; by: string }) => void;
  'room:host:unmuted': (data: { roomId: string; by: string }) => void;
  'room:host:kicked': (data: { roomId: string; by: string }) => void;
  'room:host:promoted': (data: { roomId: string; by: string }) => void;
  'room:poll:updated': (data: { pollId: string; results: any[]; totalVotes: number }) => void;

  // Chat events
  'chat:room:message:new': (data: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    mentions?: string[];
    createdAt: Date;
  }) => void;
  'chat:room:typing:update': (data: { userId: string; isTyping: boolean }) => void;
  'chat:private:message:new': (data: {
    id: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar?: string;
    content: string;
    createdAt: Date;
  }) => void;
  'chat:read:receipt': (data: {
    conversationId: string;
    messageIds: string[];
    readBy: string;
    readAt: Date;
  }) => void;

  // Notification events
  'notification:new': (data: any) => void;
  'notification:unread:count': (data: { count: number }) => void;

  // Wallet events
  'wallet:update': (data: { balance: number }) => void;
  'transaction:new': (data: any) => void;

  // Engagement events
  'engagement:liked': (data: { userId: string; targetType: string; targetId: string }) => void;
  'engagement:unliked': (data: { userId: string; targetType: string; targetId: string }) => void;
  'engagement:comment:new': (data: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    createdAt: Date;
  }) => void;
  'engagement:shared': (data: { userId: string; targetType: string; targetId: string }) => void;
  'engagement:reaction:new': (data: { userId: string; reaction: string; timestamp: number }) => void;

  // System events
  'system:alert': (data: { message: string; type: string }) => void;
  'system:maintenance': (data: { message: string; duration: number }) => void;
}

export interface ClientToServerEvents {
  // Room events
  'room:join': (data: { roomId: string; metadata?: any }, callback: (response: any) => void) => void;
  'room:leave': (data: { roomId: string }, callback: (response: any) => void) => void;
  'room:participants': (data: { roomId: string }, callback: (response: any) => void) => void;
  'room:host:control': (data: {
    roomId: string;
    action: string;
    targetUserId: string;
    data?: any;
  }, callback: (response: any) => void) => void;
  'room:reaction': (data: { roomId: string; reaction: string }) => void;
  'room:poll:vote': (data: { pollId: string; optionIndex: number }, callback: (response: any) => void) => void;

  // Chat events
  'chat:room:message': (data: {
    roomId: string;
    content: string;
    mentions?: string[];
  }, callback: (response: any) => void) => void;
  'chat:room:typing': (data: { roomId: string; isTyping: boolean }) => void;
  'chat:private:message': (data: {
    recipientId: string;
    content: string;
  }, callback: (response: any) => void) => void;
  'chat:read': (data: { conversationId: string; messageIds: string[] }) => void;
  'chat:history': (data: {
    conversationId: string;
    before?: string;
    limit?: number;
  }, callback: (response: any) => void) => void;

  // Notification events
  'notification:subscribe': () => void;
  'notification:read': (data: { notificationId: string }, callback: (response: any) => void) => void;
  'notification:read:all': (callback: (response: any) => void) => void;
  'notification:list': (data: { page?: number; limit?: number }, callback: (response: any) => void) => void;
  'notification:preferences:update': (data: { preferences: any }, callback: (response: any) => void) => void;
  'notification:preferences:get': (callback: (response: any) => void) => void;

  // Engagement events
  'engagement:like': (data: { targetType: string; targetId: string }, callback: (response: any) => void) => void;
  'engagement:comment': (data: {
    targetType: string;
    targetId: string;
    content: string;
    parentId?: string;
  }, callback: (response: any) => void) => void;
  'engagement:share': (data: {
    targetType: string;
    targetId: string;
    platform: string;
  }, callback: (response: any) => void) => void;
  'engagement:click': (data: {
    targetType: string;
    targetId: string;
    url: string;
  }, callback: (response: any) => void) => void;
  'engagement:suggest': (data: {
    targetType: string;
    targetId: string;
    title: string;
    content: string;
    category: string;
  }, callback: (response: any) => void) => void;
  'engagement:reaction': (data: { roomId: string; reaction: string }) => void;
  'engagement:view': (data: { targetType: string; targetId: string; duration?: number }) => void;
  'engagement:stats': (data: { targetType: string; targetId: string }, callback: (response: any) => void) => void;

  // Generic
  'ping': (callback: () => void) => void;
  'error': (error: any) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: SocketUser;
}

export type SocketServer = import('socket.io').Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type Socket = import('socket.io').Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;