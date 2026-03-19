/**
 * Streaming Library Index
 * Exports streaming-related services and types
 */

export { streamingService, StreamingService } from './streaming.service';
export { muxService, MuxService } from './mux.service';
export { webrtcService, WebRTCService } from './webrtc.service';

export type {
  StreamConfig,
  StreamInfo,
  StreamToken,
  StreamingProvider,
} from './streaming.service';

export type {
  MuxStream,
  MuxRecording,
  MuxStreamConfig,
} from './mux.service';

export type {
  PeerConnection,
  RoomParticipant,
  SignalingMessage,
} from './webrtc.service';

// Video quality presets
export const videoQualities = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  UHD: 'uhd',
} as const;

export type VideoQuality = typeof videoQualities[keyof typeof videoQualities];

// Audio quality presets
export const audioQualities = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type AudioQuality = typeof audioQualities[keyof typeof audioQualities];

// Stream status
export const streamStatus = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  ENDED: 'ended',
  ERROR: 'error',
} as const;

export type StreamStatus = typeof streamStatus[keyof typeof streamStatus];

// Participant roles
export const participantRoles = {
  HOST: 'host',
  VIEWER: 'viewer',
} as const;

export type ParticipantRole = typeof participantRoles[keyof typeof participantRoles];

// Signaling message types
export const signalingTypes = {
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  JOIN: 'join',
  LEAVE: 'leave',
} as const;

export type SignalingType = typeof signalingTypes[keyof typeof signalingTypes];

// Default streaming settings
export const defaultStreamSettings = {
  videoQuality: videoQualities.MEDIUM,
  audioQuality: audioQualities.MEDIUM,
  maxParticipants: 100,
  maxDuration: 14400, // 4 hours in seconds
  reconnectWindow: 60, // seconds
} as const;

// Streaming endpoints
export const streamingEndpoints = {
  HLS: '/live/{streamId}/index.m3u8',
  DASH: '/live/{streamId}/index.mpd',
  THUMBNAIL: '/thumbnails/{streamId}.jpg',
  RECORDING: '/recordings/{recordingId}.mp4',
} as const;