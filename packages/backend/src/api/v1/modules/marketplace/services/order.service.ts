/**
 * Order Service
 * Handles order processing and management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { walletService } from '../../wallet/services/wallet.service';

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface OrderData {
  userId: string;
  items: OrderItem[];
  shippingAddressId?: string;
  billingAddressId?: string;
  paymentMethod: string;
  notes?: string;
}

export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(data: OrderData) {
    try {
      const { userId, items, shippingAddressId, billingAddressId, paymentMethod, notes } = data;

      // Validate items and calculate totals
      const orderItems = [];
      let subtotalCap = 0;
      let subtotalFiat = 0;

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { brand: true },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.status !== 'ACTIVE') {
          throw new Error(`Product ${product.name} is not available`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        orderItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          productName: product.name,
          sku: product.sku,
          unitPriceCap: product.priceCap,
          unitPriceFiat: product.priceFiat,
        });

        if (product.priceCap) {
          subtotalCap += product.priceCap * item.quantity;
        }
        if (product.priceFiat) {
          subtotalFiat += product.priceFiat * item.quantity;
        }
      }

      // Calculate shipping (simplified)
      const shippingFiat = subtotalFiat > 50 ? 0 : 5.99;
      const shippingCap = subtotalCap > 5000 ? 0 : 600;

      // Calculate tax (simplified)
      const taxFiat = subtotalFiat * 0.1; // 10% tax
      const taxCap = subtotalCap * 0.1;

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'pending',
            subtotalCap,
            subtotalFiat,
            shippingCap,
            shippingFiat,
            taxCap,
            taxFiat,
            totalCap: subtotalCap + shippingCap + taxCap,
            totalFiat: subtotalFiat + shippingFiat + taxFiat,
            currency: 'USD',
            paymentMethod,
            shippingAddressId,
            billingAddressId,
            notes,
          },
        });

        // Create order items
        for (const item of orderItems) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ...item,
            },
          });

          // Update inventory
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
              soldCount: {
                increment: item.quantity,
              },
            },
          });
        }

        return newOrder;
      });

      logger.info(`Order created: ${orderNumber} for user ${userId}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId: string) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
          shippingAddress: true,
          billingAddress: true,
          payments: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      logger.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(
    userId: string,
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { status, limit = 20, offset = 0 } = filters;

      const where: any = { userId };
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              take: 1,
              include: {
                product: {
                  include: {
                    images: {
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
          orderBy: { placedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, userId: string, status: string, notes?: string) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Update order
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Add to status history
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status,
          notes,
        },
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '📦 Order Status Updated',
        body: `Your order #${order.orderNumber} is now ${status}`,
        data: {
          screen: 'orders',
          action: 'view',
          id: orderId,
        },
      });

      logger.info(`Order ${orderId} status updated to ${status}`);
      return updated;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
          status: { in: ['pending', 'processing'] },
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error('Order cannot be cancelled');
      }

      // Restore inventory
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
              soldCount: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledReason: reason,
          },
        });

        // Add to status history
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'cancelled',
            notes: reason,
          },
        });
      });

      // Process refund if payment was made
      if (order.paymentStatus === 'paid') {
        await this.processRefund(orderId, userId, 'full', reason);
      }

      // Send notification
      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '❌ Order Cancelled',
        body: `Your order #${order.orderNumber} has been cancelled`,
        data: {
          screen: 'orders',
          action: 'view',
          id: orderId,
        },
      });

      logger.info(`Order ${orderId} cancelled`);
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: string, userId: string, type: 'full' | 'partial', reason?: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      let refundAmount = order.totalFiat;
      if (type === 'partial') {
        refundAmount = order.totalFiat * 0.5; // 50% partial refund
      }

      // Create refund record
      const refund = await prisma.orderReturn.create({
        data: {
          orderId,
          userId,
          reason: reason || 'Customer requested',
          items: order.items,
          status: 'pending',
          refundAmountFiat: refundAmount,
        },
      });

      // If payment was by CAP, return CAP to wallet
      if (order.payments.some(p => p.paymentType === 'cap')) {
        await walletService.deposit({
          userId,
          amount: order.totalCap,
          currency: 'USD',
          paymentMethod: 'system',
          paymentProvider: 'system',
          transactionId: `refund-${orderId}`,
        });
      }

      logger.info(`Refund processed for order ${orderId}: $${refundAmount}`);
      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(userId: string) {
    try {
      const [total, pending, completed, cancelled, totalSpent] = await Promise.all([
        prisma.order.count({ where: { userId } }),
        prisma.order.count({ where: { userId, status: 'pending' } }),
        prisma.order.count({ where: { userId, status: 'delivered' } }),
        prisma.order.count({ where: { userId, status: 'cancelled' } }),
        prisma.order.aggregate({
          where: { userId, status: 'delivered' },
          _sum: { totalFiat: true },
        }),
      ]);

      return {
        total,
        pending,
        completed,
        cancelled,
        totalSpent: totalSpent._sum.totalFiat || 0,
      };
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }

  /**
   * Track order shipment
   */
  async trackShipment(orderId: string, trackingNumber: string, carrier: string) {
    try {
      const shipment = await prisma.orderShipment.upsert({
        where: { orderId },
        update: {
          trackingNumber,
          carrier,
          shippingMethod: 'standard',
        },
        create: {
          orderId,
          trackingNumber,
          carrier,
          shippingMethod: 'standard',
        },
      });

      logger.info(`Shipment tracked for order ${orderId}: ${trackingNumber}`);
      return shipment;
    } catch (error) {
      logger.error('Error tracking shipment:', error);
      throw error;
    }
  }

  /**
   * Get seller orders (for sponsors)
   */
  async getSellerOrders(
    sponsorId: string,
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { status, limit = 20, offset = 0 } = filters;

      const where: any = {
        items: {
          some: {
            product: {
              brand: {
                sponsorId,
              },
            },
          },
        },
      };

      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
            items: {
              where: {
                product: {
                  brand: {
                    sponsorId,
                  },
                },
              },
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
          orderBy: { placedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error getting seller orders:', error);
      throw error;
    }
  }
}

export const orderService = new OrderService();