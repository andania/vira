/**
 * Billboard Module Index
 * Exports all billboard module components
 */

// Controllers
export { feedController } from './controllers/feed.controller';
export { discoveryController } from './controllers/discovery.controller';
export { billboardController } from './controllers/billboard.controller';

// Services
export { feedService } from './services/feed.service';
export { discoveryService } from './services/discovery.service';
export { recommendationService } from './services/recommendation.service';
export { billboardService } from './services/billboard.service';

// Repositories
export { feedRepository } from './repositories/feed.repository';
export { discoveryRepository } from './repositories/discovery.repository';
export { billboardRepository } from './repositories/billboard.repository';

// Middleware
export * from './middleware';

// Routes
export { billboardRouter } from './routes';

// Module configuration
export const billboardModule = {
  name: 'billboard',
  version: '1.0.0',
  description: 'Billboard feed and content discovery',
  controllers: [
    feedController,
    discoveryController,
    billboardController,
  ],
  services: [
    feedService,
    discoveryService,
    recommendationService,
    billboardService,
  ],
  repositories: [
    feedRepository,
    discoveryRepository,
    billboardRepository,
  ],
};