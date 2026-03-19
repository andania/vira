/**
 * Socket.IO Index
 * Exports socket server and handlers
 */

export { initializeSocket, io } from './socket.server';
export { roomHandler } from './handlers/room.handler';
export { chatHandler } from './handlers/chat.handler';
export { notificationHandler } from './handlers/notification.handler';
export { engagementHandler } from './handlers/engagement.handler';

import { Server } from 'socket.io';
export type SocketServer = Server;