/**
 * AI Module Index
 * Exports all AI module components
 */

// Controllers
export { aiController } from './controllers/ai.controller';
export { recommendationController } from './controllers/recommendation.controller';
export { personalizationController } from './controllers/personalization.controller';
export { trendController } from './controllers/trend.controller';
export { fraudAIController } from './controllers/fraud-ai.controller';
export { moderationController } from './controllers/moderation.controller';

// Services
export { aiService } from './services/ai.service';
export { recommendationService } from './services/recommendation.service';
export { personalizationService } from './services/personalization.service';
export { trendService } from './services/trend.service';
export { fraudAIService } from './services/fraud-ai.service';
export { contentModerationService } from './services/content.moderation.service';

// Repositories
export { aiRepository } from './repositories/ai.repository';

// Middleware
export * from './middleware';

// Routes
export { aiRouter } from './routes';

// Module configuration
export const aiModule = {
  name: 'ai',
  version: '1.0.0',
  description: 'AI-powered features including recommendations, personalization, trends, fraud detection, and content moderation',
  controllers: [
    aiController,
    recommendationController,
    personalizationController,
    trendController,
    fraudAIController,
    moderationController,
  ],
  services: [
    aiService,
    recommendationService,
    personalizationService,
    trendService,
    fraudAIService,
    contentModerationService,
  ],
  repositories: [
    aiRepository,
  ],
};