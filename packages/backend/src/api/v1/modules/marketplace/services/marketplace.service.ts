/**
 * Marketplace Service
 * Main service orchestrating all marketplace features
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { productService } from './product.service';
import { orderService } from './order.service';
import { cartService } from './cart.service';
import { reviewService } from './review.service';
import { wishlistService } from './wishlist.service';
import { notificationService } from '../../notifications/services/notification.service';
import { gamificationService } from '../../gamification/services/gamification.service';

export interface MarketplaceStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalSellers: number;
  averageOrderValue: number;
  topCategories: Array<{
    categoryId: string;
    name: string;
    sales: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
  }>;
  recentOrders: number;
  pendingOrders: number;
}

export class MarketplaceService {
  /**
   * Get marketplace dashboard statistics
   */
  async getDashboardStats(): Promise<MarketplaceStats> {
    try {
      const [
        totalProducts,
        totalOrders,
        totalRevenue,
        totalSellers,
        recentOrders,
        pendingOrders,
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

        // Recent orders (last 24h)
        prisma.order.count({
          where: {
            placedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Pending orders
        prisma.order.count({
          where: { status: 'pending' },
        }),

        // Top categories by sales
        prisma.$queryRaw`
          SELECT 
            pc.id,
            pc.name,
            COUNT(DISTINCT o.id) as sales
          FROM product_categories pc
          JOIN products p ON p.category_id = pc.id
          JOIN order_items oi ON oi.product_id = p.id
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status = 'delivered'
          GROUP BY pc.id, pc.name
          ORDER BY sales DESC
          LIMIT 5
        `,

        // Top products by sales
        prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            SUM(oi.quantity) as sales
          FROM products p
          JOIN order_items oi ON oi.product_id = p.id
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status = 'delivered'
          GROUP BY p.id, p.name
          ORDER BY sales DESC
          LIMIT 5
        `,
      ]);

      const averageOrderValue = totalOrders > 0
        ? (totalRevenue._sum.totalFiat || 0) / totalOrders
        : 0;

      return {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalFiat || 0,
        totalSellers,
        averageOrderValue,
        topCategories: (categorySales as any[]).map(c => ({
          categoryId: c.id,
          name: c.name,
          sales: Number(c.sales),
        })),
        topProducts: (productSales as any[]).map(p => ({
          productId: p.id,
          name: p.name,
          sales: Number(p.sales),
        })),
        recentOrders,
        pendingOrders,
      };
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      throw error;
    }
  }

  /**
   * Process checkout
   */
  async checkout(userId: string, data: {
    shippingAddressId?: string;
    billingAddressId?: string;
    paymentMethod: string;
    notes?: string;
    discountCode?: string;
  }) {
    try {
      // Get user's cart
      const cart = await cartService.getCart(userId);

      if (!cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate cart items
      const issues = await cartService.validateCart(userId);
      if (issues.length > 0) {
        throw new Error('Cart validation failed', issues);
      }

      // Apply discount if provided
      let discount = 0;
      if (data.discountCode) {
        const discountResult = await cartService.applyDiscount(userId, data.discountCode);
        discount = discountResult.discount || 0;
      }

      // Calculate final totals with discount
      const subtotalFiat = cart.totalFiat;
      const discountFiat = (subtotalFiat * discount) / 100;
      const totalFiat = subtotalFiat - discountFiat;

      // Create order
      const order = await orderService.createOrder({
        userId,
        items: cart.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
        })),
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });

      // Process payment
      const paymentResult = await this.processPayment(userId, order.id, totalFiat, data.paymentMethod);

      if (!paymentResult.success) {
        // Cancel order if payment fails
        await orderService.cancelOrder(order.id, userId, 'Payment failed');
        throw new Error('Payment failed');
      }

      // Clear cart
      await cartService.clearCart(userId);

      // Award CAP for purchase
      await gamificationService.processEvent({
        userId,
        type: 'purchase',
        value: totalFiat,
        metadata: { orderId: order.id },
      });

      // Send confirmation
      await this.sendOrderConfirmation(userId, order);

      logger.info(`Checkout completed for user ${userId}, order: ${order.orderNumber}`);
      return {
        order,
        paymentResult,
      };
    } catch (error) {
      logger.error('Error in checkout:', error);
      throw error;
    }
  }

  /**
   * Process payment
   */
  private async processPayment(userId: string, orderId: string, amount: number, method: string) {
    // This would integrate with payment gateways
    // Simplified for now
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
    };
  }

  /**
   * Send order confirmation
   */
  private async sendOrderConfirmation(userId: string, order: any) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: `Order Confirmation #${order.orderNumber}`,
          template: 'order-confirmation',
          data: {
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.totalFiat,
            estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '✅ Order Confirmed',
        body: `Your order #${order.orderNumber} has been confirmed`,
        data: {
          screen: 'orders',
          action: 'view',
          id: order.id,
        },
      });
    } catch (error) {
      logger.error('Error sending order confirmation:', error);
    }
  }

  /**
   * Get user's marketplace activity
   */
  async getUserActivity(userId: string) {
    try {
      const [orders, reviews, wishlists] = await Promise.all([
        orderService.getUserOrders(userId, { limit: 5 }),
        reviewService.getUserReviews(userId, 5),
        wishlistService.getUserWishlists(userId),
      ]);

      return {
        recentOrders: orders.orders,
        recentReviews: reviews.reviews,
        wishlists,
        stats: await orderService.getOrderStats(userId),
      };
    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }

  /**
   * Get seller dashboard
   */
  async getSellerDashboard(sponsorId: string) {
    try {
      const [products, orders, reviews, stats] = await Promise.all([
        productService.getProductsByBrand(sponsorId),
        orderService.getSellerOrders(sponsorId, { limit: 10 }),
        this.getSellerReviews(sponsorId),
        this.getSellerStats(sponsorId),
      ]);

      return {
        products,
        recentOrders: orders.orders,
        recentReviews: reviews,
        stats,
      };
    } catch (error) {
      logger.error('Error getting seller dashboard:', error);
      throw error;
    }
  }

  /**
   * Get seller reviews
   */
  private async getSellerReviews(sponsorId: string) {
    const reviews = await prisma.productReview.findMany({
      where: {
        product: {
          brand: {
            sponsorId,
          },
        },
        status: 'approved',
      },
      include: {
        user: {
          select: {
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return reviews;
  }

  /**
   * Get seller statistics
   */
  private async getSellerStats(sponsorId: string) {
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
      prisma.productReview.aggregate({
        where: {
          product: {
            brand: {
              sponsorId,
            },
          },
          status: 'approved',
        },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalFiat || 0,
      averageRating: averageRating._avg.rating || 0,
    };
  }

  /**
   * Get marketplace search with facets
   */
  async searchWithFacets(params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    inStock?: boolean;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const {
        query,
        category,
        minPrice,
        maxPrice,
        brands,
        inStock,
        sortBy,
        limit = 20,
        offset = 0,
      } = params;

      // Get main search results
      const results = await productService.searchProducts(query || '', {
        categoryId: category,
        minPrice,
        maxPrice,
        brandId: brands?.[0],
        inStock,
        sortBy: sortBy as any,
        limit,
        offset,
      });

      // Get facet counts
      const facets = await this.getFacetCounts({
        query,
        category,
        minPrice,
        maxPrice,
        brands,
        inStock,
      });

      return {
        ...results,
        facets,
      };
    } catch (error) {
      logger.error('Error in searchWithFacets:', error);
      throw error;
    }
  }

  /**
   * Get facet counts for search
   */
  private async getFacetCounts(params: any) {
    const { query, category, minPrice, maxPrice, brands, inStock } = params;

    const where: any = { status: 'ACTIVE' };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (category) where.categoryId = category;
    if (minPrice || maxPrice) {
      where.priceFiat = {};
      if (minPrice) where.priceFiat.gte = minPrice;
      if (maxPrice) where.priceFiat.lte = maxPrice;
    }
    if (brands && brands.length > 0) where.brandId = { in: brands };
    if (inStock) where.stockQuantity = { gt: 0 };

    const [categoryFacets, brandFacets, priceRanges] = await Promise.all([
      // Category facets
      prisma.product.groupBy({
        by: ['categoryId'],
        where,
        _count: true,
      }),

      // Brand facets
      prisma.product.groupBy({
        by: ['brandId'],
        where,
        _count: true,
      }),

      // Price range facets
      prisma.product.aggregate({
        where,
        _min: { priceFiat: true },
        _max: { priceFiat: true },
      }),
    ]);

    return {
      categories: categoryFacets,
      brands: brandFacets,
      priceRange: {
        min: priceRanges._min.priceFiat || 0,
        max: priceRanges._max.priceFiat || 0,
      },
    };
  }

  /**
   * Import products (bulk)
   */
  async importProducts(sponsorId: string, products: any[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const productData of products) {
      try {
        await productService.createProduct(sponsorId, productData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: productData.name,
          error: error.message,
        });
      }
    }

    logger.info(`Bulk import completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Export products
   */
  async exportProducts(sponsorId: string, format: 'csv' | 'json' = 'json') {
    const products = await productService.getProductsByBrand(sponsorId);

    if (format === 'csv') {
      // Convert to CSV
      const csv = this.convertToCSV(products);
      return csv;
    }

    return products;
  }

  /**
   * Convert to CSV
   */
  private convertToCSV(products: any[]): string {
    if (products.length === 0) return '';

    const headers = ['name', 'sku', 'price', 'stock', 'status'];
    const rows = products.map(p => [
      p.name,
      p.sku,
      p.priceFiat,
      p.stockQuantity,
      p.status,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  /**
   * Get marketplace health
   */
  async getHealth(): Promise<any> {
    try {
      const [totalProducts, totalOrders, activeUsers] = await Promise.all([
        prisma.product.count({ where: { status: 'ACTIVE' } }),
        prisma.order.count({ where: { status: 'delivered' } }),
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        status: 'healthy',
        totalProducts,
        totalOrders,
        activeUsers,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting marketplace health:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}

export const marketplaceService = new MarketplaceService();