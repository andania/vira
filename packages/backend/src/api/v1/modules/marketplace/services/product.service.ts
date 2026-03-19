/**
 * Product Service
 * Handles product CRUD and management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { storageService } from '../../../../../lib/storage/storage.service';
import { notificationService } from '../../notifications/services/notification.service';

export interface ProductData {
  brandId: string;
  name: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  currency?: string;
  stockQuantity: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  isDigital: boolean;
  digitalDownloadUrl?: string;
  categoryId?: string;
  tags?: string[];
}

export interface ProductImage {
  file: Express.Multer.File;
  isPrimary?: boolean;
  altText?: string;
}

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(brandId: string, data: ProductData) {
    try {
      // Generate SKU if not provided
      if (!data.sku) {
        data.sku = await this.generateSKU(brandId, data.name);
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          brandId,
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          priceCap: data.priceCap,
          priceFiat: data.priceFiat,
          currency: data.currency || 'USD',
          stockQuantity: data.stockQuantity,
          sku: data.sku,
          barcode: data.barcode,
          weight: data.weight,
          dimensions: data.dimensions,
          isDigital: data.isDigital,
          digitalDownloadUrl: data.digitalDownloadUrl,
          categoryId: data.categoryId,
          tags: data.tags || [],
          status: 'draft',
        },
      });

      logger.info(`Product created: ${product.id} for brand ${brandId}`);
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Generate SKU
   */
  private async generateSKU(brandId: string, productName: string): Promise<string> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    const brandCode = brand?.name.substring(0, 3).toUpperCase() || 'BRD';
    const productCode = productName.replace(/[^A-Za-z0-9]/g, '').substring(0, 5).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    
    return `${brandCode}-${productCode}-${timestamp}`;
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          brand: true,
          category: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
          reviews: {
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

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    } catch (error) {
      logger.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, brandId: string, data: Partial<ProductData>) {
    try {
      const product = await prisma.product.update({
        where: {
          id: productId,
          brandId,
        },
        data,
      });

      logger.info(`Product updated: ${productId}`);
      return product;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string, brandId: string) {
    try {
      await prisma.product.delete({
        where: {
          id: productId,
          brandId,
        },
      });

      logger.info(`Product deleted: ${productId}`);
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Add product images
   */
  async addProductImages(productId: string, brandId: string, images: ProductImage[]) {
    try {
      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Upload to storage
        const uploadResult = await storageService.upload(image.file, {
          folder: `products/${productId}`,
          resize: { width: 800, height: 800 },
          formats: ['webp', 'jpeg'],
        });

        // Create image record
        const productImage = await prisma.productImage.create({
          data: {
            productId,
            imageUrl: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            altText: image.altText,
            sortOrder: i,
            isPrimary: image.isPrimary || false,
          },
        });

        uploadedImages.push(productImage);
      }

      logger.info(`${uploadedImages.length} images added to product ${productId}`);
      return uploadedImages;
    } catch (error) {
      logger.error('Error adding product images:', error);
      throw error;
    }
  }

  /**
   * Remove product image
   */
  async removeProductImage(imageId: string, brandId: string) {
    try {
      const image = await prisma.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
      });

      if (!image || image.product.brandId !== brandId) {
        throw new Error('Image not found or unauthorized');
      }

      // Delete from storage
      await storageService.delete(image.imageUrl);
      if (image.thumbnailUrl) {
        await storageService.delete(image.thumbnailUrl);
      }

      // Delete from database
      await prisma.productImage.delete({
        where: { id: imageId },
      });

      logger.info(`Product image ${imageId} deleted`);
    } catch (error) {
      logger.error('Error removing product image:', error);
      throw error;
    }
  }

  /**
   * Create product variant
   */
  async createVariant(productId: string, brandId: string, data: any) {
    try {
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          ...data,
        },
      });

      logger.info(`Variant created for product ${productId}`);
      return variant;
    } catch (error) {
      logger.error('Error creating variant:', error);
      throw error;
    }
  }

  /**
   * Update product variant
   */
  async updateVariant(variantId: string, brandId: string, data: any) {
    try {
      const variant = await prisma.productVariant.update({
        where: { id: variantId },
        data,
      });

      logger.info(`Variant ${variantId} updated`);
      return variant;
    } catch (error) {
      logger.error('Error updating variant:', error);
      throw error;
    }
  }

  /**
   * Delete product variant
   */
  async deleteVariant(variantId: string, brandId: string) {
    try {
      await prisma.productVariant.delete({
        where: { id: variantId },
      });

      logger.info(`Variant ${variantId} deleted`);
    } catch (error) {
      logger.error('Error deleting variant:', error);
      throw error;
    }
  }

  /**
   * Update inventory
   */
  async updateInventory(productId: string, brandId: string, quantity: number) {
    try {
      const product = await prisma.product.update({
        where: {
          id: productId,
          brandId,
        },
        data: {
          stockQuantity: quantity,
        },
      });

      // Check if low stock
      if (quantity <= product.lowStockThreshold) {
        await notificationService.create({
          userId: brandId,
          type: 'SYSTEM',
          title: '⚠️ Low Stock Alert',
          body: `Product "${product.name}" is running low on stock (${quantity} left)`,
          data: {
            screen: 'sponsor',
            action: 'products',
            id: productId,
          },
        });
      }

      logger.info(`Inventory updated for product ${productId}: ${quantity}`);
      return product;
    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    query: string,
    filters: {
      categoryId?: string;
      brandId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      tags?: string[];
      sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
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
            brand: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
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
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.product.count({ where }),
      ]);

      return { products, total };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brandId: string, status?: string) {
    try {
      const where: any = { brandId };
      if (status) where.status = status;

      const products = await prisma.product.findMany({
        where,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return products;
    } catch (error) {
      logger.error('Error getting products by brand:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getCategories() {
    try {
      const categories = await prisma.productCategory.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10) {
    try {
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          isFeatured: true,
        },
        include: {
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return products;
    } catch (error) {
      logger.error('Error getting featured products:', error);
      throw error;
    }
  }

  /**
   * Get related products
   */
  async getRelatedProducts(productId: string, limit: number = 6) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true, tags: true },
      });

      if (!product) return [];

      const related = await prisma.product.findMany({
        where: {
          id: { not: productId },
          status: 'ACTIVE',
          OR: [
            { categoryId: product.categoryId },
            { tags: { hasSome: product.tags || [] } },
          ],
        },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        take: limit,
      });

      return related;
    } catch (error) {
      logger.error('Error getting related products:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();