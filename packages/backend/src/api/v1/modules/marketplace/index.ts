/**
 * Marketplace Module Index
 * Exports all marketplace module components
 */

// Controllers
export { marketplaceController } from './controllers/marketplace.controller';
export { productController } from './controllers/product.controller';
export { orderController } from './controllers/order.controller';
export { cartController } from './controllers/cart.controller';
export { reviewController } from './controllers/review.controller';
export { wishlistController } from './controllers/wishlist.controller';

// Services
export { marketplaceService } from './services/marketplace.service';
export { productService } from './services/product.service';
export { orderService } from './services/order.service';
export { cartService } from './services/cart.service';
export { reviewService } from './services/review.service';
export { wishlistService } from './services/wishlist.service';

// Repositories
export { productRepository } from './repositories/product.repository';
export { orderRepository } from './repositories/order.repository';
export { cartRepository } from './repositories/cart.repository';
export { reviewRepository } from './repositories/review.repository';
export { wishlistRepository } from './repositories/wishlist.repository';
export { marketplaceRepository } from './repositories/marketplace.repository';

// Middleware
export * from './middleware';

// Routes
export { marketplaceRouter } from './routes';

// Module configuration
export const marketplaceModule = {
  name: 'marketplace',
  version: '1.0.0',
  description: 'Marketplace for products, orders, reviews, and wishlists',
  controllers: [
    marketplaceController,
    productController,
    orderController,
    cartController,
    reviewController,
    wishlistController,
  ],
  services: [
    marketplaceService,
    productService,
    orderService,
    cartService,
    reviewService,
    wishlistService,
  ],
  repositories: [
    productRepository,
    orderRepository,
    cartRepository,
    reviewRepository,
    wishlistRepository,
    marketplaceRepository,
  ],
};