/**
 * Auth Module Index
 * Exports all authentication module components
 */

// Controllers
export { authController } from './controllers/auth.controller';
export { oauthController } from './controllers/oauth.controller';
export { verificationController } from './controllers/verification.controller';

// Services
export { authService } from './services/auth.service';
export { jwtService } from './services/jwt.service';
export { otpService } from './services/otp.service';
export { sessionService } from './services/session.service';

// Repositories
export { authRepository } from './repositories/auth.repository';

// Middleware
export * from './middleware';

// Validators
export * from './validators';

// Routes
export { authRouter } from './routes';

// Module configuration
export const authModule = {
  name: 'auth',
  version: '1.0.0',
  description: 'Authentication, authorization, and session management',
  controllers: [
    authController,
    oauthController,
    verificationController,
  ],
  services: [
    authService,
    jwtService,
    otpService,
    sessionService,
  ],
  repositories: [
    authRepository,
  ],
};