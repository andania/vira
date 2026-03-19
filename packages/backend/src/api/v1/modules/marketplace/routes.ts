/**
 * Marketplace Routes
 * Defines all marketplace-related API endpoints
 */

import { Router } from 'express';
import { marketplaceController } from './controllers/marketplace.controller';
import { productController } from './controllers/product.controller';
import { orderController } from './controllers/order.controller';
import { cartController } from './controllers/cart.controller';
import { reviewController } from './controllers/review.controller';
import { wishlistController } from './controllers/wishlist.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  canAccessProduct,
  canAccessOrder,
  canAccessReview,
  canAccessWishlist,
  validateCartForCheckout,
  marketplaceRateLimit,
  cacheProduct,
  validateProductData,
  trackProductView,
  checkStockAvailability,
  validateReviewContent,
} from './middleware/marketplace.middleware';
import * as validators from './validators';

const router = Router();

// Apply global middleware
router.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));
router.use(marketplaceRateLimit);

// =====================================================
// Public Marketplace Routes
// =====================================================

/**
 * Get marketplace summary
 * GET /api/v1/marketplace/summary
 */
router.get(
  '/summary',
  validate(validators.getMarketplaceSummaryValidator),
  marketplaceController.getSummary
);

/**
 * Get marketplace health
 * GET /api/v1/marketplace/health
 */
router.get(
  '/health',
  validate(validators.getMarketplaceHealthValidator),
  marketplaceController.getHealth
);

/**
 * Get featured products
 * GET /api/v1/marketplace/featured
 */
router.get(
  '/featured',
  validate(validators.getFeaturedValidator),
  marketplaceController.getFeatured
);

/**
 * Get categories
 * GET /api/v1/marketplace/categories
 */
router.get(
  '/categories',
  validate(validators.getCategoriesValidator),
  marketplaceController.getCategories
);

/**
 * Get top products
 * GET /api/v1/marketplace/top-products
 */
router.get(
  '/top-products',
  validate(validators.getTopProductsValidator),
  marketplaceController.getTopProducts
);

/**
 * Search marketplace
 * GET /api/v1/marketplace/search
 */
router.get(
  '/search',
  validate(validators.searchMarketplaceValidator),
  marketplaceController.search
);

// =====================================================
// Product Routes
// =====================================================

/**
 * Get product by ID
 * GET /api/v1/marketplace/products/:productId
 */
router.get(
  '/products/:productId',
  validate(validators.getProductByIdValidator),
  trackProductView,
  cacheProduct(),
  productController.getProduct
);

/**
 * Get products by brand
 * GET /api/v1/marketplace/products/brand/:brandId
 */
router.get(
  '/products/brand/:brandId',
  validate(validators.getProductsByBrandValidator),
  productController.getProductsByBrand
);

/**
 * Get related products
 * GET /api/v1/marketplace/products/:productId/related
 */
router.get(
  '/products/:productId/related',
  validate(validators.getRelatedProductsValidator),
  productController.getRelated
);

/**
 * Create product (sponsor only)
 * POST /api/v1/marketplace/products
 */
router.post(
  '/products',
  authenticate,
  authorize('sponsor'),
  validate(validators.createProductValidator),
  validateProductData,
  upload.array('images', 10),
  productController.createProduct
);

/**
 * Update product (sponsor only)
 * PUT /api/v1/marketplace/products/:productId
 */
router.put(
  '/products/:productId',
  authenticate,
  authorize('sponsor'),
  validate(validators.updateProductValidator),
  canAccessProduct,
  productController.updateProduct
);

/**
 * Delete product (sponsor only)
 * DELETE /api/v1/marketplace/products/:productId
 */
router.delete(
  '/products/:productId',
  authenticate,
  authorize('sponsor'),
  validate(validators.deleteProductValidator),
  canAccessProduct,
  productController.deleteProduct
);

/**
 * Add product images (sponsor only)
 * POST /api/v1/marketplace/products/:productId/images
 */
router.post(
  '/products/:productId/images',
  authenticate,
  authorize('sponsor'),
  validate(validators.addProductImagesValidator),
  canAccessProduct,
  upload.array('images', 10),
  productController.addImages
);

/**
 * Remove product image (sponsor only)
 * DELETE /api/v1/marketplace/products/images/:imageId
 */
router.delete(
  '/products/images/:imageId',
  authenticate,
  authorize('sponsor'),
  validate(validators.removeProductImageValidator),
  productController.removeImage
);

/**
 * Create product variant (sponsor only)
 * POST /api/v1/marketplace/products/:productId/variants
 */
router.post(
  '/products/:productId/variants',
  authenticate,
  authorize('sponsor'),
  validate(validators.createVariantValidator),
  canAccessProduct,
  productController.createVariant
);

/**
 * Update product variant (sponsor only)
 * PUT /api/v1/marketplace/products/variants/:variantId
 */
router.put(
  '/products/variants/:variantId',
  authenticate,
  authorize('sponsor'),
  validate(validators.updateVariantValidator),
  productController.updateVariant
);

/**
 * Delete product variant (sponsor only)
 * DELETE /api/v1/marketplace/products/variants/:variantId
 */
router.delete(
  '/products/variants/:variantId',
  authenticate,
  authorize('sponsor'),
  validate(validators.deleteVariantValidator),
  productController.deleteVariant
);

/**
 * Update inventory (sponsor only)
 * PATCH /api/v1/marketplace/products/:productId/inventory
 */
router.patch(
  '/products/:productId/inventory',
  authenticate,
  authorize('sponsor'),
  validate(validators.updateInventoryValidator),
  canAccessProduct,
  productController.updateInventory
);

// =====================================================
// Cart Routes
// =====================================================

/**
 * Get user's cart
 * GET /api/v1/marketplace/cart
 */
router.get(
  '/cart',
  authenticate,
  validate(validators.getCartValidator),
  cartController.getCart
);

/**
 * Get cart summary
 * GET /api/v1/marketplace/cart/summary
 */
router.get(
  '/cart/summary',
  authenticate,
  validate(validators.getCartSummaryValidator),
  cartController.getCartSummary
);

/**
 * Add item to cart
 * POST /api/v1/marketplace/cart/items
 */
router.post(
  '/cart/items',
  authenticate,
  validate(validators.addItemToCartValidator),
  checkStockAvailability,
  cartController.addItem
);

/**
 * Update cart item quantity
 * PUT /api/v1/marketplace/cart/items/:itemId
 */
router.put(
  '/cart/items/:itemId',
  authenticate,
  validate(validators.updateCartItemValidator),
  cartController.updateItemQuantity
);

/**
 * Remove item from cart
 * DELETE /api/v1/marketplace/cart/items/:itemId
 */
router.delete(
  '/cart/items/:itemId',
  authenticate,
  validate(validators.removeCartItemValidator),
  cartController.removeItem
);

/**
 * Clear cart
 * DELETE /api/v1/marketplace/cart
 */
router.delete(
  '/cart',
  authenticate,
  validate(validators.clearCartValidator),
  cartController.clearCart
);

/**
 * Validate cart
 * GET /api/v1/marketplace/cart/validate
 */
router.get(
  '/cart/validate',
  authenticate,
  validate(validators.validateCartValidator),
  cartController.validateCart
);

/**
 * Apply discount
 * POST /api/v1/marketplace/cart/discount
 */
router.post(
  '/cart/discount',
  authenticate,
  validate(validators.applyDiscountValidator),
  cartController.applyDiscount
);

/**
 * Estimate shipping
 * POST /api/v1/marketplace/cart/shipping
 */
router.post(
  '/cart/shipping',
  authenticate,
  validate(validators.estimateShippingValidator),
  cartController.estimateShipping
);

// =====================================================
// Order Routes
// =====================================================

/**
 * Checkout
 * POST /api/v1/marketplace/checkout
 */
router.post(
  '/checkout',
  authenticate,
  validate(validators.checkoutValidator),
  validateCartForCheckout,
  marketplaceController.checkout
);

/**
 * Get user orders
 * GET /api/v1/marketplace/orders
 */
router.get(
  '/orders',
  authenticate,
  validate(validators.getUserOrdersValidator),
  orderController.getUserOrders
);

/**
 * Get order by ID
 * GET /api/v1/marketplace/orders/:orderId
 */
router.get(
  '/orders/:orderId',
  authenticate,
  validate(validators.getOrderByIdValidator),
  canAccessOrder,
  orderController.getOrder
);

/**
 * Cancel order
 * POST /api/v1/marketplace/orders/:orderId/cancel
 */
router.post(
  '/orders/:orderId/cancel',
  authenticate,
  validate(validators.cancelOrderValidator),
  canAccessOrder,
  orderController.cancelOrder
);

/**
 * Track order
 * GET /api/v1/marketplace/orders/:orderId/track
 */
router.get(
  '/orders/:orderId/track',
  validate(validators.trackOrderValidator),
  orderController.trackOrder
);

/**
 * Get order statistics
 * GET /api/v1/marketplace/orders/stats/summary
 */
router.get(
  '/orders/stats/summary',
  authenticate,
  validate(validators.getOrderStatsValidator),
  orderController.getOrderStats
);

/**
 * Request return
 * POST /api/v1/marketplace/orders/:orderId/return
 */
router.post(
  '/orders/:orderId/return',
  authenticate,
  validate(validators.requestReturnValidator),
  canAccessOrder,
  orderController.requestReturn
);

// =====================================================
// Review Routes
// =====================================================

/**
 * Get product reviews
 * GET /api/v1/marketplace/reviews/product/:productId
 */
router.get(
  '/reviews/product/:productId',
  validate(validators.getProductReviewsValidator),
  reviewController.getProductReviews
);

/**
 * Get review by ID
 * GET /api/v1/marketplace/reviews/:reviewId
 */
router.get(
  '/reviews/:reviewId',
  validate(validators.getReviewByIdValidator),
  reviewController.getReview
);

/**
 * Create review
 * POST /api/v1/marketplace/reviews
 */
router.post(
  '/reviews',
  authenticate,
  validate(validators.createReviewValidator),
  validateReviewContent,
  reviewController.createReview
);

/**
 * Update review
 * PUT /api/v1/marketplace/reviews/:reviewId
 */
router.put(
  '/reviews/:reviewId',
  authenticate,
  validate(validators.updateReviewValidator),
  canAccessReview,
  validateReviewContent,
  reviewController.updateReview
);

/**
 * Delete review
 * DELETE /api/v1/marketplace/reviews/:reviewId
 */
router.delete(
  '/reviews/:reviewId',
  authenticate,
  validate(validators.deleteReviewValidator),
  canAccessReview,
  reviewController.deleteReview
);

/**
 * Mark review as helpful
 * POST /api/v1/marketplace/reviews/:reviewId/helpful
 */
router.post(
  '/reviews/:reviewId/helpful',
  authenticate,
  validate(validators.markHelpfulValidator),
  reviewController.markHelpful
);

/**
 * Get user's reviews
 * GET /api/v1/marketplace/reviews/user/me
 */
router.get(
  '/reviews/user/me',
  authenticate,
  validate(validators.getUserReviewsValidator),
  reviewController.getUserReviews
);

/**
 * Get review statistics
 * GET /api/v1/marketplace/reviews/stats/:productId
 */
router.get(
  '/reviews/stats/:productId',
  validate(validators.getReviewStatsValidator),
  reviewController.getReviewStats
);

/**
 * Report review
 * POST /api/v1/marketplace/reviews/:reviewId/report
 */
router.post(
  '/reviews/:reviewId/report',
  authenticate,
  validate(validators.reportReviewValidator),
  reviewController.reportReview
);

// =====================================================
// Wishlist Routes
// =====================================================

/**
 * Get user's wishlists
 * GET /api/v1/marketplace/wishlists
 */
router.get(
  '/wishlists',
  authenticate,
  validate(validators.getUserWishlistsValidator),
  wishlistController.getUserWishlists
);

/**
 * Create wishlist
 * POST /api/v1/marketplace/wishlists
 */
router.post(
  '/wishlists',
  authenticate,
  validate(validators.createWishlistValidator),
  wishlistController.createWishlist
);

/**
 * Get wishlist details
 * GET /api/v1/marketplace/wishlists/:wishlistId
 */
router.get(
  '/wishlists/:wishlistId',
  authenticate,
  validate(validators.getWishlistDetailsValidator),
  canAccessWishlist,
  wishlistController.getWishlist
);

/**
 * Update wishlist
 * PUT /api/v1/marketplace/wishlists/:wishlistId
 */
router.put(
  '/wishlists/:wishlistId',
  authenticate,
  validate(validators.updateWishlistValidator),
  canAccessWishlist,
  wishlistController.updateWishlist
);

/**
 * Delete wishlist
 * DELETE /api/v1/marketplace/wishlists/:wishlistId
 */
router.delete(
  '/wishlists/:wishlistId',
  authenticate,
  validate(validators.deleteWishlistValidator),
  canAccessWishlist,
  wishlistController.deleteWishlist
);

/**
 * Add item to wishlist
 * POST /api/v1/marketplace/wishlists/:wishlistId/items
 */
router.post(
  '/wishlists/:wishlistId/items',
  authenticate,
  validate(validators.addItemToWishlistValidator),
  canAccessWishlist,
  wishlistController.addItem
);

/**
 * Remove item from wishlist
 * DELETE /api/v1/marketplace/wishlists/:wishlistId/items/:itemId
 */
router.delete(
  '/wishlists/:wishlistId/items/:itemId',
  authenticate,
  validate(validators.removeWishlistItemValidator),
  canAccessWishlist,
  wishlistController.removeItem
);

/**
 * Move item to another wishlist
 * POST /api/v1/marketplace/wishlists/items/:itemId/move
 */
router.post(
  '/wishlists/items/:itemId/move',
  authenticate,
  validate(validators.moveWishlistItemValidator),
  wishlistController.moveItem
);

/**
 * Copy item to another wishlist
 * POST /api/v1/marketplace/wishlists/items/:itemId/copy
 */
router.post(
  '/wishlists/items/:itemId/copy',
  authenticate,
  validate(validators.copyWishlistItemValidator),
  wishlistController.copyItem
);

/**
 * Check if product is in wishlist
 * GET /api/v1/marketplace/wishlists/check/:productId
 */
router.get(
  '/wishlists/check/:productId',
  authenticate,
  validate(validators.checkInWishlistValidator),
  wishlistController.checkInWishlist
);

/**
 * Get wishlist suggestions
 * GET /api/v1/marketplace/wishlists/suggestions
 */
router.get(
  '/wishlists/suggestions',
  authenticate,
  validate(validators.getWishlistSuggestionsValidator),
  wishlistController.getSuggestions
);

/**
 * Share wishlist
 * POST /api/v1/marketplace/wishlists/:wishlistId/share
 */
router.post(
  '/wishlists/:wishlistId/share',
  authenticate,
  validate(validators.shareWishlistValidator),
  canAccessWishlist,
  wishlistController.shareWishlist
);

/**
 * Get shared wishlist
 * GET /api/v1/marketplace/wishlists/shared/:token
 */
router.get(
  '/wishlists/shared/:token',
  validate(validators.getSharedWishlistValidator),
  wishlistController.getSharedWishlist
);

/**
 * Get public wishlists
 * GET /api/v1/marketplace/wishlists/public/list
 */
router.get(
  '/wishlists/public/list',
  validate(validators.getPublicWishlistsValidator),
  wishlistController.getPublicWishlists
);

// =====================================================
// Seller Dashboard Routes (Sponsor only)
// =====================================================

/**
 * Get seller dashboard
 * GET /api/v1/marketplace/seller/dashboard
 */
router.get(
  '/seller/dashboard',
  authenticate,
  authorize('sponsor'),
  validate(validators.getSellerDashboardValidator),
  marketplaceController.getSellerDashboard
);

/**
 * Get seller orders
 * GET /api/v1/marketplace/seller/orders
 */
router.get(
  '/seller/orders',
  authenticate,
  authorize('sponsor'),
  validate(validators.getSellerOrdersValidator),
  orderController.getSellerOrders
);

/**
 * Update order status (seller)
 * PATCH /api/v1/marketplace/seller/orders/:orderId/status
 */
router.patch(
  '/seller/orders/:orderId/status',
  authenticate,
  authorize('sponsor'),
  validate(validators.updateOrderStatusValidator),
  canAccessOrder,
  orderController.updateOrderStatus
);

/**
 * Get seller stats
 * GET /api/v1/marketplace/seller/stats
 */
router.get(
  '/seller/stats',
  authenticate,
  authorize('sponsor'),
  validate(validators.getSellerStatsValidator),
  marketplaceController.getSellerStats
);

/**
 * Import products (bulk)
 * POST /api/v1/marketplace/seller/products/import
 */
router.post(
  '/seller/products/import',
  authenticate,
  authorize('sponsor'),
  validate(validators.importProductsValidator),
  marketplaceController.importProducts
);

/**
 * Export products
 * GET /api/v1/marketplace/seller/products/export
 */
router.get(
  '/seller/products/export',
  authenticate,
  authorize('sponsor'),
  validate(validators.exportProductsValidator),
  marketplaceController.exportProducts
);

/**
 * Bulk update products
 * PATCH /api/v1/marketplace/seller/products/bulk
 */
router.patch(
  '/seller/products/bulk',
  authenticate,
  authorize('sponsor'),
  validate(validators.bulkUpdateProductsValidator),
  marketplaceController.bulkUpdateProducts
);

// =====================================================
// Admin Routes
// =====================================================

/**
 * Get marketplace dashboard stats (admin)
 * GET /api/v1/marketplace/admin/stats
 */
router.get(
  '/admin/stats',
  authenticate,
  authorize('admin'),
  validate(validators.getDashboardStatsValidator),
  marketplaceController.getDashboardStats
);

/**
 * Get recent orders (admin)
 * GET /api/v1/marketplace/admin/orders/recent
 */
router.get(
  '/admin/orders/recent',
  authenticate,
  authorize('admin'),
  validate(validators.getRecentOrdersValidator),
  marketplaceController.getRecentOrders
);

/**
 * Moderate review (admin)
 * POST /api/v1/marketplace/admin/reviews/:reviewId/moderate
 */
router.post(
  '/admin/reviews/:reviewId/moderate',
  authenticate,
  authorize('admin'),
  validate(validators.moderateReviewValidator),
  canAccessReview,
  reviewController.moderateReview
);

/**
 * Get user activity (admin)
 * GET /api/v1/marketplace/admin/users/:userId/activity
 */
router.get(
  '/admin/users/:userId/activity',
  authenticate,
  authorize('admin'),
  marketplaceController.getUserActivity
);

export { router as marketplaceRouter };