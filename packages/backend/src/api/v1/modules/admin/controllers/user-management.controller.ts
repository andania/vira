/**
 * User Management Controller
 * Handles HTTP requests for user management operations
 */

import { Request, Response } from 'express';
import { userManagementService } from '../services/user-management.service';
import { adminService } from '../services/admin.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class UserManagementController {
  /**
   * Get all users
   */
  async getUsers(req: Request, res: Response) {
    try {
      const {
        status,
        accountType,
        search,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const result = await userManagementService.getUsers({
        status: status as string,
        accountType: accountType as string,
        search: search as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getUsers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get users',
        },
      });
    }
  }

  /**
   * Get user details
   */
  async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await userManagementService.getUserDetails(userId);

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error in getUserDetails:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'User not found',
        },
      });
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const user = await userManagementService.updateUserStatus(userId, status, reason);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'UPDATE_USER_STATUS',
        resourceType: 'user',
        resourceId: userId,
        details: { status, reason },
      });

      return res.json({
        success: true,
        data: user,
        message: `User status updated to ${status}`,
      });
    } catch (error) {
      logger.error('Error in updateUserStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update user status',
        },
      });
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const user = await userManagementService.updateUserRole(userId, role);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'UPDATE_USER_ROLE',
        resourceType: 'user',
        resourceId: userId,
        details: { role },
      });

      return res.json({
        success: true,
        data: user,
        message: `User role updated to ${role}`,
      });
    } catch (error) {
      logger.error('Error in updateUserRole:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update user role',
        },
      });
    }
  }

  /**
   * Verify user
   */
  async verifyUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { type } = req.body;

      const user = await userManagementService.verifyUser(userId, type);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'VERIFY_USER',
        resourceType: 'user',
        resourceId: userId,
        details: { type },
      });

      return res.json({
        success: true,
        data: user,
        message: `User ${type} verified`,
      });
    } catch (error) {
      logger.error('Error in verifyUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to verify user',
        },
      });
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body;

      const user = await userManagementService.suspendUser(userId, reason, duration);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'SUSPEND_USER',
        resourceType: 'user',
        resourceId: userId,
        details: { reason, duration },
      });

      return res.json({
        success: true,
        data: user,
        message: 'User suspended successfully',
      });
    } catch (error) {
      logger.error('Error in suspendUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to suspend user',
        },
      });
    }
  }

  /**
   * Unsuspend user
   */
  async unsuspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await userManagementService.unsuspendUser(userId);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'UNSUSPEND_USER',
        resourceType: 'user',
        resourceId: userId,
      });

      return res.json({
        success: true,
        data: user,
        message: 'User unsuspended successfully',
      });
    } catch (error) {
      logger.error('Error in unsuspendUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to unsuspend user',
        },
      });
    }
  }

  /**
   * Ban user
   */
  async banUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, permanent = true } = req.body;

      const user = await userManagementService.banUser(userId, reason, permanent);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'BAN_USER',
        resourceType: 'user',
        resourceId: userId,
        details: { reason, permanent },
      });

      return res.json({
        success: true,
        data: user,
        message: 'User banned successfully',
      });
    } catch (error) {
      logger.error('Error in banUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to ban user',
        },
      });
    }
  }

  /**
   * Delete user (GDPR)
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      await userManagementService.deleteUser(userId);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'DELETE_USER',
        resourceType: 'user',
        resourceId: userId,
      });

      return res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to delete user',
        },
      });
    }
  }

  /**
   * Get user reports
   */
  async getUserReports(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const reports = await userManagementService.getUserReports(userId, limit, offset);

      return res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      logger.error('Error in getUserReports:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user reports',
        },
      });
    }
  }

  /**
   * Get user growth chart
   */
  async getUserGrowth(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const data = await userManagementService.getUserGrowth(days);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getUserGrowth:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user growth data',
        },
      });
    }
  }

  /**
   * Export user data (GDPR)
   */
  async exportUserData(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const data = await userManagementService.exportUserData(userId);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in exportUserData:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to export user data',
        },
      });
    }
  }

  /**
   * Get user statistics summary
   */
  async getUserStatsSummary(req: Request, res: Response) {
    try {
      const stats = await userManagementService.getUserStatsSummary();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getUserStatsSummary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user statistics',
        },
      });
    }
  }
}

export const userManagementController = new UserManagementController();