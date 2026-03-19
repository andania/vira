/**
 * Cart Service
 * Handles shopping cart operations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export class CartService {
  /**
   * Get user's cart
   */
  async getCart(userId: string) {
    try {
      // Try Redis cache first
      const cacheKey = `cart:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      let cart = await prisma.shoppingCart.findUnique({
        where: { userId },
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
      });

      if (!cart) {
        cart = await this.createCart(userId);
      }

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(cart));

      return cart;
    } catch (error) {
      logger.error('Error getting cart:', error);
      throw error;
    }
  }

  /**
   * Create new cart
   */
  async createCart(userId: string) {
    try {
      const cart = await prisma.shoppingCart.create({
        data: {
          userId,
          totalItems: 0,
          totalCap: 0,
          totalFiat: 0,
        },
        include: {
          items: true,
        },
      });

      logger.info(`Cart created for user ${userId}`);
      return cart;
    } catch (error) {
      logger.error('Error creating cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, item: CartItem) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.status !== 'ACTIVE') {
        throw new Error('Product is not available');
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error('Insufficient stock');
      }

      // Get or create cart
      let cart = await prisma.shoppingCart.findUnique({
        where: { userId },
      });

      if (!cart) {
        cart = await this.createCart(userId);
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId,
        },
      });

      let updatedCart;

      if (existingItem) {
        // Update existing item
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + item.quantity,
          },
        });
      } else {
        // Add new item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceCap: product.priceCap || 0,
            priceFiat: product.priceFiat || 0,
          },
        });
      }

      // Recalculate cart totals
      updatedCart = await this.recalculateCart(cart.id);

      // Invalidate cache
      await redis.del(`cart:${userId}`);

      logger.info(`Item added to cart for user ${userId}`);
      return updatedCart;
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    try {
      if (quantity < 1) {
        return this.removeItem(userId, itemId);
      }

      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
          product: true,
        },
      });

      if (!cartItem || cartItem.cart.userId !== userId) {
        throw new Error('Cart item not found');
      }

      if (cartItem.product.stockQuantity < quantity) {
        throw new Error('Insufficient stock');
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      const cart = await this.recalculateCart(cartItem.cartId);

      // Invalidate cache
      await redis.del(`cart:${userId}`);

      logger.info(`Cart item ${itemId} quantity updated to ${quantity}`);
      return cart;
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string) {
    try {
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true },
      });

      if (!cartItem || cartItem.cart.userId !== userId) {
        throw new Error('Cart item not found');
      }

      await prisma.cartItem.delete({
        where: { id: itemId },
      });

      const cart = await this.recalculateCart(cartItem.cartId);

      // Invalidate cache
      await redis.del(`cart:${userId}`);

      logger.info(`Item ${itemId} removed from cart for user ${userId}`);
      return cart;
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string) {
    try {
      const cart = await prisma.shoppingCart.findUnique({
        where: { userId },
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        await prisma.shoppingCart.update({
          where: { id: cart.id },
          data: {
            totalItems: 0,
            totalCap: 0,
            totalFiat: 0,
          },
        });
      }

      // Invalidate cache
      await redis.del(`cart:${userId}`);

      logger.info(`Cart cleared for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Recalculate cart totals
   */
  private async recalculateCart(cartId: string) {
    const items = await prisma.cartItem.findMany({
      where: { cartId },
    });

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalCap = items.reduce((sum, item) => sum + (item.priceCap * item.quantity), 0);
    const totalFiat = items.reduce((sum, item) => sum + (item.priceFiat * item.quantity), 0);

    return prisma.shoppingCart.update({
      where: { id: cartId },
      data: {
        totalItems,
        totalCap,
        totalFiat,
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
      },
    });
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId: string) {
    try {
      const cart = await this.getCart(userId);

      return {
        items: cart.items,
        totalItems: cart.totalItems,
        subtotalCap: cart.totalCap,
        subtotalFiat: cart.totalFiat,
        itemCount: cart.items.length,
      };
    } catch (error) {
      logger.error('Error getting cart summary:', error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart
   */
  async mergeCarts(userId: string, guestCartId: string) {
    try {
      const guestCart = await prisma.shoppingCart.findUnique({
        where: { id: guestCartId },
        include: { items: true },
      });

      if (!guestCart) {
        return;
      }

      for (const item of guestCart.items) {
        await this.addItem(userId, {
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
        });
      }

      // Delete guest cart
      await prisma.shoppingCart.delete({
        where: { id: guestCartId },
      });

      logger.info(`Guest cart ${guestCartId} merged with user ${userId}`);
    } catch (error) {
      logger.error('Error merging carts:', error);
      throw error;
    }
  }

  /**
   * Validate cart items (check stock, prices)
   */
  async validateCart(userId: string) {
    try {
      const cart = await this.getCart(userId);
      const issues = [];

      for (const item of cart.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          issues.push({
            itemId: item.id,
            issue: 'Product no longer exists',
          });
          continue;
        }

        if (product.status !== 'ACTIVE') {
          issues.push({
            itemId: item.id,
            issue: 'Product is no longer available',
          });
        }

        if (product.stockQuantity < item.quantity) {
          issues.push({
            itemId: item.id,
            issue: `Only ${product.stockQuantity} available`,
            availableQuantity: product.stockQuantity,
          });
        }

        // Check if price changed
        if (product.priceFiat !== item.priceFiat) {
          issues.push({
            itemId: item.id,
            issue: 'Price has changed',
            oldPrice: item.priceFiat,
            newPrice: product.priceFiat,
          });
        }
      }

      return issues;
    } catch (error) {
      logger.error('Error validating cart:', error);
      throw error;
    }
  }

  /**
   * Apply discount to cart
   */
  async applyDiscount(userId: string, discountCode: string) {
    try {
      // This would validate discount code
      // Simplified for now
      logger.info(`Discount ${discountCode} applied to cart for user ${userId}`);
      return { success: true, discount: 10 };
    } catch (error) {
      logger.error('Error applying discount:', error);
      throw error;
    }
  }

  /**
   * Estimate shipping
   */
  async estimateShipping(userId: string, addressId: string) {
    try {
      const cart = await this.getCart(userId);
      
      // Simple shipping calculation
      let shippingCost = 5.99;
      if (cart.totalFiat > 50) {
        shippingCost = 0;
      }

      return {
        method: 'standard',
        cost: shippingCost,
        estimatedDays: '3-5 business days',
      };
    } catch (error) {
      logger.error('Error estimating shipping:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();