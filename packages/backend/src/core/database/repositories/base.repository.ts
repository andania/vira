/**
 * Base Repository
 * Generic CRUD operations with type safety
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../client';
import { logger } from '../../logger';
import { ApiErrorCode, createPaginatedResponse, getPaginationParams } from '@viraz/shared';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface FindAllParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
  include?: Record<string, any>;
  select?: Record<string, any>;
}

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  protected abstract modelName: string;
  protected abstract prismaModel: any;

  /**
   * Create a new record
   */
  async create(data: CreateDTO, tx?: TransactionClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].create({
        data,
      });
      return result;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  async findById(id: string, options?: { include?: any; select?: any }): Promise<T | null> {
    try {
      const result = await prisma[this.modelName].findUnique({
        where: { id },
        ...options,
      });
      return result;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find one record by criteria
   */
  async findOne(where: any, options?: { include?: any; select?: any }): Promise<T | null> {
    try {
      const result = await prisma[this.modelName].findFirst({
        where,
        ...options,
      });
      return result;
    } catch (error) {
      logger.error(`Error finding one ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find all records with pagination
   */
  async findAll(params: FindAllParams = {}) {
    try {
      const { page, limit, sortBy, sortOrder, filters, include, select } = getPaginationParams(params);
      
      const where = {
        ...filters,
        deletedAt: null,
      };

      const [data, total] = await Promise.all([
        prisma[this.modelName].findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
          include,
          select,
        }),
        prisma[this.modelName].count({ where }),
      ]);

      return createPaginatedResponse(data, total, { page, limit, sortBy, sortOrder });
    } catch (error) {
      logger.error(`Error finding all ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: UpdateDTO, tx?: TransactionClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].update({
        where: { id },
        data,
      });
      return result;
    } catch (error) {
      logger.error(`Error updating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update many records
   */
  async updateMany(where: any, data: any, tx?: TransactionClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].updateMany({
        where,
        data,
      });
      return result.count;
    } catch (error) {
      logger.error(`Error updating many ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete record by ID
   */
  async delete(id: string, tx?: TransactionClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return result;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Hard delete record by ID (use with caution)
   */
  async hardDelete(id: string, tx?: TransactionClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].delete({
        where: { id },
      });
      return result;
    } catch (error) {
      logger.error(`Error hard deleting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete many records
   */
  async deleteMany(where: any, tx?: TransactionClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].updateMany({
        where,
        data: { deletedAt: new Date() },
      });
      return result.count;
    } catch (error) {
      logger.error(`Error deleting many ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(where: any): Promise<boolean> {
    try {
      const count = await prisma[this.modelName].count({ where });
      return count > 0;
    } catch (error) {
      logger.error(`Error checking existence of ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(where: any = {}): Promise<number> {
    try {
      const count = await prisma[this.modelName].count({ where });
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Execute in transaction
   */
  async transaction<T>(
    fn: (tx: TransactionClient) => Promise<T>
  ): Promise<T> {
    try {
      return await prisma.$transaction(fn);
    } catch (error) {
      logger.error(`Error in transaction for ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find or create record
   */
  async findOrCreate(where: any, data: CreateDTO): Promise<T> {
    try {
      const existing = await this.findOne(where);
      if (existing) {
        return existing;
      }
      return this.create(data);
    } catch (error) {
      logger.error(`Error in findOrCreate for ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Upsert record
   */
  async upsert(where: any, create: CreateDTO, update: UpdateDTO): Promise<T> {
    try {
      const result = await prisma[this.modelName].upsert({
        where,
        create,
        update,
      });
      return result;
    } catch (error) {
      logger.error(`Error upserting ${this.modelName}:`, error);
      throw error;
    }
  }
}

export default BaseRepository;