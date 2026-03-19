/**
 * Background Jobs Index
 * Export all job processors and types
 */

import { QueueNames } from '../bull.queue';
import { logger } from '../../logger';

// Import job processors
import { CapDecayJob } from './cap-decay.job';
import { LeaderboardJob } from './leaderboard.job';
import { AnalyticsJob } from './analytics.job';
import { NotificationJob } from './notification.job';
import { EmailJob } from './email.job';
import { SmsJob } from './sms.job';
import { PushJob } from './push.job';
import { CampaignJob } from './campaign.job';
import { ReportJob } from './report.job';
import { CleanupJob } from './cleanup.job';

// Export job classes
export {
  CapDecayJob,
  LeaderboardJob,
  AnalyticsJob,
  NotificationJob,
  EmailJob,
  SmsJob,
  PushJob,
  CampaignJob,
  ReportJob,
  CleanupJob,
};

// Export job data interfaces
export * from './cap-decay.job';
export * from './leaderboard.job';
export * from './analytics.job';
export * from './notification.job';
export * from './email.job';
export * from './sms.job';
export * from './push.job';
export * from './campaign.job';
export * from './report.job';
export * from './cleanup.job';

// Map job names to processors
export const jobProcessors: Record<QueueNames, (job: any) => Promise<any>> = {
  [QueueNames.CAP_DECAY]: CapDecayJob.process,
  [QueueNames.LEADERBOARD]: LeaderboardJob.process,
  [QueueNames.ANALYTICS]: AnalyticsJob.process,
  [QueueNames.NOTIFICATION]: NotificationJob.process,
  [QueueNames.EMAIL]: EmailJob.process,
  [QueueNames.SMS]: SmsJob.process,
  [QueueNames.PUSH]: PushJob.process,
  [QueueNames.CAMPAIGN]: CampaignJob.process,
  [QueueNames.REPORT]: ReportJob.process,
  [QueueNames.CLEANUP]: CleanupJob.process,
};

// Initialize all job processors
export const initializeJobs = (queues: Record<QueueNames, any>) => {
  Object.entries(jobProcessors).forEach(([queueName, processor]) => {
    const queue = queues[queueName as QueueNames];
    if (queue) {
      queue.process(processor);
      logger.info(`🔄 Job processor initialized for ${queueName}`);
    } else {
      logger.warn(`⚠️ Queue ${queueName} not found for processor initialization`);
    }
  });
};

// Job scheduling helpers
export const scheduleJobs = async (queues: Record<QueueNames, any>) => {
  // Schedule CAP decay job (daily at midnight)
  await queues[QueueNames.CAP_DECAY].add(
    'daily-decay',
    { batchSize: 100 },
    { repeat: { cron: '0 0 * * *' } }
  );

  // Schedule leaderboard updates (hourly)
  await queues[QueueNames.LEADERBOARD].add(
    'global-leaderboard',
    { type: 'global', limit: 100 },
    { repeat: { cron: '0 * * * *' } }
  );

  await queues[QueueNames.LEADERBOARD].add(
    'weekly-leaderboard',
    { type: 'weekly', limit: 100 },
    { repeat: { cron: '0 * * * *' } }
  );

  await queues[QueueNames.LEADERBOARD].add(
    'monthly-leaderboard',
    { type: 'monthly', limit: 100 },
    { repeat: { cron: '0 * * * *' } }
  );

  // Schedule analytics aggregation (daily)
  await queues[QueueNames.ANALYTICS].add(
    'daily-analytics',
    { type: 'daily' },
    { repeat: { cron: '0 1 * * *' } } // 1 AM daily
  );

  await queues[QueueNames.ANALYTICS].add(
    'monthly-analytics',
    { type: 'monthly' },
    { repeat: { cron: '0 2 1 * *' } } // 2 AM on 1st of month
  );

  // Schedule report generation (weekly)
  await queues[QueueNames.REPORT].add(
    'weekly-reports',
    { type: 'weekly' },
    { repeat: { cron: '0 3 * * 1' } } // 3 AM every Monday
  );

  // Schedule cleanup job (daily)
  await queues[QueueNames.CLEANUP].add(
    'daily-cleanup',
    { olderThan: 30 }, // 30 days
    { repeat: { cron: '0 4 * * *' } } // 4 AM daily
  );

  logger.info('📅 All recurring jobs scheduled');
};

export default {
  jobProcessors,
  initializeJobs,
  scheduleJobs,
  ...jobProcessors,
};