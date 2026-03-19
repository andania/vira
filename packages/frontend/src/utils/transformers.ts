/**
 * Data Transformers
 * Convert between backend snake_case and frontend camelCase
 */

// ============================================
// Case Transformers
// ============================================

export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const transformKeysToCamel = <T extends Record<string, any>>(obj: T): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => transformKeysToCamel(item));

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = snakeToCamel(key);
    acc[camelKey] = transformKeysToCamel(obj[key]);
    return acc;
  }, {} as any);
};

export const transformKeysToSnake = <T extends Record<string, any>>(obj: T): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => transformKeysToSnake(item));

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = camelToSnake(key);
    acc[snakeKey] = transformKeysToSnake(obj[key]);
    return acc;
  }, {} as any);
};

// ============================================
// Date Transformers
// ============================================

export const dateToISO = (date: Date | string | null | undefined): string | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return date;
};

export const isoToDate = (isoString: string | null | undefined): Date | undefined => {
  if (!isoString) return undefined;
  try {
    return new Date(isoString);
  } catch {
    return undefined;
  }
};

export const formatDateForDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTimeForDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return formatDateForDisplay(d);
};

// ============================================
// Number Transformers
// ============================================

export const formatCurrency = (amount: number | null | undefined, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatCap = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '';
  return `${amount.toLocaleString()} CAP`;
};

export const formatCompactNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined) return '';
  return `${value.toFixed(decimals)}%`;
};

// ============================================
// String Transformers
// ============================================

export const truncate = (str: string | null | undefined, length: number = 100): string => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const titleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

export const slugToTitle = (slug: string | null | undefined): string => {
  if (!slug) return '';
  return titleCase(slug.replace(/-/g, ' '));
};

export const nameToSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

// ============================================
// Enum Transformers
// ============================================

export const enumToOptions = <T extends Record<string, string | number>>(
  enumObj: T,
  formatter?: (value: string) => string
): Array<{ label: string; value: T[keyof T] }> => {
  return Object.values(enumObj).map(value => ({
    label: formatter ? formatter(String(value)) : titleCase(String(value).replace(/_/g, ' ')),
    value,
  }));
};

export const enumToBadgeVariant = (status: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' => {
  const statusMap: Record<string, any> = {
    // User status
    ACTIVE: 'success',
    PENDING: 'warning',
    SUSPENDED: 'danger',
    BANNED: 'danger',
    DELETED: 'secondary',
    
    // Campaign status
    DRAFT: 'secondary',
    PENDING: 'warning',
    APPROVED: 'info',
    ACTIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'info',
    CANCELLED: 'danger',
    REJECTED: 'danger',
    
    // Room status
    LIVE: 'success',
    SCHEDULED: 'info',
    ENDED: 'secondary',
    
    // Order status
    pending: 'warning',
    processing: 'info',
    confirmed: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'danger',
    refunded: 'secondary',
    
    // Payment status
    paid: 'success',
    failed: 'danger',
  };
  
  return statusMap[status] || 'default';
};