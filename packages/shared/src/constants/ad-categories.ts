/**
 * Ad categories based on PRD Section 3.0 - Ad Category System
 */

import { AdCategory } from '../types/campaign.types';

// Category definitions with PRD references
export const AD_CATEGORIES = {
  [AdCategory.AWARENESS]: {
    id: 'CAT-01',
    name: 'Awareness Ads',
    description: 'Introduce new brands, products, or services to the market',
    examples: ['New company launch', 'Brand awareness campaigns', 'Event announcements'],
    icon: 'awareness',
    color: '#6366f1', // Indigo
  },
  [AdCategory.PUBLIC_SERVICE]: {
    id: 'CAT-02',
    name: 'Public Service Ads',
    description: 'Government and NGO information for public benefit',
    examples: ['Election announcements', 'Health campaigns', 'Public safety information', 'Education programs'],
    icon: 'public-service',
    color: '#10b981', // Emerald
  },
  [AdCategory.PRODUCT_LAUNCH]: {
    id: 'CAT-03',
    name: 'Product Launch Ads',
    description: 'Introduce new products to the market',
    examples: ['New smartphone launch', 'Car model debut', 'Software release'],
    icon: 'rocket',
    color: '#f59e0b', // Amber
  },
  [AdCategory.SALES_PROMOTION]: {
    id: 'CAT-04',
    name: 'Sales & Promotions',
    description: 'Drive immediate purchases with discounts and offers',
    examples: ['Flash sales', 'Seasonal discounts', 'Limited offers', 'Bundle deals'],
    icon: 'sale',
    color: '#ef4444', // Red
  },
  [AdCategory.LIVE_DEMO]: {
    id: 'CAT-05',
    name: 'Live Demonstrations',
    description: 'Real-time product demonstrations and showcases',
    examples: ['Cooking demos', 'Tech unboxings', 'Product testing', 'Q&A sessions'],
    icon: 'live',
    color: '#8b5cf6', // Violet
  },
  [AdCategory.RECRUITMENT]: {
    id: 'CAT-06',
    name: 'Recruitment Ads',
    description: 'Job opportunities and career listings',
    examples: ['Job postings', 'Internship programs', 'Career fairs', 'Recruitment drives'],
    icon: 'recruitment',
    color: '#06b6d4', // Cyan
  },
  [AdCategory.EDUCATIONAL]: {
    id: 'CAT-07',
    name: 'Educational Ads',
    description: 'Promote learning, courses, and training programs',
    examples: ['Online courses', 'Workshops', 'Training programs', 'School promotions'],
    icon: 'education',
    color: '#14b8a6', // Teal
  },
  [AdCategory.COMMUNITY]: {
    id: 'CAT-08',
    name: 'Community Ads',
    description: 'Promote community activities and local events',
    examples: ['Local events', 'Charity campaigns', 'Religious events', 'Cultural festivals'],
    icon: 'community',
    color: '#f97316', // Orange
  },
  [AdCategory.MARKETPLACE]: {
    id: 'CAT-09',
    name: 'Marketplace Ads',
    description: 'Direct product sales and listings',
    examples: ['Electronics', 'Clothing', 'Real estate', 'Vehicles', 'Services'],
    icon: 'marketplace',
    color: '#64748b', // Slate
  },
  [AdCategory.SPONSORED_CONTENT]: {
    id: 'CAT-10',
    name: 'Sponsored Content',
    description: 'Influencer promotions and sponsored posts',
    examples: ['Influencer promotions', 'Sponsored tutorials', 'Product reviews', 'Brand partnerships'],
    icon: 'sponsored',
    color: '#ec4899', // Pink
  },
} as const;

// Category hierarchy (parent-child relationships)
export const CATEGORY_HIERARCHY = {
  [AdCategory.AWARENESS]: [],
  [AdCategory.PUBLIC_SERVICE]: [],
  [AdCategory.PRODUCT_LAUNCH]: [AdCategory.AWARENESS],
  [AdCategory.SALES_PROMOTION]: [AdCategory.AWARENESS],
  [AdCategory.LIVE_DEMO]: [AdCategory.PRODUCT_LAUNCH, AdCategory.SALES_PROMOTION],
  [AdCategory.RECRUITMENT]: [AdCategory.PUBLIC_SERVICE],
  [AdCategory.EDUCATIONAL]: [AdCategory.PUBLIC_SERVICE],
  [AdCategory.COMMUNITY]: [AdCategory.PUBLIC_SERVICE],
  [AdCategory.MARKETPLACE]: [AdCategory.SALES_PROMOTION],
  [AdCategory.SPONSORED_CONTENT]: [AdCategory.AWARENESS, AdCategory.PRODUCT_LAUNCH],
} as const;

// Billboard sections (from PRD UI design)
export const BILLBOARD_SECTIONS = [
  {
    id: 'trending',
    name: '🔥 TRENDING NOW',
    description: 'Most engaged content right now',
    categories: [AdCategory.PRODUCT_LAUNCH, AdCategory.LIVE_DEMO, AdCategory.SPONSORED_CONTENT],
  },
  {
    id: 'live',
    name: '📺 LIVE NOW',
    description: 'Currently streaming live demonstrations',
    categories: [AdCategory.LIVE_DEMO],
  },
  {
    id: 'just-launched',
    name: '🆕 JUST LAUNCHED',
    description: 'New campaigns and products',
    categories: [AdCategory.PRODUCT_LAUNCH, AdCategory.AWARENESS],
  },
  {
    id: 'top-earning',
    name: '💰 TOP EARNING OPPORTUNITIES',
    description: 'Best CAP rewards available',
    categories: Object.values(AdCategory),
    sortBy: 'reward',
  },
  {
    id: 'near-you',
    name: '📍 NEAR YOU',
    description: 'Local campaigns and events',
    categories: [AdCategory.COMMUNITY, AdCategory.SALES_PROMOTION],
    requiresLocation: true,
  },
  {
    id: 'categories',
    name: '📂 CATEGORIES',
    description: 'Browse by category',
    isNavigation: true,
  },
] as const;

// Category icons mapping
export const CATEGORY_ICONS: Record<AdCategory, string> = {
  [AdCategory.AWARENESS]: '🎯',
  [AdCategory.PUBLIC_SERVICE]: '🏛️',
  [AdCategory.PRODUCT_LAUNCH]: '🚀',
  [AdCategory.SALES_PROMOTION]: '🏷️',
  [AdCategory.LIVE_DEMO]: '📺',
  [AdCategory.RECRUITMENT]: '💼',
  [AdCategory.EDUCATIONAL]: '📚',
  [AdCategory.COMMUNITY]: '🤝',
  [AdCategory.MARKETPLACE]: '🛍️',
  [AdCategory.SPONSORED_CONTENT]: '✨',
};

// Category display preferences
export const CATEGORY_DISPLAY = {
  gridColumns: {
    mobile: 2,
    tablet: 3,
    desktop: 4,
  },
  showInNavigation: true,
  allowMultiSelect: true,
  maxSelectable: 5,
} as const;