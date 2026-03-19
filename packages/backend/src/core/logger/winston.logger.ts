/**
 * Winston Logger Configuration
 * Structured logging with multiple transports and formats
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../../config';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return `${timestamp} [${level}]: ${stack || message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Determine log level based on environment
const getLogLevel = (): string => {
  if (config.nodeEnv === 'production') return 'info';
  if (config.nodeEnv === 'test') return 'error';
  return 'debug';
};

// Create transports array
const getTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      level: getLogLevel(),
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        colorize({ all: true }),
        devFormat
      ),
    }),
  ];

  // File transports for production
  if (config.nodeEnv === 'production') {
    // Error log rotation
    transports.push(
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(
          errors({ stack: true }),
          timestamp(),
          json()
        ),
      })
    );

    // Combined log rotation
    transports.push(
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(
          errors({ stack: true }),
          timestamp(),
          json()
        ),
      })
    );

    // Audit log (for compliance)
    transports.push(
      new DailyRotateFile({
        filename: 'logs/audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        maxSize: '20m',
        maxFiles: '90d',
        format: combine(
          timestamp(),
          json()
        ),
      })
    );
  }

  return transports;
};

// Create and configure logger
export const createLogger = (): winston.Logger => {
  const logger = winston.createLogger({
    level: getLogLevel(),
    defaultMeta: {
      service: 'viraz-backend',
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    },
    format: combine(
      errors({ stack: true }),
      timestamp(),
      json()
    ),
    transports: getTransports(),
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
    exitOnError: false,
  });

  return logger;
};

// Create default logger instance
export const logger = createLogger();

// Export convenience methods with additional context
export const log = {
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  error: (message: string, error?: any, meta?: any) => {
    if (error instanceof Error) {
      logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...meta,
      });
    } else {
      logger.error(message, { error, ...meta });
    }
  },
  audit: (action: string, userId: string, details: any) => {
    logger.info('AUDIT', {
      type: 'audit',
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
    });
  },
  api: (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
    logger.info('API', {
      type: 'api',
      method,
      path,
      statusCode,
      duration,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
  db: (query: string, duration: number, params?: any) => {
    if (config.nodeEnv === 'development') {
      logger.debug('DB', {
        type: 'database',
        query,
        duration,
        params,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

export default logger;