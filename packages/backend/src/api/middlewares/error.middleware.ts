/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return ApiErrorCode.VALIDATION_ERROR;
      case 401: return ApiErrorCode.UNAUTHORIZED;
      case 403: return ApiErrorCode.INSUFFICIENT_PERMISSIONS;
      case 404: return ApiErrorCode.RESOURCE_NOT_FOUND;
      case 409: return ApiErrorCode.RESOURCE_CONFLICT;
      case 422: return ApiErrorCode.VALIDATION_ERROR;
      case 429: return ApiErrorCode.RATE_LIMIT_EXCEEDED;
      case 500: return ApiErrorCode.INTERNAL_SERVER_ERROR;
      case 503: return ApiErrorCode.SERVICE_UNAVAILABLE;
      default: return ApiErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}

/**
 * Not Found Middleware
 * Handles 404 errors for undefined routes
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(
    `Cannot ${req.method} ${req.path}`,
    404,
    ApiErrorCode.RESOURCE_NOT_FOUND
  );
  next(error);
};

/**
 * Error Handler Middleware
 * Central error handling logic
 */
export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = ApiErrorCode.INTERNAL_SERVER_ERROR;
  let details = undefined;

  // If it's our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Log error
  logger.error(`${statusCode} - ${message}`, {
    error: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: req.id,
    },
  });
};

/**
 * Async handler wrapper to catch errors
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors: any[]) => {
  return new ApiError(
    'Validation failed',
    400,
    ApiErrorCode.VALIDATION_ERROR,
    errors
  );
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any) => {
  logger.error('Database error:', error);

  // Handle Prisma specific errors
  if (error.code === 'P2002') {
    return new ApiError(
      'Duplicate entry',
      409,
      ApiErrorCode.DUPLICATE_VALUE,
      { field: error.meta?.target }
    );
  }

  if (error.code === 'P2025') {
    return new ApiError(
      'Record not found',
      404,
      ApiErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return new ApiError(
    'Database error occurred',
    500,
    ApiErrorCode.DATABASE_ERROR
  );
};

/**
 * Rate limit error handler
 */
export const handleRateLimitError = (retryAfter?: number) => {
  const error = new ApiError(
    'Too many requests',
    429,
    ApiErrorCode.RATE_LIMIT_EXCEEDED
  );
  error.details = { retryAfter };
  return error;
};