/**
 * Campaign Module Index
 * Exports all campaign module components
 */

// Controllers
export { campaignController } from './controllers/campaign.controller';
export { adController } from './controllers/ad.controller';
export { targetingController } from './controllers/targeting.controller';
export { campaignAnalyticsController } from './controllers/analytics.controller';

// Services
export { campaignService } from './services/campaign.service';
export { adService } from './services/ad.service';
export { targetingService } from './services/targeting.service';
export { budgetService } from './services/budget.service';
export { schedulingService } from './services/scheduling.service';

// Repositories
export { campaignRepository } from './repositories/campaign.repository';
export { adRepository } from './repositories/ad.repository';
export { targetingRepository } from './repositories/targeting.repository';

// Middleware
export * from './middleware';

// Routes
export { campaignRouter } from './routes';

// Module configuration
export const campaignModule = {
  name: 'campaigns',
  version: '1.0.0',
  description: 'Campaign and ad management',
  controllers: [
    campaignController,
    adController,
    targetingController,
    campaignAnalyticsController,
  ],
  services: [
    campaignService,
    adService,
    targetingService,
    budgetService,
    schedulingService,
  ],
  repositories: [
    campaignRepository,
    adRepository,
    targetingRepository,
  ],
};