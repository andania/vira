/**
 * Express Type Definitions
 * Extends Express Request interface
 */

import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
      id: string;
      startTime: number;
      traceId?: string;
      spanId?: string;
      rateLimitSkipped?: boolean;
      targetUser?: User;
      brand?: any;
      campaign?: any;
      room?: any;
      ad?: any;
      report?: any;
      fraudAlert?: any;
    }

    interface Response {
      success: (data?: any, message?: string) => Response;
      error: (message: string, code?: string, status?: number) => Response;
      paginate: (data: any[], total: number, page: number, limit: number) => Response;
    }
  }
}

// Extend Express Response with custom methods
export interface CustomResponse extends Express.Response {
  success(data?: any, message?: string): Express.Response;
  error(message: string, code?: string, status?: number): Express.Response;
  paginate(data: any[], total: number, page: number, limit: number): Express.Response;
}

// Extend Express Request with custom properties
export interface CustomRequest extends Express.Request {
  user?: User;
  session?: any;
  id: string;
  startTime: number;
  traceId?: string;
  spanId?: string;
  rateLimitSkipped?: boolean;
  targetUser?: User;
  brand?: any;
  campaign?: any;
  room?: any;
  ad?: any;
  report?: any;
  fraudAlert?: any;
}

// Express middleware types
export type ExpressMiddleware = (
  req: CustomRequest,
  res: CustomResponse,
  next: (error?: any) => void
) => void | Promise<void>;

export type ExpressErrorMiddleware = (
  error: any,
  req: CustomRequest,
  res: CustomResponse,
  next: (error?: any) => void
) => void | Promise<void>;