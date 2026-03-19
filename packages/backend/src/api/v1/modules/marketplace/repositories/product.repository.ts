/**
 * Product Repository
 * Handles database operations for products
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type ProductCreateInput = Prisma.ProductUncheckedCreateInput;
type ProductUpdateInput = Prisma.ProductUncheckedUpdateInput;

export class ProductRepository extends BaseRepository<any, ProductCreateInput, ProductUpdateInput> {
  protected modelName = 'product';
  protected prismaModel = prisma.product;

  /**
   * Find products by brand
   */
  async findByBrandId(brandId: string, status?: string) {
    const where: any = { brandId };
    if (status) where.status = status;

    return prisma.product.findMany({
      where,
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        category: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Search products with filters
   */
  async search(
    query: string,
    filters: {
      categoryId?: string;
      brandId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      tags?: string[];
      sortBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const {
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      inStock,
      tags,
      sortBy = 'newest',
      limit = 20,
      offset = 0,
    } = filters;

    const where: any = {
      status: 'ACTIVE',
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (minPrice || maxPrice) {
      where.priceFiat = {};
      if (minPrice) where.priceFiat.gte = minPrice;
      if (maxPrice) where.priceFiat.lte = maxPrice;
    }
    if (inStock) where.stockQuantity = { gt: 0 };
    if (tags && tags.length > 0) where.tags = { hasSome: tags };

    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { priceFiat: 'asc' };
        break;
      case 'price_desc':
        orderBy = { priceFiat: 'desc' };
        break;
      case 'popular':
        orderBy = { soldCount: 'desc' };
        break;
      case 'rating':
        orderBy = { ratingAvg: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          category: true,
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  /**
   * Get product with details
   */
  async getProductWithDetails(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
        reviews: {
          where: { status: 'approved' },
          take: 10,
          orderBy: { createdAt: 'desc' },
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
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });
  }

  /**
   * Update inventory
   */
  async updateInventory(productId: string, quantity: number) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: quantity,
      },
    });
  }

  /**
   * Decrement stock
   */
  async decrementStock(productId: string, quantity: number = 1) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          decrement: quantity,
        },
        soldCount: {
          increment: quantity,
        },
      },
    });
  }

  /**
   * Increment stock
   */
  async incrementStock(productId: string, quantity: number = 1) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: quantity,
        },
      },
    });
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold?: number) {
    return prisma.product.findMany({
      where: {
        stockQuantity: {
          lte: threshold || 5,
        },
        status: 'ACTIVE',
      },
      include: {
        brand: {
          select: {
            name: true,
            sponsorId: true,
          },
        },
      },
    });
  }

  /**
   * Get products by category
   */
  async getByCategory(categoryId: string, limit: number = 20, offset: number = 0) {
    return prisma.product.findMany({
      where: {
        categoryId,
        status: 'ACTIVE',
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get related products
   */
  async getRelatedProducts(productId: string, categoryId?: string, tags?: string[], limit: number = 6) {
    const where: any = {
      id: { not: productId },
      status: 'ACTIVE',
    };

    if (categoryId || (tags && tags.length > 0)) {
      where.OR = [];
      if (categoryId) where.OR.push({ categoryId });
      if (tags && tags.length > 0) where.OR.push({ tags: { hasSome: tags } });
    }

    return prisma.product.findMany({
      where,
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: limit,
    });
  }

  /**
   * Update product rating
   */
  async updateRating(productId: string) {
    const reviews = await prisma.productReview.findMany({
      where: {
        productId,
        status: 'approved',
      },
      select: { rating: true },
    });

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: avgRating,
        ratingCount: reviews.length,
      },
    });
  }

  /**
   * Get product statistics
   */
  async getProductStats(brandId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (brandId) where.brandId = brandId;

    const [total, outOfStock, lowStock] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({
        where: {
          ...where,
          stockQuantity: 0,
        },
      }),
      prisma.product.count({
        where: {
          ...where,
          stockQuantity: { lte: 5, gt: 0 },
        },
      }),
    ]);

    return {
      total,
      outOfStock,
      lowStock,
    };
  }
}

export const productRepository = new ProductRepository();