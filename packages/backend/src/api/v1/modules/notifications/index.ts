/**
 * Notifications Module Index
 * Exports all notification module components
 */

// Controllers
export { notificationController } from './controllers/notification.controller';
export { preferenceController } from './controllers/preference.controller';

// Services
export { notificationService } from './services/notification.service';
export { pushService } from './services/push.service';
export { emailService } from './services/email.service';
export { smsService } from './services/sms.service';

// Repositories
export { notificationRepository } from './repositories/notification.repository';
export { preferenceRepository } from './repositories/preference.repository';

// Middleware
export * from './middleware';

// Routes
export { notificationRouter } from './routes';

// Module configuration
export const notificationModule = {
  name: 'notifications',
  version: '1.0.0',
  description: 'Multi-channel notification system',
  controllers: [
    notificationController,
    preferenceController,
  ],
  services: [
    notificationService,
    pushService,
    emailService,
    smsService,
  ],
  repositories: [
    notificationRepository,
    preferenceRepository,
  ],
};