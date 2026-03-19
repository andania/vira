/**
 * Order Controller
 * Handles HTTP requests for order operations
 */

import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class OrderController {
  /**
   * Get user orders
   */
  async getUserOrders(req: Request, res: Response) {
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

      const status = req.query.status as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const orders = await orderService.getUserOrders(userId, { status, limit, offset });

      return res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      logger.error('Error in getUserOrders:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get orders',
        },
      });
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const order = await orderService.getOrderById(orderId, userId);

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error('Error in getOrder:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Order not found',
        },
      });
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await orderService.cancelOrder(orderId, userId, reason);

      return res.json({
        success: true,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      logger.error('Error in cancelOrder:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to cancel order',
        },
      });
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(req: Request, res: Response) {
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

      const stats = await orderService.getOrderStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getOrderStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get order statistics',
        },
      });
    }
  }

  /**
   * Track order
   */
  async trackOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          shipments: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Order not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          status: order.status,
          estimatedDelivery: order.shipments?.[0]?.estimatedDelivery,
          trackingNumber: order.shipments?.[0]?.trackingNumber,
          carrier: order.shipments?.[0]?.carrier,
          history: order.statusHistory,
        },
      });
    } catch (error) {
      logger.error('Error in trackOrder:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to track order',
        },
      });
    }
  }

  /**
   * Request return
   */
  async requestReturn(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      const { reason, items } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const returnRequest = await prisma.orderReturn.create({
        data: {
          orderId,
          userId,
          reason,
          items,
          status: 'pending',
        },
      });

      return res.status(201).json({
        success: true,
        data: returnRequest,
        message: 'Return request submitted',
      });
    } catch (error) {
      logger.error('Error in requestReturn:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to request return',
        },
      });
    }
  }

  /**
   * Get seller orders (for sponsors)
   */
  async getSellerOrders(req: Request, res: Response) {
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

      const status = req.query.status as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const orders = await orderService.getSellerOrders(sponsorId, { status, limit, offset });

      return res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      logger.error('Error in getSellerOrders:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get seller orders',
        },
      });
    }
  }

  /**
   * Update order status (seller)
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const { orderId } = req.params;
      const { status, notes } = req.body;

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Verify order belongs to seller's products
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          items: {
            some: {
              product: {
                brand: {
                  sponsorId,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Order not found or not authorized',
          },
        });
      }

      const updated = await orderService.updateOrderStatus(orderId, order.userId, status, notes);

      return res.json({
        success: true,
        data: updated,
        message: 'Order status updated',
      });
    } catch (error) {
      logger.error('Error in updateOrderStatus:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update order status',
        },
      });
    }
  }
}

export const orderController = new OrderController();