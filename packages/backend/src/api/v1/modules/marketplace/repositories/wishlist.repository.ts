/**
 * Wishlist Repository
 * Handles database operations for wishlists
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type WishlistCreateInput = Prisma.WishlistUncheckedCreateInput;
type WishlistUpdateInput = Prisma.WishlistUncheckedUpdateInput;

export class WishlistRepository extends BaseRepository<any, WishlistCreateInput, WishlistUpdateInput> {
  protected modelName = 'wishlist';
  protected prismaModel = prisma.wishlist;

  /**
   * Get user wishlists
   */
  async getUserWishlists(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get wishlist with items
   */
  async getWishlistWithItems(wishlistId: string, userId?: string) {
    const where: any = { id: wishlistId };
    if (userId) where.userId = userId;

    return prisma.wishlist.findFirst({
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
                brand: {
                  select: {
                    name: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Check if product is in any of user's wishlists
   */
  async isInAnyWishlist(userId: string, productId: string): Promise<boolean> {
    const count = await prisma.wishlistItem.count({
      where: {
        wishlist: {
          userId,
        },
        productId,
      },
    });

    return count > 0;
  }

  /**
   * Get wishlists containing product
   */
  async getWishlistsWithProduct(userId: string, productId: string) {
    return prisma.wishlist.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          where: { productId },
          take: 1,
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  /**
   * Add item to wishlist
   */
  async addItem(wishlistId: string, productId: string) {
    return prisma.wishlistItem.create({
      data: {
        wishlistId,
        productId,
      },
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
   * Remove item from wishlist
   */
  async removeItem(itemId: string) {
    return prisma.wishlistItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Move item to another wishlist
   */
  async moveItem(itemId: string, targetWishlistId: string) {
    return prisma.wishlistItem.update({
      where: { id: itemId },
      data: { wishlistId: targetWishlistId },
    });
  }

  /**
   * Copy item to another wishlist
   */
  async copyItem(itemId: string, targetWishlistId: string) {
    const item = await prisma.wishlistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error('Item not found');

    return prisma.wishlistItem.create({
      data: {
        wishlistId: targetWishlistId,
        productId: item.productId,
      },
    });
  }

  /**
   * Get public wishlists
   */
  async getPublicWishlists(limit: number = 20, offset: number = 0) {
    const [wishlists, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { isPublic: true },
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
          items: {
            take: 4,
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
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.wishlist.count({ where: { isPublic: true } }),
    ]);

    return { wishlists, total };
  }

  /**
   * Get wishlist suggestions based on user's wishlist
   */
  async getSuggestions(userId: string, limit: number = 10) {
    // Get user's wishlist items
    const userItems = await prisma.wishlistItem.findMany({
      where: {
        wishlist: {
          userId,
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      take: 50,
    });

    if (userItems.length === 0) {
      return [];
    }

    // Get categories from user's wishlist
    const categories = userItems
      .map(i => i.product.categoryId)
      .filter(Boolean);

    // Find popular products in same categories
    return prisma.product.findMany({
      where: {
        categoryId: { in: categories as string[] },
        id: { notIn: userItems.map(i => i.productId) },
        status: 'ACTIVE',
      },
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
      orderBy: {
        soldCount: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get wishlist statistics
   */
  async getWishlistStats(userId: string) {
    const [totalWishlists, totalItems, publicWishlists] = await Promise.all([
      prisma.wishlist.count({ where: { userId } }),
      prisma.wishlistItem.count({
        where: {
          wishlist: {
            userId,
          },
        },
      }),
      prisma.wishlist.count({
        where: {
          userId,
          isPublic: true,
        },
      }),
    ]);

    return {
      totalWishlists,
      totalItems,
      publicWishlists,
    };
  }

  /**
   * Delete wishlist and its items
   */
  async deleteWishlist(wishlistId: string) {
    return prisma.$transaction([
      prisma.wishlistItem.deleteMany({
        where: { wishlistId },
      }),
      prisma.wishlist.delete({
        where: { id: wishlistId },
      }),
    ]);
  }
}

export const wishlistRepository = new WishlistRepository();