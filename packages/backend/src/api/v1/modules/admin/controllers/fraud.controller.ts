/**
 * Fraud Controller
 * Handles HTTP requests for fraud detection operations
 */

import { Request, Response } from 'express';
import { fraudService } from '../services/fraud.service';
import { adminService } from '../services/admin.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class FraudController {
  /**
   * Get fraud alerts
   */
  async getFraudAlerts(req: Request, res: Response) {
    try {
      const {
        status,
        userId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      const alerts = await fraudService.getFraudAlerts({
        status: status as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      logger.error('Error in getFraudAlerts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get fraud alerts',
        },
      });
    }
  }

  /**
   * Get fraud alert details
   */
  async getFraudAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;

      const alerts = await fraudService.getFraudAlerts({
        limit: 1,
      });

      const alert = alerts.alerts.find(a => a.id === alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Fraud alert not found',
          },
        });
      }

      return res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      logger.error('Error in getFraudAlert:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get fraud alert',
        },
      });
    }
  }

  /**
   * Update fraud alert status
   */
  async updateAlertStatus(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      const { status, notes } = req.body;

      const alert = await fraudService.updateAlertStatus(alertId, status, notes);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'UPDATE_FRAUD_ALERT',
        resourceType: 'fraud',
        resourceId: alertId,
        details: { status, notes },
      });

      return res.json({
        success: true,
        data: alert,
        message: `Fraud alert status updated to ${status}`,
      });
    } catch (error) {
      logger.error('Error in updateAlertStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update fraud alert',
        },
      });
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(req: Request, res: Response) {
    try {
      const stats = await fraudService.getFraudStatistics();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getFraudStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get fraud statistics',
        },
      });
    }
  }

  /**
   * Analyze transaction for fraud (test endpoint)
   */
  async analyzeTransaction(req: Request, res: Response) {
    try {
      const { userId, amount, type, metadata } = req.body;

      const result = await fraudService.analyzeTransaction(userId, amount, type, metadata);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in analyzeTransaction:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to analyze transaction',
        },
      });
    }
  }

  /**
   * Get blacklisted items
   */
  async getBlacklistedItems(req: Request, res: Response) {
    try {
      const items = await fraudService.getBlacklistedItems();

      return res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Error in getBlacklistedItems:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get blacklisted items',
        },
      });
    }
  }

  /**
   * Add to blacklist
   */
  async addToBlacklist(req: Request, res: Response) {
    try {
      const { type, value, reason } = req.body;

      await fraudService.addToBlacklist(type, value, reason);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'ADD_TO_BLACKLIST',
        details: { type, value, reason },
      });

      return res.json({
        success: true,
        message: `Added ${type} to blacklist`,
      });
    } catch (error) {
      logger.error('Error in addToBlacklist:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to add to blacklist',
        },
      });
    }
  }

  /**
   * Remove from blacklist
   */
  async removeFromBlacklist(req: Request, res: Response) {
    try {
      const { type, value } = req.body;

      await fraudService.removeFromBlacklist(type, value);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'REMOVE_FROM_BLACKLIST',
        details: { type, value },
      });

      return res.json({
        success: true,
        message: `Removed ${type} from blacklist`,
      });
    } catch (error) {
      logger.error('Error in removeFromBlacklist:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to remove from blacklist',
        },
      });
    }
  }

  /**
   * Create fraud alert (test endpoint)
   */
  async createFraudAlert(req: Request, res: Response) {
    try {
      const { userId, alertType, score, details, ipAddress, deviceFingerprint } = req.body;

      const alert = await fraudService.createFraudAlert({
        userId,
        alertType,
        score,
        details,
        ipAddress,
        deviceFingerprint,
      });

      return res.status(201).json({
        success: true,
        data: alert,
        message: 'Fraud alert created',
      });
    } catch (error) {
      logger.error('Error in createFraudAlert:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create fraud alert',
        },
      });
    }
  }
}

export const fraudController = new FraudController();