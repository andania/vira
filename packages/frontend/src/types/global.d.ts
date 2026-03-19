/**
 * Global TypeScript Declarations
 */

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly REACT_APP_API_URL?: string;
    readonly REACT_APP_SOCKET_URL?: string;
    readonly REACT_APP_VERSION?: string;
    readonly REACT_APP_ENABLE_LIVE_STREAMING?: string;
    readonly REACT_APP_ENABLE_MARKETPLACE?: string;
    readonly REACT_APP_ENABLE_GAMIFICATION?: string;
    readonly REACT_APP_ENABLE_AI?: string;
    readonly REACT_APP_ENABLE_PUSH?: string;
  }
}

// Window object extensions
interface Window {
  ethereum?: any;
  grecaptcha?: any;
  fbq?: any;
  gtag?: any;
}

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path?: string;
    duration?: number;
    requestId?: string;
  };
}

// Paginated response
interface PaginatedResponse<T> {
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

// User types
interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  accountType: 'USER' | 'SPONSOR' | 'ADMIN' | 'MODERATOR';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: UserProfile;
  createdAt: string;
}

interface UserProfile {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  interests?: string[];
}

// CAP Wallet types
interface Wallet {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  isFrozen: boolean;
}

interface Transaction {
  id: string;
  type: 'EARN' | 'SPEND' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

// Campaign types
interface Campaign {
  id: string;
  name: string;
  description?: string;
  objective: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  dailyBudget?: number;
  brand: Brand;
  metrics?: CampaignMetrics;
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  engagements: number;
  capSpent: number;
}

// Room types
interface Room {
  id: string;
  name: string;
  description?: string;
  roomType: string;
  status: string;
  visibility: string;
  participantCount: number;
  host?: User;
  brand?: Brand;
}

// Product types
interface Product {
  id: string;
  name: string;
  description?: string;
  priceCap?: number;
  priceFiat?: number;
  currency: string;
  stockQuantity: number;
  images: ProductImage[];
  brand: Brand;
  ratingAvg: number;
  ratingCount: number;
}

interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
}

// Brand types
interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  verified: boolean;
}

// Order types
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalFiat: number;
  totalCap?: number;
  items: OrderItem[];
  placedAt: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceFiat: number;
  totalPriceFiat: number;
}

// Notification types
interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// Achievement types
interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  completed: boolean;
  rewardCap: number;
  iconUrl?: string;
}

// Rank types
interface Rank {
  level: number;
  name: string;
  displayName: string;
  progress: {
    current: number;
    next: number;
    percentage: number;
  };
  benefits: {
    capMultiplier: number;
    dailyCapLimit: number;
    withdrawalLimit: number;
  };
}