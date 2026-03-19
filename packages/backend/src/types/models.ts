/**
 * Database Model Type Definitions
 * (Type definitions for Prisma models)
 */

import { Prisma } from '@prisma/client';

// User types
export type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

export type UserWithWallet = Prisma.UserGetPayload<{
  include: { wallet: true };
}>;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    preferences: true;
    wallet: true;
    statistics: true;
  };
}>;

// Campaign types
export type CampaignWithBrand = Prisma.CampaignGetPayload<{
  include: { brand: true };
}>;

export type CampaignWithAds = Prisma.CampaignGetPayload<{
  include: { ads: true };
}>;

export type CampaignWithMetrics = Prisma.CampaignGetPayload<{
  include: { metrics: true };
}>;

export type CampaignFull = Prisma.CampaignGetPayload<{
  include: {
    brand: true;
    ads: {
      include: {
        assets: true;
      };
    };
    budgets: true;
    capAllocations: true;
    targets: true;
    metrics: true;
  };
}>;

// Room types
export type RoomWithHosts = Prisma.RoomGetPayload<{
  include: { hosts: true };
}>;

export type RoomWithParticipants = Prisma.RoomGetPayload<{
  include: {
    participants: {
      where: { isActive: true };
    };
  };
}>;

export type RoomFull = Prisma.RoomGetPayload<{
  include: {
    brand: true;
    hosts: {
      include: {
        user: {
          select: {
            username: true;
            profile: true;
          };
        };
      };
    };
    participants: {
      where: { isActive: true };
      include: {
        user: {
          select: {
            username: true;
            profile: true;
          };
        };
      };
    };
  };
}>;

// Product types
export type ProductWithBrand = Prisma.ProductGetPayload<{
  include: { brand: true };
}>;

export type ProductWithImages = Prisma.ProductGetPayload<{
  include: { images: true };
}>;

export type ProductWithReviews = Prisma.ProductGetPayload<{
  include: {
    reviews: {
      where: { status: 'approved' };
      include: {
        user: {
          select: {
            username: true;
            profile: true;
          };
        };
      };
    };
  };
}>;

export type ProductFull = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: true;
    images: true;
    variants: true;
    reviews: {
      where: { status: 'approved' };
      include: {
        user: {
          select: {
            username: true;
            profile: true;
          };
        };
      };
    };
  };
}>;

// Order types
export type OrderWithUser = Prisma.OrderGetPayload<{
  include: { user: true };
}>;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type OrderFull = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: {
      include: {
        product: {
          include: {
            images: true;
          };
        };
      };
    };
    shippingAddress: true;
    billingAddress: true;
    payments: true;
    statusHistory: true;
    shipments: true;
  };
}>;

// Transaction types
export type TransactionWithWallet = Prisma.CapTransactionGetPayload<{
  include: { wallet: true };
}>;

export type TransactionFull = Prisma.CapTransactionGetPayload<{
  include: {
    wallet: {
      include: {
        user: true;
      };
    };
  };
}>;

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    firstItem: number;
    lastItem: number;
  };
}

// Date range filter
export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

// Search filters
export interface SearchFilters {
  query?: string;
  status?: string;
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}