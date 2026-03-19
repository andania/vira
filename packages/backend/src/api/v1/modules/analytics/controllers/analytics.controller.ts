/**
 * Analytics Controller
 * Handles HTTP requests for analytics operations
 */

import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { reportingService } from '../services/reporting.service';
import { exportService } from '../services/export.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AnalyticsController {
  /**
   * Track an analytics event
   */
  async trackEvent(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventType, properties } = req.body;

      if (!eventType) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Event type is required',
          },
        });
      }

      await analyticsService.trackEvent({
        userId,
        eventType,
        properties,
      });

      return res.status(202).json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error) {
      logger.error('Error in trackEvent:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to track event',
        },
      });
    }
  }

  /**
   * Track multiple events in batch
   */
  async trackEvents(req: Request, res: Response) {
    try {
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Events array is required',
          },
        });
      }

      const userId = req.user?.id;
      const enrichedEvents = events.map(event => ({
        userId,
        ...event,
      }));

      await analyticsService.trackEvents(enrichedEvents);

      return res.status(202).json({
        success: true,
        message: `${events.length} events tracked successfully`,
      });
    } catch (error) {
      logger.error('Error in trackEvents:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to track events',
        },
      });
    }
  }

  /**
   * Query analytics data
   */
  async query(req: Request, res: Response) {
    try {
      const { startDate, endDate, interval, filters, groupBy } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Start date and end date are required',
          },
        });
      }

      const data = await analyticsService.query({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        interval,
        filters,
        groupBy,
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in query:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to query analytics',
        },
      });
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealtime(req: Request, res: Response) {
    try {
      const data = await analyticsService.getRealtimeAnalytics();

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getRealtime:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get real-time analytics',
        },
      });
    }
  }

  /**
   * Get active users count
   */
  async getActiveUsers(req: Request, res: Response) {
    try {
      const { period = 'today' } = req.query;

      const count = await analyticsService.getActiveUsers(period as any);

      return res.json({
        success: true,
        data: { period, count },
      });
    } catch (error) {
      logger.error('Error in getActiveUsers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get active users',
        },
      });
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(req: Request, res: Response) {
    try {
      const userId = req.params.userId || req.user?.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'User ID is required',
          },
        });
      }

      const data = await analyticsService.getUserAnalytics(userId, days);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getUserAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user analytics',
        },
      });
    }
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const data = await analyticsService.getPlatformAnalytics(days);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getPlatformAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get platform analytics',
        },
      });
    }
  }

  /**
   * Export analytics data
   */
  async export(req: Request, res: Response) {
    try {
      const { startDate, endDate, interval, filters, groupBy, format = 'json' } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Start date and end date are required',
          },
        });
      }

      const data = await analyticsService.exportAnalytics({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        interval,
        filters,
        groupBy,
      }, format);

      if (format === 'json') {
        return res.json({
          success: true,
          data,
        });
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${Date.now()}.${format}`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Error in export:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to export analytics',
        },
      });
    }
  }
}

export const analyticsController = new AnalyticsController();