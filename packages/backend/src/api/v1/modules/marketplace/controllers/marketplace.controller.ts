/**
 * Marketplace Controller
 * Main controller for marketplace operations
 */

import { Request, Response } from 'express';
import { marketplaceService } from '../services/marketplace.service';
import { productService } from '../services/product.service';
import { orderService } from '../services/order.service';
import { cartService } from '../services/cart.service';
import { reviewService } from '../services/review.service';
import { wishlistService } from '../services/wishlist.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class MarketplaceController {
  /**
   * Get marketplace dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await marketplaceService.getDashboardStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getDashboardStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get marketplace statistics',
        },
      });
    }
  }

  /**
   * Process checkout
   */
  async checkout(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const { shippingAddressId, billingAddressId, paymentMethod, notes, discountCode } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Payment method is required',
          },
        });
      }

      const result = await marketplaceService.checkout(userId, {
        shippingAddressId,
        billingAddressId,
        paymentMethod,
        notes,
        discountCode,
      });

      return res.json({
        success: true,
        data: result,
        message: 'Checkout completed successfully',
      });
    } catch (error) {
      logger.error('Error in checkout:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Checkout failed',
        },
      });
    }
  }

  /**
   * Get user's marketplace activity
   */
  async getUserActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const activity = await marketplaceService.getUserActivity(userId);

      return res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Error in getUserActivity:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user activity',
        },
      });
    }
  }

  /**
   * Get seller dashboard
   */
  async getSellerDashboard(req: Request, res: Response) {
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

      // Check if user is a sponsor
      const sponsor = await prisma.sponsor.findUnique({
        where: { id: sponsorId },
      });

      if (!sponsor) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Seller access required',
          },
        });
      }

      const dashboard = await marketplaceService.getSellerDashboard(sponsorId);

      return res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error('Error in getSellerDashboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get seller dashboard',
        },
      });
    }
  }

  /**
   * Search marketplace with facets
   */
  async search(req: Request, res: Response) {
    try {
      const {
        q,
        category,
        minPrice,
        maxPrice,
        brands,
        inStock,
        sortBy,
        limit = 20,
        offset = 0,
      } = req.query;

      const results = await marketplaceService.searchWithFacets({
        query: q as string,
        category: category as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        brands: brands ? (brands as string).split(',') : undefined,
        inStock: inStock === 'true',
        sortBy: sortBy as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in search:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to search marketplace',
        },
      });
    }
  }

  /**
   * Import products (bulk)
   */
  async importProducts(req: Request, res: Response) {
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

      const { products } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Products array is required',
          },
        });
      }

      const results = await marketplaceService.importProducts(sponsorId, products);

      return res.json({
        success: true,
        data: results,
        message: `Imported ${results.success} products, ${results.failed} failed`,
      });
    } catch (error) {
      logger.error('Error in importProducts:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to import products',
        },
      });
    }
  }

  /**
   * Export products
   */
  async exportProducts(req: Request, res: Response) {
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

      const format = req.query.format as string || 'json';

      const data = await marketplaceService.exportProducts(sponsorId, format as any);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
        return res.send(data);
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in exportProducts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to export products',
        },
      });
    }
  }

  /**
   * Get marketplace health
   */
  async getHealth(req: Request, res: Response) {
    try {
      const health = await marketplaceService.getHealth();

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error in getHealth:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get marketplace health',
        },
      });
    }
  }

  /**
   * Get featured products
   */
  async getFeatured(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const products = await productService.getFeaturedProducts(limit);

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Error in getFeatured:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get featured products',
        },
      });
    }
  }

  /**
   * Get categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await productService.getCategories();

      return res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error in getCategories:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get categories',
        },
      });
    }
  }

  /**
   * Get recent orders (admin only)
   */
  async getRecentOrders(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const orders = await prisma.order.findMany({
        where: {
          status: { not: 'cancelled' },
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
            },
          },
          items: {
            take: 1,
          },
        },
        orderBy: { placedAt: 'desc' },
        take: limit,
      });

      return res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      logger.error('Error in getRecentOrders:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get recent orders',
        },
      });
    }
  }

  /**
   * Get top products
   */
  async getTopProducts(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { soldCount: 'desc' },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
        },
        take: limit,
      });

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Error in getTopProducts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get top products',
        },
      });
    }
  }

  /**
   * Get marketplace summary
   */
  async getSummary(req: Request, res: Response) {
    try {
      const [stats, featured, categories, topProducts] = await Promise.all([
        marketplaceService.getDashboardStats(),
        productService.getFeaturedProducts(5),
        productService.getCategories(),
        this.getTopProductsData(5),
      ]);

      return res.json({
        success: true,
        data: {
          stats,
          featured,
          categories,
          topProducts,
        },
      });
    } catch (error) {
      logger.error('Error in getSummary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get marketplace summary',
        },
      });
    }
  }

  /**
   * Helper to get top products data
   */
  private async getTopProductsData(limit: number) {
    return prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { soldCount: 'desc' },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        brand: {
          select: {
            name: true,
          },
        },
      },
      take: limit,
    });
  }

  /**
   * Get seller stats
   */
  async getSellerStats(req: Request, res: Response) {
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

      const stats = await marketplaceService.getSellerDashboard(sponsorId);

      return res.json({
        success: true,
        data: stats.stats,
      });
    } catch (error) {
      logger.error('Error in getSellerStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get seller statistics',
        },
      });
    }
  }

  /**
   * Update product status (bulk)
   */
  async bulkUpdateProducts(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { productIds, status } = req.body;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!productIds || !Array.isArray(productIds) || !status) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Product IDs and status are required',
          },
        });
      }

      const result = await prisma.product.updateMany({
        where: {
          id: { in: productIds },
          brand: {
            sponsorId,
          },
        },
        data: { status },
      });

      return res.json({
        success: true,
        data: result,
        message: `Updated ${result.count} products`,
      });
    } catch (error) {
      logger.error('Error in bulkUpdateProducts:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update products',
        },
      });
    }
  }
}

export const marketplaceController = new MarketplaceController();