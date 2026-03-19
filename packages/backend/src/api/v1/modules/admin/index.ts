/**
 * Admin Module Index
 * Exports all admin module components
 */

// Controllers
export { adminController } from './controllers/admin.controller';
export { userManagementController } from './controllers/user-management.controller';
export { moderationController } from './controllers/moderation.controller';
export { fraudController } from './controllers/fraud.controller';

// Services
export { adminService } from './services/admin.service';
export { userManagementService } from './services/user-management.service';
export { moderationService } from './services/moderation.service';
export { fraudService } from './services/fraud.service';

// Repositories
export { adminRepository } from './repositories/admin.repository';

// Middleware
export * from './middleware';

// Routes
export { adminRouter } from './routes';

// Module configuration
export const adminModule = {
  name: 'admin',
  version: '1.0.0',
  description: 'Admin panel, user management, moderation, and fraud detection',
  controllers: [
    adminController,
    userManagementController,
    moderationController,
    fraudController,
  ],
  services: [
    adminService,
    userManagementService,
    moderationService,
    fraudService,
  ],
  repositories: [
    adminRepository,
  ],
};