/**
 * Helmet Middleware
 * Security headers for Express
 */

import helmet from 'helmet';
import { config } from '../../../config';

/**
 * Content Security Policy configuration
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    connectSrc: ["'self'", config.apiUrl || ''],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
  },
};

/**
 * Helmet middleware with custom configuration
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? cspConfig : false,

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'same-site' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true,
  },

  // Frameguard
  frameguard: { action: 'deny' },

  // Hide Powered-By
  hidePoweredBy: true,

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin-Agent-Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // X-Download-Options for IE8+
  xDownloadOptions: true,

  // X-Permitted-Cross-Domain-Policies
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
});

/**
 * Disable all security headers (for development)
 */
export const disableSecurity = (req: any, res: any, next: any) => {
  // Remove security headers for debugging
  next();
};

/**
 * Strict security headers for sensitive routes
 */
export const strictSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'none'"],
      scriptSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'none'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
});