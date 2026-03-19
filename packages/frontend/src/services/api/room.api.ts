/**
 * Room API Service
 */

import { ApiClient } from './client';

export interface Room {
  id: string;
  name: string;
  description?: string;
  roomType: string;
  status: string;
  visibility: string;
  participantCount: number;
  maxParticipants?: number;
  brandId: string;
  brandName?: string;
  host?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  settings?: any;
  createdAt: string;
}

export interface Participant {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: string;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content: string;
  mentions?: string[];
  repliedTo?: string;
  createdAt: string;
}

export interface Stream {
  streamId: string;
  status: 'idle' | 'connecting' | 'live' | 'ended';
  viewerCount: number;
  quality?: string;
  startedAt?: string;
  playbackUrl?: string;
  rtmpEndpoint?: string;
  streamKey?: string;
}

export interface Recording {
  id: string;
  roomId: string;
  url: string;
  duration: number;
  size: number;
  createdAt: string;
}

export const roomApi = {
  /**
   * Get rooms
   */
  getRooms: (brandId?: string, page: number = 1, limit: number = 20, status?: string) =>
    ApiClient.get<PaginatedResponse<Room>>('/api/v1/rooms', {
      params: { brandId, page, limit, status },
    }),

  /**
   * Get live rooms
   */
  getLiveRooms: (limit?: number) =>
    ApiClient.get<Room[]>('/api/v1/rooms/live/now', { params: { limit } }),

  /**
   * Get upcoming rooms
   */
  getUpcomingRooms: (days: number = 7, limit?: number) =>
    ApiClient.get<Room[]>('/api/v1/rooms/upcoming/scheduled', { params: { days, limit } }),

  /**
   * Get room by ID
   */
  getRoomById: (roomId: string) =>
    ApiClient.get<Room>(`/api/v1/rooms/${roomId}`),

  /**
   * Create room
   */
  createRoom: (data: Partial<Room>) =>
    ApiClient.post<Room>('/api/v1/rooms', data),

  /**
   * Update room
   */
  updateRoom: (roomId: string, data: Partial<Room>) =>
    ApiClient.put<Room>(`/api/v1/rooms/${roomId}`, data),

  /**
   * Delete room
   */
  deleteRoom: (roomId: string) =>
    ApiClient.delete(`/api/v1/rooms/${roomId}`),

  /**
   * Start room
   */
  startRoom: (roomId: string) =>
    ApiClient.post<Room>(`/api/v1/rooms/${roomId}/start`, {}),

  /**
   * End room
   */
  endRoom: (roomId: string) =>
    ApiClient.post<Room>(`/api/v1/rooms/${roomId}/end`, {}),

  /**
   * Join room
   */
  joinRoom: (roomId: string, metadata?: any) =>
    ApiClient.post<{ participant: Participant }>(`/api/v1/rooms/${roomId}/join`, { metadata }),

  /**
   * Leave room
   */
  leaveRoom: (roomId: string) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/leave`, {}),

  /**
   * Get participants
   */
  getParticipants: (roomId: string) =>
    ApiClient.get<Participant[]>(`/api/v1/rooms/${roomId}/participants`),

  /**
   * Get messages
   */
  getMessages: (roomId: string, limit: number = 50, before?: string) =>
    ApiClient.get<PaginatedResponse<Message>>(`/api/v1/rooms/${roomId}/chat/messages`, {
      params: { limit, before },
    }),

  /**
   * Send message
   */
  sendMessage: (roomId: string, content: string, mentions?: string[]) =>
    ApiClient.post<Message>(`/api/v1/rooms/${roomId}/chat/messages`, { content, mentions }),

  /**
   * Delete message
   */
  deleteMessage: (roomId: string, messageId: string) =>
    ApiClient.delete(`/api/v1/rooms/${roomId}/chat/messages/${messageId}`),

  /**
   * Pin message
   */
  pinMessage: (roomId: string, messageId: string) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/chat/messages/${messageId}/pin`, {}),

  /**
   * Unpin message
   */
  unpinMessage: (roomId: string, messageId: string) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/chat/messages/${messageId}/unpin`, {}),

  /**
   * Get pinned messages
   */
  getPinnedMessages: (roomId: string) =>
    ApiClient.get<Message[]>(`/api/v1/rooms/${roomId}/chat/pinned`),

  /**
   * Set typing indicator
   */
  setTyping: (roomId: string, isTyping: boolean) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/chat/typing`, { isTyping }),

  /**
   * Start stream
   */
  startStream: (roomId: string, quality?: string) =>
    ApiClient.post<Stream>(`/api/v1/rooms/${roomId}/live/start`, { quality }),

  /**
   * End stream
   */
  endStream: (streamId: string) =>
    ApiClient.post(`/api/v1/rooms/live/stop/${streamId}`, {}),

  /**
   * Get stream info
   */
  getStreamInfo: (streamId: string) =>
    ApiClient.get<Stream>(`/api/v1/rooms/live/streams/${streamId}`),

  /**
   * Get stream status
   */
  getStreamStatus: (roomId: string) =>
    ApiClient.get<{ isLive: boolean; viewerCount: number }>(`/api/v1/rooms/${roomId}/live/status`),

  /**
   * Get stream statistics
   */
  getStreamStatistics: (roomId: string) =>
    ApiClient.get<any>(`/api/v1/rooms/${roomId}/live/stats`),

  /**
   * Generate viewer token
   */
  generateViewerToken: (roomId: string) =>
    ApiClient.post<{ token: string }>(`/api/v1/rooms/${roomId}/live/token`, {}),

  /**
   * Start recording
   */
  startRecording: (roomId: string, config?: any) =>
    ApiClient.post<Recording>(`/api/v1/rooms/${roomId}/recordings/start`, config),

  /**
   * Stop recording
   */
  stopRecording: (recordingId: string) =>
    ApiClient.post(`/api/v1/rooms/recordings/${recordingId}/stop`, {}),

  /**
   * Get recordings
   */
  getRecordings: (roomId: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Recording>>(`/api/v1/rooms/${roomId}/recordings`, {
      params: { page, limit },
    }),

  /**
   * Delete recording
   */
  deleteRecording: (recordingId: string) =>
    ApiClient.delete(`/api/v1/rooms/recordings/${recordingId}`),

  /**
   * Moderate user
   */
  moderateUser: (roomId: string, targetUserId: string, action: string, reason: string, duration?: number) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/moderation/users`, {
      targetUserId,
      actionType: action,
      reason,
      duration,
    }),

  /**
   * Report room
   */
  reportRoom: (roomId: string, reportType: string, description?: string, evidence?: string[]) =>
    ApiClient.post(`/api/v1/rooms/${roomId}/moderation/reports`, {
      reportType,
      description,
      evidenceUrls: evidence,
    }),
};

export default roomApi;