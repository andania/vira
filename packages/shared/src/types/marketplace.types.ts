/**
 * Marketplace and e-commerce related type definitions
 */

import { UUID, DateTime } from './index';

// Product types
export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum ShippingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned'
}

// Product interfaces
export interface Product {
  id: UUID;
  brandId: UUID;
  categoryId?: UUID;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  currency: string;
  stockQuantity: number;
  lowStockThreshold: number;
  sku?: string;
  barcode?: string;
  weight?: number; // in kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  isDigital: boolean;
  digitalDownloadUrl?: string;
  status: ProductStatus;
  isFeatured: boolean;
  viewsCount: number;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProductImage {
  id: UUID;
  productId: UUID;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: DateTime;
}

export interface ProductInventory {
  id: UUID;
  productId: UUID;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  location?: string;
  lastCountedAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProductVariant {
  id: UUID;
  productId: UUID;
  name: string;
  sku: string;
  attributes: Record<string, string>; // e.g., { color: 'red', size: 'M' }
  priceCap?: number;
  priceFiat?: number;
  stockQuantity: number;
  imageUrl?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProductCategory {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  parentId?: UUID;
  iconUrl?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProductReview {
  id: UUID;
  productId: UUID;
  userId: UUID;
  orderId?: UUID;
  rating: number; // 1-5
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  videos?: string[];
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ReviewHelpfulness {
  reviewId: UUID;
  userId: UUID;
  isHelpful: boolean;
  createdAt: DateTime;
}

// Shopping cart interfaces
export interface ShoppingCart {
  id: UUID;
  userId: UUID;
  sessionId?: UUID;
  totalItems: number;
  totalCap: number;
  totalFiat: number;
  expiresAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CartItem {
  id: UUID;
  cartId: UUID;
  productId: UUID;
  variantId?: UUID;
  quantity: number;
  priceCap: number;
  priceFiat: number;
  addedAt: DateTime;
}

// Order interfaces
export interface Order {
  id: UUID;
  orderNumber: string;
  userId: UUID;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: ShippingStatus;
  subtotalCap?: number;
  subtotalFiat?: number;
  shippingCap?: number;
  shippingFiat?: number;
  taxCap?: number;
  taxFiat?: number;
  discountCap?: number;
  discountFiat?: number;
  totalCap: number;
  totalFiat: number;
  currency: string;
  paymentMethod?: string;
  shippingAddressId?: UUID;
  billingAddressId?: UUID;
  notes?: string;
  placedAt: DateTime;
  paidAt?: DateTime;
  shippedAt?: DateTime;
  deliveredAt?: DateTime;
  cancelledAt?: DateTime;
  cancelledReason?: string;
}

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  variantId?: UUID;
  productName: string;
  sku?: string;
  quantity: number;
  unitPriceCap?: number;
  unitPriceFiat?: number;
  totalPriceCap: number;
  totalPriceFiat: number;
  createdAt: DateTime;
}

export interface OrderStatusHistory {
  id: UUID;
  orderId: UUID;
  status: OrderStatus;
  notes?: string;
  changedBy?: UUID;
  createdAt: DateTime;
}

export interface OrderPayment {
  id: UUID;
  orderId: UUID;
  paymentType: 'cap' | 'fiat' | 'hybrid';
  capAmount?: number;
  fiatAmount?: number;
  paymentMethod: string;
  transactionId?: string;
  status: PaymentStatus;
  createdAt: DateTime;
  processedAt?: DateTime;
}

export interface OrderShipment {
  id: UUID;
  orderId: UUID;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: string;
  estimatedDelivery?: DateTime;
  actualDelivery?: DateTime;
  shippingLabelUrl?: string;
  trackingUrl?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface OrderReturn {
  id: UUID;
  orderId: UUID;
  userId: UUID;
  reason: string;
  items: Array<{
    orderItemId: UUID;
    quantity: number;
    reason?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  refundAmountCap?: number;
  refundAmountFiat?: number;
  notes?: string;
  approvedBy?: UUID;
  createdAt: DateTime;
  processedAt?: DateTime;
}

// Wishlist interfaces
export interface Wishlist {
  id: UUID;
  userId: UUID;
  name: string;
  isPublic: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface WishlistItem {
  id: UUID;
  wishlistId: UUID;
  productId: UUID;
  addedAt: DateTime;
}

// DTOs
export interface CreateProductDTO {
  brandId: UUID;
  categoryId?: UUID;
  name: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  currency?: string;
  stockQuantity: number;
  sku?: string;
  isDigital: boolean;
  digitalDownloadUrl?: string;
  weight?: number;
  dimensions?: Product['dimensions'];
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  stockQuantity?: number;
  status?: ProductStatus;
  isFeatured?: boolean;
}

export interface AddToCartDTO {
  productId: UUID;
  variantId?: UUID;
  quantity: number;
}

export interface CreateOrderDTO {
  items: Array<{
    productId: UUID;
    variantId?: UUID;
    quantity: number;
  }>;
  shippingAddressId?: UUID;
  billingAddressId?: UUID;
  paymentMethod: string;
  notes?: string;
}

export interface CreateReviewDTO {
  productId: UUID;
  orderId?: UUID;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
}

// Marketplace analytics
export interface MarketplaceMetrics {
  date: DateTime;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCategories: Array<{
    categoryId: UUID;
    name: string;
    sales: number;
  }>;
  topProducts: Array<{
    productId: UUID;
    name: string;
    sales: number;
  }>;
}