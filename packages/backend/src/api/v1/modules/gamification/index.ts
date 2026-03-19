/**
 * Gamification Module Index
 * Exports all gamification module components
 */

// Controllers
export { gamificationController } from './controllers/gamification.controller';
export { rankController } from './controllers/rank.controller';
export { achievementController } from './controllers/achievement.controller';
export { leaderboardController } from './controllers/leaderboard.controller';
export { challengeController } from './controllers/challenge.controller';

// Services
export { gamificationService } from './services/gamification.service';
export { rankService } from './services/rank.service';
export { achievementService } from './services/achievement.service';
export { leaderboardService } from './services/leaderboard.service';
export { challengeService } from './services/challenge.service';

// Repositories
export { gamificationRepository } from './repositories/gamification.repository';
export { rankRepository } from './repositories/rank.repository';
export { achievementRepository } from './repositories/achievement.repository';
export { leaderboardRepository } from './repositories/leaderboard.repository';
export { challengeRepository } from './repositories/challenge.repository';
export { badgeRepository } from './repositories/badge.repository';

// Middleware
export * from './middleware';

// Routes
export { gamificationRouter } from './routes';

// Module configuration
export const gamificationModule = {
  name: 'gamification',
  version: '1.0.0',
  description: 'Gamification features including ranks, achievements, leaderboards, and challenges',
  controllers: [
    gamificationController,
    rankController,
    achievementController,
    leaderboardController,
    challengeController,
  ],
  services: [
    gamificationService,
    rankService,
    achievementService,
    leaderboardService,
    challengeService,
  ],
  repositories: [
    gamificationRepository,
    rankRepository,
    achievementRepository,
    leaderboardRepository,
    challengeRepository,
    badgeRepository,
  ],
};