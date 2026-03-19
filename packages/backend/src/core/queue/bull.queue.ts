/**
 * Bull Queue System
 * Background job processing with Redis
 */

import Queue from 'bull';
import { logger } from '../logger';
import { config } from '../../config';
import Redis from 'ioredis';

// Queue names
export const QueueNames = {
  CAP_DECAY: 'cap-decay',
  LEADERBOARD: 'leaderboard',
  ANALYTICS: 'analytics',
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  CAMPAIGN: 'campaign',
  REPORT: 'report',
  CLEANUP: 'cleanup',
} as const;

export type QueueName = typeof QueueNames[keyof typeof QueueNames];

// Queue options
const defaultQueueOptions: Queue.QueueOptions = {
  redis: {
    host: config.redisUrl.split('://')[1]?.split(':')[0] || 'localhost',
    port: parseInt(config.redisUrl.split(':')[2] || '6379'),
    password: config.redisPassword,
    db: config.redisDb,
    retryStrategy: (times: number) => {
      return Math.min(times * 100, 3000);
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
  limiter: {
    max: 100, // Max jobs processed per duration
    duration: 1000, // Per second
  },
};

// Queue instances
export const queues: Record<QueueName, Queue.Queue> = {} as any;

// Initialize all queues
export const initializeQueues = () => {
  Object.values(QueueNames).forEach((queueName) => {
    const queue = new Queue(queueName, defaultQueueOptions);
    
    // Queue event handlers
    queue.on('ready', () => {
      logger.info(`✅ Queue ${queueName} ready`);
    });

    queue.on('error', (error) => {
      logger.error(`❌ Queue ${queueName} error:`, error);
    });

    queue.on('completed', (job, result) => {
      logger.debug(`✅ Job ${job.id} (${queueName}) completed`, { result });
    });

    queue.on('failed', (job, error) => {
      logger.error(`❌ Job ${job?.id} (${queueName}) failed:`, error);
    });

    queue.on('stalled', (job) => {
      logger.warn(`⚠️ Job ${job.id} (${queueName}) stalled`);
    });

    queues[queueName] = queue;
  });

  logger.info('✅ All queues initialized');
};

// Graceful shutdown
export const closeQueues = async () => {
  const closePromises = Object.values(queues).map(queue => queue.close());
  await Promise.all(closePromises);
  logger.info('✅ All queues closed');
};

// Queue service for job operations
export class QueueService {
  /**
   * Add job to queue
   */
  static async add(
    queueName: QueueName,
    jobName: string,
    data: any,
    options?: Queue.JobOptions
  ) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, options);
    logger.debug(`📦 Job ${job.id} added to ${queueName} queue`);
    return job;
  }

  /**
   * Add bulk jobs
   */
  static async addBulk(
    queueName: QueueName,
    jobs: Array<{ name: string; data: any; options?: Queue.JobOptions }>
  ) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const added = await queue.addBulk(jobs);
    logger.debug(`📦 ${jobs.length} jobs added to ${queueName} queue`);
    return added;
  }

  /**
   * Get job by ID
   */
  static async getJob(queueName: QueueName, jobId: string) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJob(jobId);
  }

  /**
   * Get waiting jobs
   */
  static async getWaiting(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getWaiting();
  }

  /**
   * Get active jobs
   */
  static async getActive(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getActive();
  }

  /**
   * Get completed jobs
   */
  static async getCompleted(queueName: QueueName, start?: number, end?: number) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getCompleted(start, end);
  }

  /**
   * Get failed jobs
   */
  static async getFailed(queueName: QueueName, start?: number, end?: number) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getFailed(start, end);
  }

  /**
   * Get job counts
   */
  static async getJobCounts(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJobCounts();
  }

  /**
   * Pause queue
   */
  static async pause(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`⏸️ Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   */
  static async resume(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`▶️ Queue ${queueName} resumed`);
  }

  /**
   * Clean queue
   */
  static async clean(
    queueName: QueueName,
    grace: number,
    status?: 'completed' | 'wait' | 'active' | 'delayed' | 'failed'
  ) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const cleaned = await queue.clean(grace, status);
    logger.info(`🧹 Queue ${queueName} cleaned: ${cleaned.length} jobs removed`);
    return cleaned;
  }

  /**
   * Empty queue
   */
  static async empty(queueName: QueueName) {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
    logger.info(`🗑️ Queue ${queueName} emptied`);
  }
}

export default queues;