/**
 * Marketplace Repository
 * Main repository for marketplace data aggregation
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export interface MarketplaceStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalSellers: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  topCategories: Array<{
    categoryId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentActivity: {
    orders: number;
    revenue: number;
    customers: number;
  };
}

export class MarketplaceRepository extends BaseRepository<any, any, any> {
  protected modelName = 'marketplace';
  protected prismaModel = prisma.marketplace;

  /**
   * Get marketplace dashboard statistics
   */
  async getDashboardStats(): Promise<MarketplaceStats> {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalProducts,
      totalOrders,
      totalRevenue,
      totalSellers,
      totalCustomers,
      recentOrders,
      recentRevenue,
      recentCustomers,
      categorySales,
      productSales,
    ] = await Promise.all([
      // Total active products
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),

      // Total completed orders
      prisma.order.count({
        where: { status: 'delivered' },
      }),

      // Total revenue
      prisma.order.aggregate({
        where: { status: 'delivered' },
        _sum: { totalFiat: true },
      }),

      // Total sellers (brands with products)
      prisma.brand.count({
        where: {
          products: {
            some: { status: 'ACTIVE' },
          },
        },
      }),

      // Total customers (users who have placed orders)
      prisma.order.groupBy({
        by: ['userId'],
        where: { status: 'delivered' },
      }).then(users => users.length),

      // Recent orders (last 30 days)
      prisma.order.count({
        where: {
          status: 'delivered',
          placedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Recent revenue (last 30 days)
      prisma.order.aggregate({
        where: {
          status: 'delivered',
          placedAt: { gte: thirtyDaysAgo },
        },
        _sum: { totalFiat: true },
      }),

      // Recent customers (last 30 days)
      prisma.order.groupBy({
        by: ['userId'],
        where: {
          status: 'delivered',
          placedAt: { gte: thirtyDaysAgo },
        },
      }).then(users => users.length),

      // Top categories by sales
      this.getTopCategories(5),

      // Top products by sales
      this.getTopProducts(5),
    ]);

    const totalRevenueValue = totalRevenue._sum.totalFiat || 0;
    const recentRevenueValue = recentRevenue._sum.totalFiat || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenueValue / totalOrders : 0;
    const conversionRate = totalCustomers > 0 ? (totalOrders / totalCustomers) * 100 : 0;

    return {
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenueValue,
      totalSellers,
      totalCustomers,
      averageOrderValue,
      conversionRate,
      topCategories: categorySales,
      topProducts: productSales,
      recentActivity: {
        orders: recentOrders,
        revenue: recentRevenueValue,
        customers: recentCustomers,
      },
    };
  }

  /**
   * Get top categories by sales
   */
  async getTopCategories(limit: number = 5): Promise<any[]> {
    const categories = await prisma.$queryRaw`
      SELECT 
        pc.id,
        pc.name,
        COUNT(DISTINCT o.id) as sales,
        COALESCE(SUM(oi.quantity * oi.unit_price_fiat), 0) as revenue
      FROM product_categories pc
      LEFT JOIN products p ON p.category_id = pc.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'delivered'
      WHERE pc.id IS NOT NULL
      GROUP BY pc.id, pc.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return (categories as any[]).map(c => ({
      categoryId: c.id,
      name: c.name,
      sales: Number(c.sales),
      revenue: Number(c.revenue),
    }));
  }

  /**
   * Get top products by sales
   */
  async getTopProducts(limit: number = 5): Promise<any[]> {
    const products = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        SUM(oi.quantity) as sales,
        SUM(oi.quantity * oi.unit_price_fiat) as revenue
      FROM products p
      JOIN order_items oi ON oi.product_id = p.id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'delivered'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return (products as any[]).map(p => ({
      productId: p.id,
      name: p.name,
      sales: Number(p.sales),
      revenue: Number(p.revenue),
    }));
  }

  /**
   * Get sales by date range
   */
  async getSalesByDateRange(startDate: Date, endDate: Date) {
    const sales = await prisma.order.groupBy({
      by: ['placedAt'],
      where: {
        status: 'delivered',
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalFiat: true,
      },
      _count: true,
      orderBy: {
        placedAt: 'asc',
      },
    });

    return sales.map(s => ({
      date: s.placedAt,
      revenue: s._sum.totalFiat || 0,
      orders: s._count,
    }));
  }

  /**
   * Get customer acquisition data
   */
  async getCustomerAcquisitionData(startDate: Date, endDate: Date) {
    const firstOrders = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        status: 'delivered',
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _min: {
        placedAt: true,
      },
    });

    // Group by date
    const acquisitionByDate = new Map();
    
    for (const order of firstOrders) {
      const date = order._min.placedAt?.toISOString().split('T')[0];
      if (date) {
        acquisitionByDate.set(date, (acquisitionByDate.get(date) || 0) + 1);
      }
    }

    return Array.from(acquisitionByDate.entries()).map(([date, count]) => ({
      date,
      newCustomers: count,
    }));
  }

  /**
   * Get seller performance
   */
  async getSellerPerformance(sponsorId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalProducts, totalOrders, totalRevenue, averageRating] = await Promise.all([
      prisma.product.count({
        where: {
          brand: {
            sponsorId,
          },
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
          placedAt: { gte: startDate },
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
          placedAt: { gte: startDate },
        },
        _sum: { totalFiat: true },
      }),
      prisma.productReview.aggregate({
        where: {
          product: {
            brand: {
              sponsorId,
            },
          },
          status: 'approved',
          createdAt: { gte: startDate },
        },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalFiat || 0,
      averageRating: averageRating._avg.rating || 0,
      period: days,
    };
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary() {
    const [totalProducts, outOfStock, lowStock, byCategory] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          stockQuantity: 0,
        },
      }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          stockQuantity: { lte: 5, gt: 0 },
        },
      }),
      prisma.product.groupBy({
        by: ['categoryId'],
        where: { status: 'ACTIVE' },
        _count: true,
        _sum: {
          stockQuantity: true,
        },
      }),
    ]);

    return {
      totalProducts,
      outOfStock,
      lowStock,
      healthyStock: totalProducts - outOfStock - lowStock,
      byCategory,
    };
  }

  /**
   * Get revenue breakdown
   */
  async getRevenueBreakdown(startDate: Date, endDate: Date) {
    const [byPaymentMethod, byCategory, daily] = await Promise.all([
      // Revenue by payment method
      prisma.orderPayment.groupBy({
        by: ['paymentMethod'],
        where: {
          order: {
            status: 'delivered',
            placedAt: { gte: startDate, lte: endDate },
          },
        },
        _sum: {
          fiatAmount: true,
        },
      }),

      // Revenue by category
      prisma.$queryRaw`
        SELECT 
          pc.name as category,
          SUM(oi.quantity * oi.unit_price_fiat) as revenue
        FROM product_categories pc
        JOIN products p ON p.category_id = pc.id
        JOIN order_items oi ON oi.product_id = p.id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'delivered'
          AND o.placed_at >= ${startDate}
          AND o.placed_at <= ${endDate}
        GROUP BY pc.name
        ORDER BY revenue DESC
      `,

      // Daily revenue
      this.getSalesByDateRange(startDate, endDate),
    ]);

    return {
      byPaymentMethod: byPaymentMethod.map(p => ({
        method: p.paymentMethod,
        amount: p._sum.fiatAmount || 0,
      })),
      byCategory,
      daily,
    };
  }

  /**
   * Get customer lifetime value
   */
  async getCustomerLTV() {
    const customers = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: 'delivered' },
      _sum: {
        totalFiat: true,
      },
      _count: true,
    });

    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c._sum.totalFiat || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + c._count, 0);

    return {
      averageLTV: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
      averageOrdersPerCustomer: totalCustomers > 0 ? totalOrders / totalCustomers : 0,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      customerSegments: {
        high: customers.filter(c => (c._sum.totalFiat || 0) > 500).length,
        medium: customers.filter(c => (c._sum.totalFiat || 0) > 100 && (c._sum.totalFiat || 0) <= 500).length,
        low: customers.filter(c => (c._sum.totalFiat || 0) <= 100).length,
      },
    };
  }

  /**
   * Get marketplace health metrics
   */
  async getHealthMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [ordersLastHour, revenueLastHour, activeCarts, conversionRate] = await Promise.all([
      prisma.order.count({
        where: {
          placedAt: { gte: oneHourAgo },
        },
      }),
      prisma.order.aggregate({
        where: {
          placedAt: { gte: oneHourAgo },
          status: 'delivered',
        },
        _sum: { totalFiat: true },
      }),
      prisma.shoppingCart.count({
        where: {
          updatedAt: { gte: oneHourAgo },
          items: {
            some: {},
          },
        },
      }),
      this.calculateConversionRate(oneDayAgo),
    ]);

    return {
      ordersLastHour,
      revenueLastHour: revenueLastHour._sum.totalFiat || 0,
      activeCarts,
      conversionRate,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate conversion rate
   */
  private async calculateConversionRate(since: Date): Promise<number> {
    const [visitors, converters] = await Promise.all([
      // Unique users who viewed products
      prisma.contentView.groupBy({
        by: ['userId'],
        where: {
          targetType: 'product',
          createdAt: { gte: since },
        },
      }).then(views => views.length),

      // Unique users who placed orders
      prisma.order.groupBy({
        by: ['userId'],
        where: {
          placedAt: { gte: since },
        },
      }).then(orders => orders.length),
    ]);

    return visitors > 0 ? (converters / visitors) * 100 : 0;
  }

  /**
   * Get product performance report
   */
  async getProductPerformanceReport(productId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [views, orders, revenue, reviews] = await Promise.all([
      prisma.contentView.count({
        where: {
          targetType: 'product',
          targetId: productId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.orderItem.count({
        where: {
          productId,
          order: {
            status: 'delivered',
            placedAt: { gte: startDate },
          },
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          productId,
          order: {
            status: 'delivered',
            placedAt: { gte: startDate },
          },
        },
        _sum: {
          totalPriceFiat: true,
        },
      }),
      prisma.productReview.count({
        where: {
          productId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    return {
      productId,
      period: days,
      views,
      orders,
      revenue: revenue._sum.totalPriceFiat || 0,
      reviews,
      conversionRate: views > 0 ? (orders / views) * 100 : 0,
    };
  }

  /**
   * Get category performance
   */
  async getCategoryPerformance(categoryId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [products, sales, revenue] = await Promise.all([
      prisma.product.count({
        where: {
          categoryId,
          status: 'ACTIVE',
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          product: {
            categoryId,
          },
          order: {
            status: 'delivered',
            placedAt: { gte: startDate },
          },
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          product: {
            categoryId,
          },
          order: {
            status: 'delivered',
            placedAt: { gte: startDate },
          },
        },
        _sum: {
          totalPriceFiat: true,
        },
      }),
    ]);

    return {
      categoryId,
      products,
      sales: sales._sum.quantity || 0,
      revenue: revenue._sum.totalPriceFiat || 0,
    };
  }

  /**
   * Clear marketplace cache
   */
  async clearCache(): Promise<void> {
    // This would be handled by Redis
    return Promise.resolve();
  }
}

export const marketplaceRepository = new MarketplaceRepository();