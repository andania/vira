/**
 * Engagement Module Index
 * Exports all engagement module components
 */

// Controllers
export { engagementController } from './controllers/engagement.controller';
export { commentController } from './controllers/comment.controller';
export { suggestionController } from './controllers/suggestion.controller';

// Services
export { engagementService } from './services/engagement.service';
export { rewardService } from './services/reward.service';
export { commentService } from './services/comment.service';
export { suggestionService } from './services/suggestion.service';

// Repositories
export { engagementRepository } from './repositories/engagement.repository';
export { commentRepository } from './repositories/comment.repository';
export { suggestionRepository } from './repositories/suggestion.repository';

// Middleware
export * from './middleware';

// Routes
export { engagementRouter } from './routes';

// Module configuration
export const engagementModule = {
  name: 'engagement',
  version: '1.0.0',
  description: 'User engagement, comments, suggestions, and rewards',
  controllers: [
    engagementController,
    commentController,
    suggestionController,
  ],
  services: [
    engagementService,
    rewardService,
    commentService,
    suggestionService,
  ],
  repositories: [
    engagementRepository,
    commentRepository,
    suggestionRepository,
  ],
};