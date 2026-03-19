/**
 * Pagination Utilities
 * For handling paginated responses
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

const DEFAULT_OPTIONS: PaginationOptions = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'desc',
};

/**
 * Parse and validate pagination parameters
 */
export const getPaginationParams = (
  params: Partial<PaginationParams>,
  options: PaginationOptions = {}
): Required<PaginationParams> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const page = Math.max(1, parseInt(String(params.page)) || 1);
  const limit = Math.min(
    opts.maxLimit!,
    Math.max(1, parseInt(String(params.limit)) || opts.defaultLimit!)
  );
  const sortBy = params.sortBy || opts.defaultSortBy!;
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = params.search || '';
  const filters = params.filters || {};
  
  return {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    filters,
  };
};

/**
 * Calculate pagination metadata
 */
export const getPaginationMeta = <T>(
  data: T[],
  totalItems: number,
  params: Required<PaginationParams>
): PaginationMeta => {
  const { page, limit } = params;
  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;
  const firstItem = (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, totalItems);
  
  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNext,
    hasPrevious,
    firstItem,
    lastItem,
  };
};

/**
 * Create a paginated response
 */
export const paginate = <T>(
  data: T[],
  totalItems: number,
  params: Required<PaginationParams>
): PaginatedResponse<T> => {
  return {
    data,
    meta: getPaginationMeta(data, totalItems, params),
  };
};

/**
 * Calculate offset for database queries
 */
export const getOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Parse sorting for database queries
 */
export const getSorting = (
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): { field: string; order: 'asc' | 'desc' } => {
  return {
    field: sortBy,
    order: sortOrder,
  };
};

/**
 * Parse filters for database queries
 */
export const parseFilters = (filters: Record<string, any>): Record<string, any> => {
  const parsed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle special filter operators
      if (typeof value === 'object' && value !== null) {
        if ('min' in value || 'max' in value) {
          // Range filter
          parsed[key] = value;
        } else if ('in' in value) {
          // IN filter
          parsed[key] = { in: Array.isArray(value.in) ? value.in : [value.in] };
        } else if ('like' in value) {
          // LIKE filter
          parsed[key] = { contains: value.like };
        }
      } else {
        // Exact match
        parsed[key] = value;
      }
    }
  }
  
  return parsed;
};

/**
 * Get next page URL
 */
export const getNextPageUrl = (
  baseUrl: string,
  params: Required<PaginationParams>,
  hasNext: boolean
): string | null => {
  if (!hasNext) return null;
  
  const url = new URL(baseUrl);
  url.searchParams.set('page', String(params.page + 1));
  url.searchParams.set('limit', String(params.limit));
  if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
  if (params.search) url.searchParams.set('search', params.search);
  
  return url.toString();
};

/**
 * Get previous page URL
 */
export const getPreviousPageUrl = (
  baseUrl: string,
  params: Required<PaginationParams>,
  hasPrevious: boolean
): string | null => {
  if (!hasPrevious) return null;
  
  const url = new URL(baseUrl);
  url.searchParams.set('page', String(params.page - 1));
  url.searchParams.set('limit', String(params.limit));
  if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
  if (params.search) url.searchParams.set('search', params.search);
  
  return url.toString();
};

/**
 * Get pagination links
 */
export const getPaginationLinks = (
  baseUrl: string,
  params: Required<PaginationParams>,
  totalItems: number
): PaginationLinks => {
  const meta = getPaginationMeta([], totalItems, params);
  
  return {
    first: `${baseUrl}?page=1&limit=${params.limit}`,
    last: `${baseUrl}?page=${meta.totalPages}&limit=${params.limit}`,
    prev: getPreviousPageUrl(baseUrl, params, meta.hasPrevious),
    next: getNextPageUrl(baseUrl, params, meta.hasNext),
    self: `${baseUrl}?page=${params.page}&limit=${params.limit}`,
  };
};

/**
 * Generate pagination for Prisma
 */
export const getPrismaPagination = (
  params: Required<PaginationParams>
): {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
} => {
  return {
    skip: getOffset(params.page, params.limit),
    take: params.limit,
    orderBy: { [params.sortBy]: params.sortOrder },
  };
};

/**
 * Generate pagination for SQL
 */
export const getSqlPagination = (
  params: Required<PaginationParams>
): string => {
  const offset = getOffset(params.page, params.limit);
  return `LIMIT ${params.limit} OFFSET ${offset}`;
};

// Types
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  firstItem: number;
  lastItem: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
  self: string;
}