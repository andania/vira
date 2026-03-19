/**
 * Sponsor Controller
 * Handles HTTP requests for sponsor operations
 */

import { Request, Response } from 'express';
import { sponsorService } from '../services/sponsor.service';
import { brandService } from '../services/brand.service';
import { verificationService } from '../services/verification.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class SponsorController {
  /**
   * Get sponsor profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const profile = await sponsorService.getSponsorProfile(sponsorId);

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error in getProfile:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get sponsor profile',
        },
      });
    }
  }

  /**
   * Update sponsor profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const profile = await sponsorService.updateSponsorProfile(sponsorId, req.body);

      return res.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update profile',
        },
      });
    }
  }

  /**
   * Get sponsor statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const stats = await sponsorService.getSponsorStats(sponsorId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get sponsor statistics',
        },
      });
    }
  }

  /**
   * Get sponsor brands
   */
  async getBrands(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const brands = await sponsorService.getSponsorBrands(sponsorId);

      return res.json({
        success: true,
        data: brands,
      });
    } catch (error) {
      logger.error('Error in getBrands:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brands',
        },
      });
    }
  }

  /**
   * Create brand
   */
  async createBrand(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const brand = await sponsorService.createBrand(sponsorId, req.body);

      return res.status(201).json({
        success: true,
        data: brand,
        message: 'Brand created successfully',
      });
    } catch (error) {
      logger.error('Error in createBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create brand',
        },
      });
    }
  }

  /**
   * Update brand
   */
  async updateBrand(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const brand = await sponsorService.updateBrand(brandId, sponsorId, req.body);

      return res.json({
        success: true,
        data: brand,
        message: 'Brand updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update brand',
        },
      });
    }
  }

  /**
   * Delete brand
   */
  async deleteBrand(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { brandId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await sponsorService.deleteBrand(brandId, sponsorId);

      return res.json({
        success: true,
        message: 'Brand deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteBrand:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete brand',
        },
      });
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const methods = await sponsorService.getPaymentMethods(sponsorId);

      return res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Error in getPaymentMethods:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get payment methods',
        },
      });
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const method = await sponsorService.addPaymentMethod(sponsorId, req.body);

      return res.status(201).json({
        success: true,
        data: method,
        message: 'Payment method added successfully',
      });
    } catch (error) {
      logger.error('Error in addPaymentMethod:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to add payment method',
        },
      });
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { methodId } = req.params;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await sponsorService.removePaymentMethod(methodId, sponsorId);

      return res.json({
        success: true,
        message: 'Payment method removed successfully',
      });
    } catch (error) {
      logger.error('Error in removePaymentMethod:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove payment method',
        },
      });
    }
  }

  /**
   * Get transactions
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const transactions = await sponsorService.getTransactions(sponsorId, limit, offset);

      return res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get transactions',
        },
      });
    }
  }

  /**
   * Get invoices
   */
  async getInvoices(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const invoices = await sponsorService.getInvoices(sponsorId, limit, offset);

      return res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      logger.error('Error in getInvoices:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get invoices',
        },
      });
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const dashboard = await sponsorService.getDashboardData(sponsorId);

      return res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error('Error in getDashboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get dashboard data',
        },
      });
    }
  }
}

export const sponsorController = new SponsorController();