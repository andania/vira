/**
 * Product Controller
 * Handles HTTP requests for product operations
 */

import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ProductController {
  /**
   * Create product
   */
  async createProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const product = await productService.createProduct(userId, req.body);

      return res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      logger.error('Error in createProduct:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create product',
        },
      });
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      const product = await productService.getProductById(productId);

      return res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error('Error in getProduct:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Product not found',
        },
      });
    }
  }

  /**
   * Update product
   */
  async updateProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const product = await productService.updateProduct(productId, userId, req.body);

      return res.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateProduct:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update product',
        },
      });
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await productService.deleteProduct(productId, userId);

      return res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteProduct:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete product',
        },
      });
    }
  }

  /**
   * Add product images
   */
  async addImages(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'At least one image is required',
          },
        });
      }

      const images = files.map((file, index) => ({
        file,
        isPrimary: index === 0,
        altText: req.body[`alt_${index}`],
      }));

      const uploaded = await productService.addProductImages(productId, userId, images);

      return res.json({
        success: true,
        data: uploaded,
        message: 'Images uploaded successfully',
      });
    } catch (error) {
      logger.error('Error in addImages:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to upload images',
        },
      });
    }
  }

  /**
   * Remove product image
   */
  async removeImage(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { imageId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await productService.removeProductImage(imageId, userId);

      return res.json({
        success: true,
        message: 'Image removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeImage:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove image',
        },
      });
    }
  }

  /**
   * Create variant
   */
  async createVariant(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const variant = await productService.createVariant(productId, userId, req.body);

      return res.status(201).json({
        success: true,
        data: variant,
        message: 'Variant created successfully',
      });
    } catch (error) {
      logger.error('Error in createVariant:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create variant',
        },
      });
    }
  }

  /**
   * Update variant
   */
  async updateVariant(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { variantId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const variant = await productService.updateVariant(variantId, userId, req.body);

      return res.json({
        success: true,
        data: variant,
        message: 'Variant updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateVariant:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update variant',
        },
      });
    }
  }

  /**
   * Delete variant
   */
  async deleteVariant(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { variantId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await productService.deleteVariant(variantId, userId);

      return res.json({
        success: true,
        message: 'Variant deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteVariant:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete variant',
        },
      });
    }
  }

  /**
   * Update inventory
   */
  async updateInventory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const product = await productService.updateInventory(productId, userId, quantity);

      return res.json({
        success: true,
        data: product,
        message: 'Inventory updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateInventory:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update inventory',
        },
      });
    }
  }

  /**
   * Search products
   */
  async searchProducts(req: Request, res: Response) {
    try {
      const {
        q,
        categoryId,
        brandId,
        minPrice,
        maxPrice,
        inStock,
        tags,
        sortBy,
        limit = 20,
        offset = 0,
      } = req.query;

      const results = await productService.searchProducts(q as string || '', {
        categoryId: categoryId as string,
        brandId: brandId as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true',
        tags: tags ? (tags as string).split(',') : undefined,
        sortBy: sortBy as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in searchProducts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to search products',
        },
      });
    }
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const { status } = req.query;

      const products = await productService.getProductsByBrand(brandId, status as string);

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Error in getProductsByBrand:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get products',
        },
      });
    }
  }

  /**
   * Get categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await productService.getCategories();

      return res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error in getCategories:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get categories',
        },
      });
    }
  }

  /**
   * Get featured products
   */
  async getFeatured(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const products = await productService.getFeaturedProducts(limit);

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Error in getFeatured:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get featured products',
        },
      });
    }
  }

  /**
   * Get related products
   */
  async getRelated(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;

      const products = await productService.getRelatedProducts(productId, limit);

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Error in getRelated:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get related products',
        },
      });
    }
  }
}

export const productController = new ProductController();