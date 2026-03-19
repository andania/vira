/**
 * Marketplace Slice
 * Manages products, orders, cart, and wishlist state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { marketplaceApi } from '../../services/api/marketplace.api';

interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  priceCap?: number;
  priceFiat?: number;
  currency: string;
  stockQuantity: number;
  images: Array<{ url: string; isPrimary: boolean }>;
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

interface CartItem {
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

interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalCap: number;
  totalFiat: number;
  subtotalCap: number;
  subtotalFiat: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalFiat: number;
  totalCap?: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceFiat: number;
    totalPriceFiat: number;
    productImage?: string;
  }>;
  placedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

interface Wishlist {
  id: string;
  name: string;
  isPublic: boolean;
  items: Product[];
  itemCount: number;
}

interface Review {
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

interface MarketplaceState {
  products: Product[];
  currentProduct: Product | null;
  relatedProducts: Product[];
  featuredProducts: Product[];
  cart: Cart | null;
  orders: Order[];
  currentOrder: Order | null;
  wishlists: Wishlist[];
  currentWishlist: Wishlist | null;
  reviews: Review[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  productPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  orderPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: MarketplaceState = {
  products: [],
  currentProduct: null,
  relatedProducts: [],
  featuredProducts: [],
  cart: null,
  orders: [],
  currentOrder: null,
  wishlists: [],
  currentWishlist: null,
  reviews: [],
  categories: [],
  isLoading: false,
  error: null,
  productPagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
  orderPagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

// Async thunks
export const searchProducts = createAsyncThunk(
  'marketplace/searchProducts',
  async ({ query, category, minPrice, maxPrice, brands, inStock, sortBy, page = 1, limit = 20 }: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    inStock?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await marketplaceApi.searchProducts({
      query, category, minPrice, maxPrice, brands, inStock, sortBy, page, limit
    });
    return response.data;
  }
);

export const getProductById = createAsyncThunk(
  'marketplace/getProductById',
  async (productId: string) => {
    const response = await marketplaceApi.getProductById(productId);
    return response.data;
  }
);

export const getRelatedProducts = createAsyncThunk(
  'marketplace/getRelatedProducts',
  async ({ productId, limit }: { productId: string; limit?: number }) => {
    const response = await marketplaceApi.getRelatedProducts(productId, limit);
    return response.data;
  }
);

export const getFeaturedProducts = createAsyncThunk(
  'marketplace/getFeaturedProducts',
  async (limit?: number) => {
    const response = await marketplaceApi.getFeaturedProducts(limit);
    return response.data;
  }
);

export const getCategories = createAsyncThunk(
  'marketplace/getCategories',
  async () => {
    const response = await marketplaceApi.getCategories();
    return response.data;
  }
);

export const getCart = createAsyncThunk(
  'marketplace/getCart',
  async () => {
    const response = await marketplaceApi.getCart();
    return response.data;
  }
);

export const addToCart = createAsyncThunk(
  'marketplace/addToCart',
  async ({ productId, variantId, quantity }: { productId: string; variantId?: string; quantity: number }) => {
    const response = await marketplaceApi.addToCart(productId, variantId, quantity);
    return response.data;
  }
);

export const updateCartItem = createAsyncThunk(
  'marketplace/updateCartItem',
  async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
    const response = await marketplaceApi.updateCartItem(itemId, quantity);
    return response.data;
  }
);

export const removeFromCart = createAsyncThunk(
  'marketplace/removeFromCart',
  async (itemId: string) => {
    await marketplaceApi.removeFromCart(itemId);
    return itemId;
  }
);

export const clearCart = createAsyncThunk(
  'marketplace/clearCart',
  async () => {
    await marketplaceApi.clearCart();
    return true;
  }
);

export const checkout = createAsyncThunk(
  'marketplace/checkout',
  async (checkoutData: any) => {
    const response = await marketplaceApi.checkout(checkoutData);
    return response.data;
  }
);

export const getOrders = createAsyncThunk(
  'marketplace/getOrders',
  async ({ page = 1, limit = 20, status }: { page?: number; limit?: number; status?: string }) => {
    const response = await marketplaceApi.getOrders(page, limit, status);
    return response.data;
  }
);

export const getOrderById = createAsyncThunk(
  'marketplace/getOrderById',
  async (orderId: string) => {
    const response = await marketplaceApi.getOrderById(orderId);
    return response.data;
  }
);

export const cancelOrder = createAsyncThunk(
  'marketplace/cancelOrder',
  async ({ orderId, reason }: { orderId: string; reason?: string }) => {
    const response = await marketplaceApi.cancelOrder(orderId, reason);
    return response.data;
  }
);

export const getWishlists = createAsyncThunk(
  'marketplace/getWishlists',
  async () => {
    const response = await marketplaceApi.getWishlists();
    return response.data;
  }
);

export const createWishlist = createAsyncThunk(
  'marketplace/createWishlist',
  async ({ name, isPublic }: { name: string; isPublic?: boolean }) => {
    const response = await marketplaceApi.createWishlist(name, isPublic);
    return response.data;
  }
);

export const addToWishlist = createAsyncThunk(
  'marketplace/addToWishlist',
  async ({ wishlistId, productId }: { wishlistId: string; productId: string }) => {
    const response = await marketplaceApi.addToWishlist(wishlistId, productId);
    return response.data;
  }
);

export const removeFromWishlist = createAsyncThunk(
  'marketplace/removeFromWishlist',
  async ({ wishlistId, itemId }: { wishlistId: string; itemId: string }) => {
    await marketplaceApi.removeFromWishlist(wishlistId, itemId);
    return { wishlistId, itemId };
  }
);

export const getProductReviews = createAsyncThunk(
  'marketplace/getProductReviews',
  async ({ productId, page = 1, limit = 20 }: { productId: string; page?: number; limit?: number }) => {
    const response = await marketplaceApi.getProductReviews(productId, page, limit);
    return response.data;
  }
);

export const createReview = createAsyncThunk(
  'marketplace/createReview',
  async (reviewData: any) => {
    const response = await marketplaceApi.createReview(reviewData);
    return response.data;
  }
);

export const markReviewHelpful = createAsyncThunk(
  'marketplace/markReviewHelpful',
  async ({ reviewId, helpful }: { reviewId: string; helpful: boolean }) => {
    await marketplaceApi.markReviewHelpful(reviewId, helpful);
    return { reviewId, helpful };
  }
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
      state.relatedProducts = [];
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearCurrentWishlist: (state) => {
      state.currentWishlist = null;
    },
    updateCartItemQuantity: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
      if (state.cart) {
        const item = state.cart.items.find(i => i.id === action.payload.itemId);
        if (item) {
          const diff = action.payload.quantity - item.quantity;
          item.quantity = action.payload.quantity;
          state.cart.totalItems += diff;
          state.cart.totalCap += diff * item.priceCap;
          state.cart.totalFiat += diff * item.priceFiat;
        }
      }
    },
    resetMarketplace: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // Search Products
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.meta?.page === 1) {
          state.products = action.payload.products;
        } else {
          state.products = [...state.products, ...action.payload.products];
        }
        state.productPagination = {
          page: action.payload.meta?.page || 1,
          limit: action.payload.meta?.limit || 20,
          total: action.payload.meta?.total || 0,
          hasMore: action.payload.meta?.hasMore || false,
        };
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to search products';
      })

      // Get Product By ID
      .addCase(getProductById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProduct = action.payload;
      })
      .addCase(getProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load product';
      })

      // Get Related Products
      .addCase(getRelatedProducts.fulfilled, (state, action) => {
        state.relatedProducts = action.payload;
      })

      // Get Featured Products
      .addCase(getFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload;
      })

      // Get Categories
      .addCase(getCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })

      // Get Cart
      .addCase(getCart.fulfilled, (state, action) => {
        state.cart = action.payload;
      })

      // Add To Cart
      .addCase(addToCart.fulfilled, (state, action) => {
        state.cart = action.payload;
      })

      // Update Cart Item
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.cart = action.payload;
      })

      // Remove From Cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        if (state.cart) {
          state.cart.items = state.cart.items.filter(i => i.id !== action.payload);
          state.cart.totalItems = state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
          state.cart.totalCap = state.cart.items.reduce((sum, i) => sum + (i.priceCap * i.quantity), 0);
          state.cart.totalFiat = state.cart.items.reduce((sum, i) => sum + (i.priceFiat * i.quantity), 0);
        }
      })

      // Clear Cart
      .addCase(clearCart.fulfilled, (state) => {
        state.cart = null;
      })

      // Checkout
      .addCase(checkout.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkout.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders.unshift(action.payload.order);
        state.cart = null;
      })
      .addCase(checkout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Checkout failed';
      })

      // Get Orders
      .addCase(getOrders.fulfilled, (state, action) => {
        state.orders = action.payload.orders;
        state.orderPagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Get Order By ID
      .addCase(getOrderById.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })

      // Cancel Order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })

      // Get Wishlists
      .addCase(getWishlists.fulfilled, (state, action) => {
        state.wishlists = action.payload;
      })

      // Create Wishlist
      .addCase(createWishlist.fulfilled, (state, action) => {
        state.wishlists.push(action.payload);
      })

      // Add To Wishlist
      .addCase(addToWishlist.fulfilled, (state, action) => {
        const wishlist = state.wishlists.find(w => w.id === action.meta.arg.wishlistId);
        if (wishlist) {
          wishlist.items.push(action.payload.product);
          wishlist.itemCount += 1;
        }
      })

      // Remove From Wishlist
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        const wishlist = state.wishlists.find(w => w.id === action.payload.wishlistId);
        if (wishlist) {
          wishlist.items = wishlist.items.filter(i => i.id !== action.payload.itemId);
          wishlist.itemCount -= 1;
        }
      })

      // Get Product Reviews
      .addCase(getProductReviews.fulfilled, (state, action) => {
        state.reviews = action.payload.reviews;
      })

      // Create Review
      .addCase(createReview.fulfilled, (state, action) => {
        state.reviews.unshift(action.payload);
      })

      // Mark Review Helpful
      .addCase(markReviewHelpful.fulfilled, (state, action) => {
        const review = state.reviews.find(r => r.id === action.payload.reviewId);
        if (review) {
          if (action.payload.helpful) {
            review.helpfulCount += 1;
          } else {
            review.helpfulCount -= 1;
          }
        }
      });
  },
});

export const { 
  clearCurrentProduct, 
  clearCurrentOrder, 
  clearCurrentWishlist,
  updateCartItemQuantity,
  resetMarketplace 
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;