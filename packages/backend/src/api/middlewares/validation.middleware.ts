/**
 * Validation Middleware
 * Request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../../../core/logger';
import { ApiError, handleValidationError } from './error.middleware';

/**
 * Validate request against Zod schema
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request against schema
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request properties with validated data
      req.body = validated.body;
      req.query = validated.query as any;
      req.params = validated.params as any;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.debug('Validation failed:', errors);
        next(handleValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request body only
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        next(handleValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request query only
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        next(handleValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request params only
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        next(handleValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Sanitize input data
 */
export const sanitize = (options: {
  stripUnknown?: boolean;
  trimStrings?: boolean;
  escapeHtml?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { stripUnknown = true, trimStrings = true, escapeHtml = false } = options;

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        let sanitized = value;
        if (trimStrings) {
          sanitized = sanitized.trim();
        }
        if (escapeHtml) {
          sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        return sanitized;
      }
      if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
      }
      if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            sanitized[key] = sanitizeValue(value[key]);
          }
        }
        return sanitized;
      }
      return value;
    };

    // Sanitize body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    next();
  };
};