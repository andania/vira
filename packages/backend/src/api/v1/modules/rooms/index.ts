/**
 * Room Module Index
 * Exports all room module components
 */

// Controllers
export { roomController } from './controllers/room.controller';
export { liveController } from './controllers/live.controller';
export { chatController } from './controllers/chat.controller';
export { recordingController } from './controllers/recording.controller';
export { moderationController } from './controllers/moderation.controller';

// Services
export { roomService } from './services/room.service';
export { streamingService } from './services/streaming.service';
export { chatService } from './services/chat.service';
export { recordingService } from './services/recording.service';

// Repositories
export { roomRepository } from './repositories/room.repository';
export { participantRepository } from './repositories/participant.repository';
export { messageRepository } from './repositories/message.repository';

// Middleware
export * from './middleware';

// Routes
export { roomRouter } from './routes';

// Module configuration
export const roomModule = {
  name: 'rooms',
  version: '1.0.0',
  description: 'Room and live streaming management',
  controllers: [
    roomController,
    liveController,
    chatController,
    recordingController,
    moderationController,
  ],
  services: [
    roomService,
    streamingService,
    chatService,
    recordingService,
  ],
  repositories: [
    roomRepository,
    participantRepository,
    messageRepository,
  ],
};