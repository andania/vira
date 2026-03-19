/**
 * Seed Data - Ad Categories
 * Based on PRD Section 3.0 - Ad Category System
 */

import { Prisma } from '@prisma/client';

export const adCategories: Prisma.AdCategoryCreateInput[] = [
  {
    categoryId: 'CAT-01',
    name: 'Awareness Ads',
    description: 'Introduce new brands, products, or services to the market',
    iconUrl: '/icons/awareness.png',
    sortOrder: 1,
  },
  {
    categoryId: 'CAT-02',
    name: 'Public Service Ads',
    description: 'Government and NGO information for public benefit',
    iconUrl: '/icons/public-service.png',
    sortOrder: 2,
  },
  {
    categoryId: 'CAT-03',
    name: 'Product Launch Ads',
    description: 'Introduce new products to the market',
    iconUrl: '/icons/product-launch.png',
    sortOrder: 3,
  },
  {
    categoryId: 'CAT-04',
    name: 'Sales & Promotions',
    description: 'Drive immediate purchases with discounts and offers',
    iconUrl: '/icons/sales.png',
    sortOrder: 4,
  },
  {
    categoryId: 'CAT-05',
    name: 'Live Demonstrations',
    description: 'Real-time product demonstrations and showcases',
    iconUrl: '/icons/live.png',
    sortOrder: 5,
  },
  {
    categoryId: 'CAT-06',
    name: 'Recruitment Ads',
    description: 'Job opportunities and career listings',
    iconUrl: '/icons/recruitment.png',
    sortOrder: 6,
  },
  {
    categoryId: 'CAT-07',
    name: 'Educational Ads',
    description: 'Promote learning, courses, and training programs',
    iconUrl: '/icons/education.png',
    sortOrder: 7,
  },
  {
    categoryId: 'CAT-08',
    name: 'Community Ads',
    description: 'Promote community activities and local events',
    iconUrl: '/icons/community.png',
    sortOrder: 8,
  },
  {
    categoryId: 'CAT-09',
    name: 'Marketplace Ads',
    description: 'Direct product sales and listings',
    iconUrl: '/icons/marketplace.png',
    sortOrder: 9,
  },
  {
    categoryId: 'CAT-10',
    name: 'Sponsored Content',
    description: 'Influencer promotions and sponsored posts',
    iconUrl: '/icons/sponsored.png',
    sortOrder: 10,
  },
];

// Billboard sections based on PRD UI design
export const billboardSections = [
  {
    id: 'trending',
    name: '🔥 TRENDING NOW',
    description: 'Most engaged content right now',
    categories: ['CAT-03', 'CAT-05', 'CAT-10'],
  },
  {
    id: 'live',
    name: '📺 LIVE NOW',
    description: 'Currently streaming live demonstrations',
    categories: ['CAT-05'],
  },
  {
    id: 'just-launched',
    name: '🆕 JUST LAUNCHED',
    description: 'New campaigns and products',
    categories: ['CAT-01', 'CAT-03'],
  },
  {
    id: 'top-earning',
    name: '💰 TOP EARNING OPPORTUNITIES',
    description: 'Best CAP rewards available',
    categories: ['CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'CAT-06', 'CAT-07', 'CAT-08', 'CAT-09', 'CAT-10'],
  },
  {
    id: 'near-you',
    name: '📍 NEAR YOU',
    description: 'Local campaigns and events',
    categories: ['CAT-02', 'CAT-04', 'CAT-08'],
  },
];

export const productCategories: Prisma.ProductCategoryCreateInput[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Gadgets, devices, and tech accessories',
    iconUrl: '/icons/electronics.png',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing, accessories, and apparel',
    iconUrl: '/icons/fashion.png',
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, decor, and household items',
    iconUrl: '/icons/home.png',
  },
  {
    name: 'Beauty & Health',
    slug: 'beauty-health',
    description: 'Cosmetics, wellness, and personal care',
    iconUrl: '/icons/beauty.png',
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Fitness equipment, outdoor gear, sportswear',
    iconUrl: '/icons/sports.png',
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Cars, parts, and accessories',
    iconUrl: '/icons/automotive.png',
  },
  {
    name: 'Books & Media',
    slug: 'books-media',
    description: 'Books, movies, music, and digital media',
    iconUrl: '/icons/books.png',
  },
  {
    name: 'Toys & Games',
    slug: 'toys-games',
    description: 'Toys, board games, and video games',
    iconUrl: '/icons/toys.png',
  },
  {
    name: 'Food & Beverages',
    slug: 'food-beverages',
    description: 'Groceries, drinks, and culinary items',
    iconUrl: '/icons/food.png',
  },
  {
    name: 'Services',
    slug: 'services',
    description: 'Professional services and consultations',
    iconUrl: '/icons/services.png',
  },
];