/**
 * Order Repository
 * Handles database operations for orders
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type OrderCreateInput = Prisma.OrderUncheckedCreateInput;
type OrderUpdateInput = Prisma.OrderUncheckedUpdateInput;

export class OrderRepository extends BaseRepository<any, OrderCreateInput, OrderUpdateInput> {
  protected modelName = 'order';
  protected prismaModel = prisma.order;

  /**
   * Find orders by user
   */
  async findByUserId(userId: string, status?: string, limit: number = 20, offset: number = 0) {
    const where: any = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        },
        orderBy: { placedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Get order with details
   */
  async getOrderWithDetails(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) where.userId = userId;

    return prisma.order.findFirst({
      where,
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
        shipments: true,
      },
    });
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(sponsorId: string, status?: string, limit: number = 20, offset: number = 0) {
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
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: string, notes?: string) {
    const order = await prisma.order.update({
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

    return order;
  }

  /**
   * Get order statistics
   */
  async getOrderStats(userId: string) {
    const [total, pending, processing, completed, cancelled, totalSpent] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: 'pending' } }),
      prisma.order.count({ where: { userId, status: 'processing' } }),
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
      processing,
      completed,
      cancelled,
      totalSpent: totalSpent._sum.totalFiat || 0,
    };
  }

  /**
   * Get seller statistics
   */
  async getSellerStats(sponsorId: string) {
    const [totalOrders, totalRevenue, pendingOrders, completedOrders] = await Promise.all([
      prisma.order.count({
        where: {
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
      }),
      prisma.order.aggregate({
        where: {
          items: {
            some: {
              product: {
                brand: {
                  sponsorId,
                },
              },
            },
          },
          status: 'delivered',
        },
        _sum: { totalFiat: true },
      }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                brand: {
                  sponsorId,
                },
              },
            },
          },
          status: 'pending',
        },
      }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                brand: {
                  sponsorId,
                },
              },
            },
          },
          status: 'delivered',
        },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalFiat || 0,
      pendingOrders,
      completedOrders,
    };
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10) {
    return prisma.order.findMany({
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
  }

  /**
   * Get orders by date range
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date) {
    return prisma.order.findMany({
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: { placedAt: 'asc' },
    });
  }

  /**
   * Get revenue by period
   */
  async getRevenueByPeriod(startDate: Date, endDate: Date) {
    const result = await prisma.order.aggregate({
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'delivered',
      },
      _sum: {
        totalFiat: true,
      },
      _count: true,
    });

    return {
      revenue: result._sum.totalFiat || 0,
      orderCount: result._count,
    };
  }

  /**
   * Get top products by sales
   */
  async getTopProducts(limit: number = 10, startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.placedAt = {};
      if (startDate) dateFilter.placedAt.gte = startDate;
      if (endDate) dateFilter.placedAt.lte = endDate;
    }

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: dateFilter,
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts.map(p => p.productId);
    
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        priceFiat: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledReason: reason,
        },
        include: {
          items: true,
        },
      });

      // Restore inventory
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

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'cancelled',
          notes: reason,
        },
      });

      return order;
    });
  }
}

export const orderRepository = new OrderRepository();