/**
 * Report Controller
 * Handles HTTP requests for report operations
 */

import { Request, Response } from 'express';
import { reportingService } from '../services/reporting.service';
import { exportService } from '../services/export.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ReportController {
  /**
   * Create a new report
   */
  async createReport(req: Request, res: Response) {
    try {
      const { name, type, format, schedule, recipients, filters, metrics } = req.body;

      if (!name || !type || !format || !filters || !metrics) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Name, type, format, filters, and metrics are required',
          },
        });
      }

      const report = await reportingService.createReport({
        name,
        type,
        format,
        schedule,
        recipients,
        filters,
        metrics,
      });

      return res.status(201).json({
        success: true,
        data: report,
        message: 'Report created successfully',
      });
    } catch (error) {
      logger.error('Error in createReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create report',
        },
      });
    }
  }

  /**
   * Get list of reports
   */
  async getReports(req: Request, res: Response) {
    try {
      const type = req.query.type as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const reports = await reportingService.getReports({
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      logger.error('Error in getReports:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get reports',
        },
      });
    }
  }

  /**
   * Get report by ID
   */
  async getReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;

      const reports = await reportingService.getReports({
        limit: 1,
      });

      const report = reports.reports.find(r => r.id === reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Report not found',
          },
        });
      }

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error in getReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get report',
        },
      });
    }
  }

  /**
   * Delete report
   */
  async deleteReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;

      await reportingService.deleteReport(reportId);

      return res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete report',
        },
      });
    }
  }

  /**
   * Download report file
   */
  async downloadReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;

      const reports = await reportingService.getReports({
        limit: 1,
      });

      const report = reports.reports.find(r => r.id === reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Report not found',
          },
        });
      }

      // Redirect to file URL
      return res.redirect(report.url);
    } catch (error) {
      logger.error('Error in downloadReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to download report',
        },
      });
    }
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(req: Request, res: Response) {
    try {
      const { reportId, schedule, recipients } = req.body;

      if (!reportId || !schedule) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Report ID and schedule are required',
          },
        });
      }

      // This would update an existing report with schedule settings
      // For now, just acknowledge
      logger.info(`Report ${reportId} scheduled: ${schedule}`);

      return res.json({
        success: true,
        message: `Report scheduled ${schedule}`,
      });
    } catch (error) {
      logger.error('Error in scheduleReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to schedule report',
        },
      });
    }
  }

  /**
   * Get report templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const templates = [
        {
          id: 'user-summary',
          name: 'User Summary Report',
          type: 'user',
          description: 'Overview of user activity, growth, and engagement',
          metrics: ['newUsers', 'activeUsers', 'retention', 'geoDistribution'],
        },
        {
          id: 'campaign-performance',
          name: 'Campaign Performance Report',
          type: 'campaign',
          description: 'Detailed analysis of campaign metrics and ROI',
          metrics: ['impressions', 'clicks', 'conversions', 'spend', 'roi'],
        },
        {
          id: 'financial-summary',
          name: 'Financial Summary Report',
          type: 'financial',
          description: 'Revenue, deposits, withdrawals, and transaction analysis',
          metrics: ['deposits', 'withdrawals', 'revenue', 'transactions'],
        },
        {
          id: 'engagement-analysis',
          name: 'Engagement Analysis Report',
          type: 'engagement',
          description: 'User engagement patterns and trends',
          metrics: ['totalEngagements', 'byType', 'hourlyDistribution', 'topContent'],
        },
        {
          id: 'custom',
          name: 'Custom Report',
          type: 'custom',
          description: 'Build your own report with custom metrics',
          metrics: ['users', 'campaigns', 'financial', 'engagement'],
        },
      ];

      return res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('Error in getTemplates:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get report templates',
        },
      });
    }
  }
}

export const reportController = new ReportController();