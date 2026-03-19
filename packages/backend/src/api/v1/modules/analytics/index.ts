/**
 * Analytics Module Index
 * Exports all analytics module components
 */

// Controllers
export { analyticsController } from './controllers/analytics.controller';
export { reportController } from './controllers/report.controller';

// Services
export { analyticsService } from './services/analytics.service';
export { reportingService } from './services/reporting.service';
export { exportService } from './services/export.service';

// Repositories
export { analyticsRepository } from './repositories/analytics.repository';
export { reportRepository } from './repositories/report.repository';

// Middleware
export * from './middleware';

// Routes
export { analyticsRouter } from './routes';

// Module configuration
export const analyticsModule = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Analytics, reporting, and data export',
  controllers: [
    analyticsController,
    reportController,
  ],
  services: [
    analyticsService,
    reportingService,
    exportService,
  ],
  repositories: [
    analyticsRepository,
    reportRepository,
  ],
};