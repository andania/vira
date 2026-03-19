/**
 * Sponsors Module Index
 * Exports all sponsor module components
 */

// Controllers
export { sponsorController } from './controllers/sponsor.controller';
export { brandController } from './controllers/brand.controller';
export { verificationController } from './controllers/verification.controller';

// Services
export { sponsorService } from './services/sponsor.service';
export { brandService } from './services/brand.service';
export { verificationService } from './services/verification.service';

// Repositories
export { sponsorRepository } from './repositories/sponsor.repository';
export { brandRepository } from './repositories/brand.repository';
export { verificationRepository } from './repositories/verification.repository';

// Middleware
export * from './middleware';

// Routes
export { sponsorRouter } from './routes';

// Module configuration
export const sponsorModule = {
  name: 'sponsors',
  version: '1.0.0',
  description: 'Sponsor management, brands, and verification',
  controllers: [
    sponsorController,
    brandController,
    verificationController,
  ],
  services: [
    sponsorService,
    brandService,
    verificationService,
  ],
  repositories: [
    sponsorRepository,
    brandRepository,
    verificationRepository,
  ],
};