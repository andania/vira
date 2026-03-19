/**
 * General Helper Utilities
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Generate short ID
 */
export const generateShortId = (length: number = 8): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * Check if value is empty
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Get value or default
 */
export const getOrDefault = <T>(value: T | null | undefined, defaultValue: T): T => {
  return value ?? defaultValue;
};

/**
 * Retry a function with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onError,
  } = options;

  let attempt = 1;
  let delay = initialDelay;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      onError?.(error as Error, attempt);
      
      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
      attempt++;
    }
  }

  throw new Error('Retry failed');
};

/**
 * Parse JSON safely
 */
export const safeJsonParse = <T>(json: string, defaultValue?: T): T | undefined => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Stringify JSON safely
 */
export const safeJsonStringify = (value: any, defaultValue?: string): string | undefined => {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
};

/**
 * Extract error message from error object
 */
export const getErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return error.message;
  return 'Unknown error';
};

/**
 * Create a memoized function
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  options: { maxSize?: number; ttl?: number } = {}
): T => {
  const cache = new Map();
  const { maxSize = 100, ttl = 0 } = options;

  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      const { value, expires } = cache.get(key);
      if (!expires || expires > Date.now()) {
        return value;
      }
      cache.delete(key);
    }

    const result = fn(...args);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, {
      value: result,
      expires: ttl ? Date.now() + ttl : null,
    });

    return result;
  }) as T;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Measure execution time
 */
export const measureTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

/**
 * Batch array into chunks
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remove duplicates from array
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Shuffle array
 */
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Pick specific keys from object
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

/**
 * Omit specific keys from object
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge objects deeply
 */
export const deepMerge = <T extends object, U extends object>(
  target: T,
  source: U
): T & U => {
  const result = { ...target } as any;
  
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Flatten nested object
 */
export const flatten = (
  obj: any,
  prefix: string = '',
  result: Record<string, any> = {}
): Record<string, any> => {
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
};