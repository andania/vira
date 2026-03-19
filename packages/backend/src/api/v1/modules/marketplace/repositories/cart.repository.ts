/**
 * Cart Repository
 * Handles database operations for shopping carts
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class CartRepository extends BaseRepository<any, any, any> {
  protected modelName = 'shoppingCart';
  protected prismaModel = prisma.shoppingCart;

  /**
   * Get cart by user ID
   */
  async getCartByUserId(userId: string) {
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

    return cart;
  }

  /**
   * Create new cart
   */
  async createCart(userId: string) {
    return prisma.shoppingCart.create({
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
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: string, item: any) {
    return prisma.cartItem.create({
      data: {
        cartId,
        ...item,
      },
    });
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string) {
    return prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string) {
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return prisma.shoppingCart.update({
      where: { id: cartId },
      data: {
        totalItems: 0,
        totalCap: 0,
        totalFiat: 0,
      },
    });
  }

  /**
   * Get cart items
   */
  async getCartItems(cartId: string) {
    return prisma.cartItem.findMany({
      where: { cartId },
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
    });
  }

  /**
   * Recalculate cart totals
   */
  async recalculateTotals(cartId: string) {
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
   * Merge guest cart with user cart
   */
  async mergeCarts(userId: string, guestCartId: string) {
    const guestCart = await prisma.shoppingCart.findUnique({
      where: { id: guestCartId },
      include: { items: true },
    });

    if (!guestCart) return null;

    const userCart = await this.getCartByUserId(userId);

    for (const item of guestCart.items) {
      const existingItem = userCart.items.find(
        i => i.productId === item.productId && i.variantId === item.variantId
      );

      if (existingItem) {
        await this.updateItemQuantity(existingItem.id, existingItem.quantity + item.quantity);
      } else {
        await this.addItem(userCart.id, {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceCap: item.priceCap,
          priceFiat: item.priceFiat,
        });
      }
    }

    // Delete guest cart
    await prisma.shoppingCart.delete({
      where: { id: guestCartId },
    });

    return this.recalculateTotals(userCart.id);
  }

  /**
   * Get cart summary
   */
  async getCartSummary(cartId: string) {
    const cart = await prisma.shoppingCart.findUnique({
      where: { id: cartId },
      include: {
        items: true,
      },
    });

    if (!cart) return null;

    return {
      items: cart.items,
      totalItems: cart.totalItems,
      subtotalCap: cart.totalCap,
      subtotalFiat: cart.totalFiat,
      itemCount: cart.items.length,
    };
  }

  /**
   * Delete expired carts
   */
  async deleteExpiredCarts(days: number = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - days);

    return prisma.shoppingCart.deleteMany({
      where: {
        updatedAt: { lt: expiryDate },
        items: {
          none: {},
        },
      },
    });
  }
}

export const cartRepository = new CartRepository();