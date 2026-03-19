/**
 * VIRAZ Backend - Express Application Configuration
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config';
import { logger } from './core/logger';
import { requestLogger } from './api/middlewares/logger.middleware';
import { requestId } from './api/middlewares/request-id.middleware';
import { errorHandler } from './api/middlewares/error.middleware';
import { ApiErrorCode } from '@viraz/shared';

// Import routes
import { authRouter } from './api/v1/modules/auth/routes';
import { userRouter } from './api/v1/modules/users/routes';
import { sponsorRouter } from './api/v1/modules/sponsors/routes';
import { campaignRouter } from './api/v1/modules/campaigns/routes';
import { roomRouter } from './api/v1/modules/rooms/routes';
import { billboardRouter } from './api/v1/modules/billboard/routes';
import { engagementRouter } from './api/v1/modules/engagement/routes';
import { walletRouter } from './api/v1/modules/wallet/routes';
import { marketplaceRouter } from './api/v1/modules/marketplace/routes';
import { notificationRouter } from './api/v1/modules/notifications/routes';
import { gamificationRouter } from './api/v1/modules/gamification/routes';
import { analyticsRouter } from './api/v1/modules/analytics/routes';
import { adminRouter } from './api/v1/modules/admin/routes';
import { aiRouter } from './api/v1/modules/ai/routes';

// Create Express app
export const app: Application = express();

// =====================================================
// Security Middleware
// =====================================================

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// =====================================================
// Request Parsing & Compression
// =====================================================

// Add request ID
app.use(requestId);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compress responses
app.use(compression());

// =====================================================
// Rate Limiting
// =====================================================

// Global rate limiter
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.public,
  message: {
    success: false,
    error: {
      code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.id || req.ip || 'unknown';
  },
}));

// =====================================================
// Logging
// =====================================================

// Request logging
app.use(requestLogger);

// =====================================================
// Health Check
// =====================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// =====================================================
// API Routes
// =====================================================

const apiPrefix = `${config.apiPrefix}/${config.apiVersion}`;

app.use(`${apiPrefix}/auth`, authRouter);
app.use(`${apiPrefix}/users`, userRouter);
app.use(`${apiPrefix}/sponsors`, sponsorRouter);
app.use(`${apiPrefix}/campaigns`, campaignRouter);
app.use(`${apiPrefix}/rooms`, roomRouter);
app.use(`${apiPrefix}/billboard`, billboardRouter);
app.use(`${apiPrefix}/engagement`, engagementRouter);
app.use(`${apiPrefix}/wallet`, walletRouter);
app.use(`${apiPrefix}/marketplace`, marketplaceRouter);
app.use(`${apiPrefix}/notifications`, notificationRouter);
app.use(`${apiPrefix}/gamification`, gamificationRouter);
app.use(`${apiPrefix}/analytics`, analyticsRouter);
app.use(`${apiPrefix}/admin`, adminRouter);
app.use(`${apiPrefix}/ai`, aiRouter);

// API documentation redirect
app.get('/api', (req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// =====================================================
// 404 Handler
// =====================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: ApiErrorCode.RESOURCE_NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  });
});

// =====================================================
// Error Handling Middleware
// =====================================================

app.use(errorHandler);

export default app;