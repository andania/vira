/**
 * Socket Event Types
 * Type definitions for all socket events
 */

// =====================================================
// Server to Client Events
// =====================================================

export interface ServerToClientEvents {
  // Room events
  'room:participant:joined': (data: { userId: string; username: string; avatar?: string; participants: number }) => void;
  'room:participant:left': (data: { userId: string; participants: number }) => void;
  'room:message:new': (data: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    mentions?: string[];
    createdAt: string;
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
    createdAt: string;
  }) => void;
  'chat:room:typing:update': (data: { userId: string; isTyping: boolean }) => void;
  'chat:private:message:new': (data: {
    id: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar?: string;
    content: string;
    createdAt: string;
  }) => void;
  'chat:read:receipt': (data: {
    conversationId: string;
    messageIds: string[];
    readBy: string;
    readAt: string;
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
    createdAt: string;
  }) => void;
  'engagement:shared': (data: { userId: string; targetType: string; targetId: string }) => void;
  'engagement:reaction:new': (data: { userId: string; reaction: string; timestamp: number }) => void;

  // System events
  'system:alert': (data: { message: string; type: 'info' | 'warning' | 'error' | 'success' }) => void;
  'system:maintenance': (data: { message: string; duration: number }) => void;
}

// =====================================================
// Client to Server Events
// =====================================================

export interface ClientToServerEvents {
  // Room events
  'room:join': (
    data: { roomId: string; metadata?: any },
    callback: (response: { success?: boolean; error?: string; participants?: any[] }) => void
  ) => void;
  'room:leave': (
    data: { roomId: string },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'room:participants': (
    data: { roomId: string },
    callback: (response: { participants?: any[]; error?: string }) => void
  ) => void;
  'room:host:control': (
    data: { roomId: string; action: string; targetUserId: string; data?: any },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'room:reaction': (data: { roomId: string; reaction: string }) => void;
  'room:poll:vote': (
    data: { pollId: string; optionIndex: number },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;

  // Chat events
  'chat:room:message': (
    data: { roomId: string; content: string; mentions?: string[] },
    callback: (response: { success?: boolean; error?: string; message?: any }) => void
  ) => void;
  'chat:room:typing': (data: { roomId: string; isTyping: boolean }) => void;
  'chat:private:message': (
    data: { recipientId: string; content: string },
    callback: (response: { success?: boolean; error?: string; message?: any }) => void
  ) => void;
  'chat:read': (data: { conversationId: string; messageIds: string[] }) => void;
  'chat:history': (
    data: { conversationId: string; before?: string; limit?: number },
    callback: (response: { messages?: any[]; error?: string }) => void
  ) => void;

  // Notification events
  'notification:subscribe': () => void;
  'notification:read': (
    data: { notificationId: string },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'notification:read:all': (
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'notification:list': (
    data: { page?: number; limit?: number },
    callback: (response: { notifications?: any[]; error?: string }) => void
  ) => void;
  'notification:preferences:update': (
    data: { preferences: any },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'notification:preferences:get': (
    callback: (response: { preferences?: any; error?: string }) => void
  ) => void;

  // Engagement events
  'engagement:like': (
    data: { targetType: string; targetId: string },
    callback: (response: { success?: boolean; error?: string; action?: string }) => void
  ) => void;
  'engagement:comment': (
    data: { targetType: string; targetId: string; content: string; parentId?: string },
    callback: (response: { success?: boolean; error?: string; comment?: any }) => void
  ) => void;
  'engagement:share': (
    data: { targetType: string; targetId: string; platform: string },
    callback: (response: { success?: boolean; error?: string; share?: any }) => void
  ) => void;
  'engagement:click': (
    data: { targetType: string; targetId: string; url: string },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  'engagement:suggest': (
    data: { targetType: string; targetId: string; title: string; content: string; category: string },
    callback: (response: { success?: boolean; error?: string; suggestion?: any }) => void
  ) => void;
  'engagement:reaction': (data: { roomId: string; reaction: string }) => void;
  'engagement:view': (data: { targetType: string; targetId: string; duration?: number }) => void;
  'engagement:stats': (
    data: { targetType: string; targetId: string },
    callback: (response: { stats?: any; error?: string }) => void
  ) => void;

  // Generic
  'ping': (callback: () => void) => void;
}

// =====================================================
// Socket Event Map (for type-safe event handling)
// =====================================================

export interface SocketEventMap extends ServerToClientEvents, ClientToServerEvents {}

// =====================================================
// Socket Event Constants
// =====================================================

export const SocketEvent = {
  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_MESSAGE: 'room:message',
  ROOM_REACTION: 'room:reaction',
  ROOM_PARTICIPANTS: 'room:participants',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_MESSAGE_NEW: 'room:message:new',
  ROOM_REACTION_NEW: 'room:reaction:new',
  ROOM_HOST_CONTROL: 'room:host:control',
  ROOM_HOST_MUTED: 'room:host:muted',
  ROOM_HOST_UNMUTED: 'room:host:unmuted',
  ROOM_HOST_KICKED: 'room:host:kicked',
  ROOM_HOST_PROMOTED: 'room:host:promoted',
  ROOM_POLL_UPDATED: 'room:poll:updated',
  ROOM_POLL_VOTE: 'room:poll:vote',

  // Chat events
  CHAT_ROOM_MESSAGE: 'chat:room:message',
  CHAT_ROOM_MESSAGE_NEW: 'chat:room:message:new',
  CHAT_ROOM_TYPING: 'chat:room:typing',
  CHAT_ROOM_TYPING_UPDATE: 'chat:room:typing:update',
  CHAT_PRIVATE_MESSAGE: 'chat:private:message',
  CHAT_PRIVATE_MESSAGE_NEW: 'chat:private:message:new',
  CHAT_READ: 'chat:read',
  CHAT_READ_RECEIPT: 'chat:read:receipt',
  CHAT_HISTORY: 'chat:history',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read:all',
  NOTIFICATION_LIST: 'notification:list',
  NOTIFICATION_UNREAD_COUNT: 'notification:unread:count',
  NOTIFICATION_SUBSCRIBE: 'notification:subscribe',
  NOTIFICATION_PREFERENCES_UPDATE: 'notification:preferences:update',
  NOTIFICATION_PREFERENCES_GET: 'notification:preferences:get',

  // Wallet events
  WALLET_UPDATE: 'wallet:update',
  TRANSACTION_NEW: 'transaction:new',

  // Engagement events
  ENGAGEMENT_LIKE: 'engagement:like',
  ENGAGEMENT_UNLIKED: 'engagement:unliked',
  ENGAGEMENT_LIKED: 'engagement:liked',
  ENGAGEMENT_COMMENT: 'engagement:comment',
  ENGAGEMENT_COMMENT_NEW: 'engagement:comment:new',
  ENGAGEMENT_SHARE: 'engagement:share',
  ENGAGEMENT_SHARED: 'engagement:shared',
  ENGAGEMENT_CLICK: 'engagement:click',
  ENGAGEMENT_SUGGEST: 'engagement:suggest',
  ENGAGEMENT_REACTION: 'engagement:reaction',
  ENGAGEMENT_REACTION_NEW: 'engagement:reaction:new',
  ENGAGEMENT_VIEW: 'engagement:view',
  ENGAGEMENT_STATS: 'engagement:stats',

  // System events
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  PING: 'ping',
} as const;

export type SocketEventType = typeof SocketEvent[keyof typeof SocketEvent];

// =====================================================
// Socket Connection Status
// =====================================================

export enum SocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// =====================================================
// Socket Options
// =====================================================

export interface SocketOptions {
  url: string;
  token?: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

// =====================================================
// Socket Response Types
// =====================================================

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// =====================================================
// Socket Middleware Types
// =====================================================

export type SocketMiddleware = (event: string, args: any[], next: () => void) => void;

export interface SocketMiddlewareConfig {
  onEmit?: SocketMiddleware;
  onEvent?: SocketMiddleware;
}