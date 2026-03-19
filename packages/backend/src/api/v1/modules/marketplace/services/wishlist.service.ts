/**
 * Wishlist Service
 * Handles user wishlist operations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';

export interface WishlistData {
  userId: string;
  name?: string;
  isPublic?: boolean;
}

export class WishlistService {
  /**
   * Get user's wishlists
   */
  async getUserWishlists(userId: string) {
    try {
      const wishlists = await prisma.wishlist.findMany({
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

      return wishlists;
    } catch (error) {
      logger.error('Error getting user wishlists:', error);
      throw error;
    }
  }

  /**
   * Create wishlist
   */
  async createWishlist(data: WishlistData) {
    try {
      const { userId, name = 'My Wishlist', isPublic = false } = data;

      const wishlist = await prisma.wishlist.create({
        data: {
          userId,
          name,
          isPublic,
        },
      });

      logger.info(`Wishlist created: ${wishlist.id} for user ${userId}`);
      return wishlist;
    } catch (error) {
      logger.error('Error creating wishlist:', error);
      throw error;
    }
  }

  /**
   * Get wishlist details
   */
  async getWishlistDetails(wishlistId: string, userId: string) {
    try {
      const wishlist = await prisma.wishlist.findFirst({
        where: {
          id: wishlistId,
          OR: [
            { userId },
            { isPublic: true },
          ],
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

      if (!wishlist) {
        throw new Error('Wishlist not found');
      }

      return wishlist;
    } catch (error) {
      logger.error('Error getting wishlist details:', error);
      throw error;
    }
  }

  /**
   * Update wishlist
   */
  async updateWishlist(wishlistId: string, userId: string, data: Partial<WishlistData>) {
    try {
      const wishlist = await prisma.wishlist.update({
        where: {
          id: wishlistId,
          userId,
        },
        data,
      });

      logger.info(`Wishlist ${wishlistId} updated`);
      return wishlist;
    } catch (error) {
      logger.error('Error updating wishlist:', error);
      throw error;
    }
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(wishlistId: string, userId: string) {
    try {
      await prisma.wishlist.delete({
        where: {
          id: wishlistId,
          userId,
        },
      });

      logger.info(`Wishlist ${wishlistId} deleted`);
    } catch (error) {
      logger.error('Error deleting wishlist:', error);
      throw error;
    }
  }

  /**
   * Add item to wishlist
   */
  async addItem(wishlistId: string, userId: string, productId: string) {
    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if already in wishlist
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId,
          productId,
        },
      });

      if (existing) {
        throw new Error('Item already in wishlist');
      }

      const item = await prisma.wishlistItem.create({
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

      logger.info(`Item ${productId} added to wishlist ${wishlistId}`);
      return item;
    } catch (error) {
      logger.error('Error adding item to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(wishlistId: string, userId: string, itemId: string) {
    try {
      await prisma.wishlistItem.delete({
        where: {
          id: itemId,
          wishlist: {
            userId,
          },
        },
      });

      logger.info(`Item ${itemId} removed from wishlist ${wishlistId}`);
    } catch (error) {
      logger.error('Error removing item from wishlist:', error);
      throw error;
    }
  }

  /**
   * Move item to another wishlist
   */
  async moveItem(itemId: string, userId: string, targetWishlistId: string) {
    try {
      const item = await prisma.wishlistItem.findFirst({
        where: {
          id: itemId,
          wishlist: {
            userId,
          },
        },
      });

      if (!item) {
        throw new Error('Item not found');
      }

      // Check if target wishlist exists and belongs to user
      const targetWishlist = await prisma.wishlist.findFirst({
        where: {
          id: targetWishlistId,
          userId,
        },
      });

      if (!targetWishlist) {
        throw new Error('Target wishlist not found');
      }

      // Check if item already in target wishlist
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId: targetWishlistId,
          productId: item.productId,
        },
      });

      if (existing) {
        // Remove from source
        await prisma.wishlistItem.delete({
          where: { id: itemId },
        });
      } else {
        // Update wishlistId
        await prisma.wishlistItem.update({
          where: { id: itemId },
          data: { wishlistId: targetWishlistId },
        });
      }

      logger.info(`Item ${itemId} moved to wishlist ${targetWishlistId}`);
    } catch (error) {
      logger.error('Error moving wishlist item:', error);
      throw error;
    }
  }

  /**
   * Copy item to another wishlist
   */
  async copyItem(itemId: string, userId: string, targetWishlistId: string) {
    try {
      const item = await prisma.wishlistItem.findFirst({
        where: {
          id: itemId,
          wishlist: {
            userId,
          },
        },
      });

      if (!item) {
        throw new Error('Item not found');
      }

      // Check if target wishlist exists and belongs to user
      const targetWishlist = await prisma.wishlist.findFirst({
        where: {
          id: targetWishlistId,
          userId,
        },
      });

      if (!targetWishlist) {
        throw new Error('Target wishlist not found');
      }

      // Check if item already in target wishlist
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId: targetWishlistId,
          productId: item.productId,
        },
      });

      if (!existing) {
        await prisma.wishlistItem.create({
          data: {
            wishlistId: targetWishlistId,
            productId: item.productId,
          },
        });
      }

      logger.info(`Item ${itemId} copied to wishlist ${targetWishlistId}`);
    } catch (error) {
      logger.error('Error copying wishlist item:', error);
      throw error;
    }
  }

  /**
   * Check if product is in user's wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const count = await prisma.wishlistItem.count({
        where: {
          wishlist: {
            userId,
          },
          productId,
        },
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking wishlist:', error);
      return false;
    }
  }

  /**
   * Get wishlists containing product
   */
  async getWishlistsWithProduct(userId: string, productId: string) {
    try {
      const wishlists = await prisma.wishlist.findMany({
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

      return wishlists.map(w => ({
        ...w,
        hasProduct: w.items.length > 0,
      }));
    } catch (error) {
      logger.error('Error getting wishlists with product:', error);
      throw error;
    }
  }

  /**
   * Get public wishlists
   */
  async getPublicWishlists(limit: number = 20, offset: number = 0) {
    try {
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
    } catch (error) {
      logger.error('Error getting public wishlists:', error);
      throw error;
    }
  }

  /**
   * Get wishlist suggestions based on user's interests
   */
  async getWishlistSuggestions(userId: string, limit: number = 10) {
    try {
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
      const suggestions = await prisma.product.findMany({
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

      return suggestions;
    } catch (error) {
      logger.error('Error getting wishlist suggestions:', error);
      throw error;
    }
  }

  /**
   * Share wishlist
   */
  async shareWishlist(wishlistId: string, userId: string, recipientEmail?: string) {
    try {
      const wishlist = await prisma.wishlist.findFirst({
        where: {
          id: wishlistId,
          userId,
        },
      });

      if (!wishlist) {
        throw new Error('Wishlist not found');
      }

      // Generate share link
      const shareToken = Buffer.from(`${wishlistId}:${Date.now()}`).toString('base64');
      
      await redis.setex(`share:wishlist:${shareToken}`, 7 * 86400, wishlistId); // 7 days

      const shareUrl = `${process.env.FRONTEND_URL}/wishlist/shared/${shareToken}`;

      if (recipientEmail) {
        // Send email
        await notificationService.sendEmail({
          to: recipientEmail,
          subject: `${wishlist.name} - Shared Wishlist`,
          template: 'share-wishlist',
          data: {
            wishlistName: wishlist.name,
            shareUrl,
            senderName: userId,
          },
        });
      }

      return { shareUrl, shareToken };
    } catch (error) {
      logger.error('Error sharing wishlist:', error);
      throw error;
    }
  }

  /**
   * Get shared wishlist by token
   */
  async getSharedWishlist(token: string) {
    try {
      const wishlistId = await redis.get(`share:wishlist:${token}`);
      
      if (!wishlistId) {
        throw new Error('Shared wishlist not found or expired');
      }

      const wishlist = await prisma.wishlist.findUnique({
        where: { id: wishlistId },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      return wishlist;
    } catch (error) {
      logger.error('Error getting shared wishlist:', error);
      throw error;
    }
  }
}

export const wishlistService = new WishlistService();