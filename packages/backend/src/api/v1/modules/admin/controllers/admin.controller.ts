/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { userManagementService } from '../services/user-management.service';
import { moderationService } from '../services/moderation.service';
import { fraudService } from '../services/fraud.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AdminController {
  /**
   * Get system health
   */
  async getSystemHealth(req: Request, res: Response) {
    try {
      const health = await adminService.getSystemHealth();

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error in getSystemHealth:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get system health',
        },
      });
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(req: Request, res: Response) {
    try {
      const stats = await adminService.getPlatformStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getPlatformStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get platform statistics',
        },
      });
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(req: Request, res: Response) {
    try {
      const summary = await adminService.getDashboardSummary();

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error in getDashboardSummary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get dashboard summary',
        },
      });
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        userId,
        action,
        resourceType,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      const logs = await adminService.getAuditLogs({
        userId: userId as string,
        action: action as string,
        resourceType: resourceType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Error in getAuditLogs:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get audit logs',
        },
      });
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(req: Request, res: Response) {
    try {
      const config = await adminService.getSystemConfig();

      return res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error in getSystemConfig:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get system configuration',
        },
      });
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(req: Request, res: Response) {
    try {
      const { settings } = req.body;

      await adminService.updateSystemConfig(settings);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'UPDATE_CONFIG',
        details: { settings: Object.keys(settings) },
      });

      return res.json({
        success: true,
        message: 'System configuration updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateSystemConfig:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update system configuration',
        },
      });
    }
  }

  /**
   * Get jobs status
   */
  async getJobsStatus(req: Request, res: Response) {
    try {
      const status = await adminService.getJobsStatus();

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Error in getJobsStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get jobs status',
        },
      });
    }
  }

  /**
   * Clear cache
   */
  async clearCache(req: Request, res: Response) {
    try {
      const { type } = req.body;

      await adminService.clearCache(type);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'CLEAR_CACHE',
        details: { type },
      });

      return res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      logger.error('Error in clearCache:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to clear cache',
        },
      });
    }
  }

  /**
   * Run maintenance task
   */
  async runMaintenance(req: Request, res: Response) {
    try {
      const { task } = req.params;

      await adminService.runMaintenance(task);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'RUN_MAINTENANCE',
        details: { task },
      });

      return res.json({
        success: true,
        message: `Maintenance task '${task}' completed successfully`,
      });
    } catch (error) {
      logger.error('Error in runMaintenance:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to run maintenance task',
        },
      });
    }
  }
}

export const adminController = new AdminController();