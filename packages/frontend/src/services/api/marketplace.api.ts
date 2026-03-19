/**
 * Marketplace API Service
 */

import { ApiClient } from './client';

export interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  currency: string;
  stockQuantity: number;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  brand: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  category?: {
    id: string;
    name: string;
  };
  ratingAvg: number;
  ratingCount: number;
  tags?: string[];
  isDigital: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  attributes: Record<string, string>;
  priceCap?: number;
  priceFiat?: number;
  stockQuantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalCap: number;
  totalFiat: number;
  subtotalCap: number;
  subtotalFiat: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  priceCap: number;
  priceFiat: number;
  variantId?: string;
  variantName?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalFiat: number;
  totalCap?: number;
  items: OrderItem[];
  placedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceFiat: number;
  totalPriceFiat: number;
  productImage?: string;
}

export interface Wishlist {
  id: string;
  name: string;
  isPublic: boolean;
  items: Product[];
  itemCount: number;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  user: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  helpfulCount: number;
}

export const marketplaceApi = {
  // =====================================================
  // Products
  // =====================================================

  /**
   * Search products
   */
  searchProducts: (params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    inStock?: boolean;
    tags?: string[];
    sortBy?: string;
    page?: number;
    limit?: number;
  }) =>
    ApiClient.get<PaginatedResponse<Product>>('/api/v1/marketplace/search', { params }),

  /**
   * Get product by ID
   */
  getProductById: (productId: string) =>
    ApiClient.get<Product>(`/api/v1/marketplace/products/${productId}`),

  /**
   * Get products by brand
   */
  getProductsByBrand: (brandId: string, status?: string) =>
    ApiClient.get<Product[]>(`/api/v1/marketplace/products/brand/${brandId}`, { params: { status } }),

  /**
   * Get featured products
   */
  getFeaturedProducts: (limit: number = 10) =>
    ApiClient.get<Product[]>('/api/v1/marketplace/featured', { params: { limit } }),

  /**
   * Get related products
   */
  getRelatedProducts: (productId: string, limit: number = 6) =>
    ApiClient.get<Product[]>(`/api/v1/marketplace/products/${productId}/related`, { params: { limit } }),

  /**
   * Create product (sponsor)
   */
  createProduct: (data: FormData) =>
    ApiClient.post<Product>('/api/v1/marketplace/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Update product (sponsor)
   */
  updateProduct: (productId: string, data: FormData) =>
    ApiClient.put<Product>(`/api/v1/marketplace/products/${productId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Delete product (sponsor)
   */
  deleteProduct: (productId: string) =>
    ApiClient.delete(`/api/v1/marketplace/products/${productId}`),

  /**
   * Add product images (sponsor)
   */
  addProductImages: (productId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return ApiClient.post(`/api/v1/marketplace/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Remove product image (sponsor)
   */
  removeProductImage: (imageId: string) =>
    ApiClient.delete(`/api/v1/marketplace/products/images/${imageId}`),

  /**
   * Create product variant (sponsor)
   */
  createVariant: (productId: string, data: Partial<ProductVariant>) =>
    ApiClient.post<ProductVariant>(`/api/v1/marketplace/products/${productId}/variants`, data),

  /**
   * Update product variant (sponsor)
   */
  updateVariant: (variantId: string, data: Partial<ProductVariant>) =>
    ApiClient.put<ProductVariant>(`/api/v1/marketplace/products/variants/${variantId}`, data),

  /**
   * Delete product variant (sponsor)
   */
  deleteVariant: (variantId: string) =>
    ApiClient.delete(`/api/v1/marketplace/products/variants/${variantId}`),

  /**
   * Update inventory (sponsor)
   */
  updateInventory: (productId: string, quantity: number) =>
    ApiClient.patch<Product>(`/api/v1/marketplace/products/${productId}/inventory`, { quantity }),

  // =====================================================
  // Categories
  // =====================================================

  /**
   * Get categories
   */
  getCategories: () =>
    ApiClient.get<any[]>('/api/v1/marketplace/categories'),

  // =====================================================
  // Cart
  // =====================================================

  /**
   * Get cart
   */
  getCart: () =>
    ApiClient.get<Cart>('/api/v1/marketplace/cart'),

  /**
   * Get cart summary
   */
  getCartSummary: () =>
    ApiClient.get<{ items: CartItem[]; totalItems: number; subtotalFiat: number }>(
      '/api/v1/marketplace/cart/summary'
    ),

  /**
   * Add to cart
   */
  addToCart: (productId: string, variantId?: string, quantity: number = 1) =>
    ApiClient.post<Cart>('/api/v1/marketplace/cart/items', { productId, variantId, quantity }),

  /**
   * Update cart item
   */
  updateCartItem: (itemId: string, quantity: number) =>
    ApiClient.put<Cart>(`/api/v1/marketplace/cart/items/${itemId}`, { quantity }),

  /**
   * Remove from cart
   */
  removeFromCart: (itemId: string) =>
    ApiClient.delete<Cart>(`/api/v1/marketplace/cart/items/${itemId}`),

  /**
   * Clear cart
   */
  clearCart: () =>
    ApiClient.delete('/api/v1/marketplace/cart'),

  /**
   * Validate cart
   */
  validateCart: () =>
    ApiClient.get<{ isValid: boolean; issues: any[] }>('/api/v1/marketplace/cart/validate'),

  /**
   * Apply discount
   */
  applyDiscount: (discountCode: string) =>
    ApiClient.post<{ discount: number }>('/api/v1/marketplace/cart/discount', { discountCode }),

  /**
   * Estimate shipping
   */
  estimateShipping: (addressId: string) =>
    ApiClient.post<{ cost: number; estimatedDays: string }>('/api/v1/marketplace/cart/shipping', { addressId }),

  // =====================================================
  // Orders
  // =====================================================

  /**
   * Checkout
   */
  checkout: (data: {
    shippingAddressId?: string;
    billingAddressId?: string;
    paymentMethod: string;
    notes?: string;
    discountCode?: string;
  }) =>
    ApiClient.post<{ order: Order; paymentResult: any }>('/api/v1/marketplace/checkout', data),

  /**
   * Get user orders
   */
  getUserOrders: (status?: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Order>>('/api/v1/marketplace/orders', {
      params: { status, page, limit },
    }),

  /**
   * Get order by ID
   */
  getOrderById: (orderId: string) =>
    ApiClient.get<Order>(`/api/v1/marketplace/orders/${orderId}`),

  /**
   * Cancel order
   */
  cancelOrder: (orderId: string, reason?: string) =>
    ApiClient.post(`/api/v1/marketplace/orders/${orderId}/cancel`, { reason }),

  /**
   * Track order
   */
  trackOrder: (orderId: string) =>
    ApiClient.get<{ status: string; estimatedDelivery?: string; trackingNumber?: string }>(
      `/api/v1/marketplace/orders/${orderId}/track`
    ),

  /**
   * Request return
   */
  requestReturn: (orderId: string, reason: string, items: any[]) =>
    ApiClient.post(`/api/v1/marketplace/orders/${orderId}/return`, { reason, items }),

  /**
   * Get seller orders (sponsor)
   */
  getSellerOrders: (status?: string, page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Order>>('/api/v1/marketplace/seller/orders', {
      params: { status, page, limit },
    }),

  /**
   * Update order status (sponsor)
   */
  updateOrderStatus: (orderId: string, status: string, notes?: string) =>
    ApiClient.patch(`/api/v1/marketplace/seller/orders/${orderId}/status`, { status, notes }),

  // =====================================================
  // Reviews
  // =====================================================

  /**
   * Get product reviews
   */
  getProductReviews: (productId: string, page: number = 1, limit: number = 20, sortBy?: string) =>
    ApiClient.get<PaginatedResponse<Review>>(`/api/v1/marketplace/reviews/product/${productId}`, {
      params: { page, limit, sortBy },
    }),

  /**
   * Create review
   */
  createReview: (data: {
    productId: string;
    orderId?: string;
    rating: number;
    title?: string;
    content?: string;
    pros?: string[];
    cons?: string[];
  }) =>
    ApiClient.post<Review>('/api/v1/marketplace/reviews', data),

  /**
   * Update review
   */
  updateReview: (reviewId: string, data: Partial<Review>) =>
    ApiClient.put<Review>(`/api/v1/marketplace/reviews/${reviewId}`, data),

  /**
   * Delete review
   */
  deleteReview: (reviewId: string) =>
    ApiClient.delete(`/api/v1/marketplace/reviews/${reviewId}`),

  /**
   * Mark review helpful
   */
  markReviewHelpful: (reviewId: string, helpful: boolean) =>
    ApiClient.post(`/api/v1/marketplace/reviews/${reviewId}/helpful`, { helpful }),

  /**
   * Get user reviews
   */
  getUserReviews: (page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Review>>('/api/v1/marketplace/reviews/user/me', {
      params: { page, limit },
    }),

  /**
   * Get review statistics
   */
  getReviewStats: (productId: string) =>
    ApiClient.get<any>(`/api/v1/marketplace/reviews/stats/${productId}`),

  // =====================================================
  // Wishlists
  // =====================================================

  /**
   * Get user wishlists
   */
  getUserWishlists: () =>
    ApiClient.get<Wishlist[]>('/api/v1/marketplace/wishlists'),

  /**
   * Create wishlist
   */
  createWishlist: (name: string, isPublic: boolean = false) =>
    ApiClient.post<Wishlist>('/api/v1/marketplace/wishlists', { name, isPublic }),

  /**
   * Get wishlist details
   */
  getWishlistDetails: (wishlistId: string) =>
    ApiClient.get<Wishlist>(`/api/v1/marketplace/wishlists/${wishlistId}`),

  /**
   * Update wishlist
   */
  updateWishlist: (wishlistId: string, name?: string, isPublic?: boolean) =>
    ApiClient.put(`/api/v1/marketplace/wishlists/${wishlistId}`, { name, isPublic }),

  /**
   * Delete wishlist
   */
  deleteWishlist: (wishlistId: string) =>
    ApiClient.delete(`/api/v1/marketplace/wishlists/${wishlistId}`),

  /**
   * Add to wishlist
   */
  addToWishlist: (wishlistId: string, productId: string) =>
    ApiClient.post(`/api/v1/marketplace/wishlists/${wishlistId}/items`, { productId }),

  /**
   * Remove from wishlist
   */
  removeFromWishlist: (wishlistId: string, itemId: string) =>
    ApiClient.delete(`/api/v1/marketplace/wishlists/${wishlistId}/items/${itemId}`),

  /**
   * Move wishlist item
   */
  moveWishlistItem: (itemId: string, targetWishlistId: string) =>
    ApiClient.post(`/api/v1/marketplace/wishlists/items/${itemId}/move`, { targetWishlistId }),

  /**
   * Copy wishlist item
   */
  copyWishlistItem: (itemId: string, targetWishlistId: string) =>
    ApiClient.post(`/api/v1/marketplace/wishlists/items/${itemId}/copy`, { targetWishlistId }),

  /**
   * Check if in wishlist
   */
  checkInWishlist: (productId: string) =>
    ApiClient.get<{ isInWishlist: boolean }>(`/api/v1/marketplace/wishlists/check/${productId}`),

  /**
   * Get wishlist suggestions
   */
  getWishlistSuggestions: (limit: number = 10) =>
    ApiClient.get<Product[]>('/api/v1/marketplace/wishlists/suggestions', { params: { limit } }),

  /**
   * Share wishlist
   */
  shareWishlist: (wishlistId: string, email?: string) =>
    ApiClient.post<{ shareUrl: string; shareToken: string }>(
      `/api/v1/marketplace/wishlists/${wishlistId}/share`,
      { email }
    ),

  /**
   * Get shared wishlist
   */
  getSharedWishlist: (token: string) =>
    ApiClient.get<Wishlist>(`/api/v1/marketplace/wishlists/shared/${token}`),

  /**
   * Get public wishlists
   */
  getPublicWishlists: (page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Wishlist>>('/api/v1/marketplace/wishlists/public/list', {
      params: { page, limit },
    }),
};

export default marketplaceApi;