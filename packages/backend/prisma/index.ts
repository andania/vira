/**
 * Prisma Index
 * Central export point for Prisma client and types
 */

import { PrismaClient } from '@prisma/client';

// Export Prisma client
export * from '@prisma/client';

// Export seed data
export * from './seed-data/permissions';
export * from './seed-data/roles';
export * from './seed-data/categories';
export * from './seed-data/levels';
export * from './seed-data/achievements';
export * from './seed-data/settings';
export * from './seed-data/test-users';

// Create and configure Prisma client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Export types
export type { 
  User,
  Profile,
  Campaign,
  Room,
  Product,
  Order,
  Transaction,
  Notification 
} from '@prisma/client';

// Export utility type for pagination
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Export utility function for pagination
export const paginate = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Export transaction helper
export const transaction = prisma.$transaction;

// Export raw query helper
export const rawQuery = prisma.$queryRaw;

// Export disconnect helper (for graceful shutdown)
export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

export default prisma;