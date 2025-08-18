/**
 * Queue Service Implementation
 * Infrastructure layer service for managing BullMQ sync operations
 * Follows clean architecture patterns with dependency injection
 */

import {
  QUEUE_CONFIG,
  QUEUE_LAST_SYNC_KEY,
  QUEUE_LAST_SYNC_TTL,
} from '@fever/environment'
import type { ICacheService } from '@fever/redis'
import { ErrorFactory, logger } from '@fever/shared'
import { Queue } from 'bullmq'

import { createBullMQRedisConnection } from '../infrastructure/queue/redisConnection.js'
import type {
  LastSyncInfoDomain,
  QueueStatsDomain,
  SyncJobOptionsDomain,
  SyncResultDomain,
} from '../types/domain.js'
import type { IQueueService } from '../types/interfaces.js'

export class QueueService implements IQueueService {
  private queue: Queue

  constructor(private readonly cacheService: ICacheService) {
    const redisConnection = createBullMQRedisConnection()

    logger.info('Creating sync queue with Redis connection:', {
      host: redisConnection.host,
      port: redisConnection.port,
      hasPassword: !!redisConnection.password,
    })

    try {
      this.queue = new Queue(QUEUE_CONFIG.NAME, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: QUEUE_CONFIG.MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: QUEUE_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: {
            count: QUEUE_CONFIG.COMPLETED_JOBS.COUNT,
            age: QUEUE_CONFIG.COMPLETED_JOBS.AGE,
          },
          removeOnFail: {
            count: QUEUE_CONFIG.FAILED_JOBS.COUNT,
            age: QUEUE_CONFIG.FAILED_JOBS.AGE,
          },
        },
      })

      logger.info('Event sync queue created')
    } catch (error) {
      logger.error('Failed to create sync queue:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Schedule a sync job
   */
  async scheduleSync(options?: SyncJobOptionsDomain): Promise<string> {
    try {
      // Check if there's already a job in progress or waiting
      if (!options?.force) {
        const [waitingJobs, activeJobs, delayedJobs] = await Promise.all([
          this.queue.getWaitingCount(),
          this.queue.getActiveCount(),
          this.queue.getDelayedCount(),
        ])

        if (waitingJobs > 0 || activeJobs > 0 || delayedJobs > 0) {
          logger.info(
            {
              waiting: waitingJobs,
              active: activeJobs,
              delayed: delayedJobs,
            },
            'Sync job already in queue, skipping',
          )

          return 'skipped'
        }
      }

      // Add job to queue
      const job = await this.queue.add(
        QUEUE_CONFIG.JOB_NAME,
        {
          timestamp: new Date().toISOString(),
          trigger: options?.force ? 'manual' : 'scheduled',
        },
        {
          delay: options?.delay,
          priority: options?.priority,
        },
      )

      logger.info(
        {
          jobId: job.id,
          delay: options?.delay,
          priority: options?.priority,
        },
        'Sync job scheduled',
      )

      return job.id as string
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to schedule sync job',
      )
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStatsDomain> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    }
  }

  /**
   * Get last sync information from cache
   */
  async getLastSyncInfo(): Promise<LastSyncInfoDomain | null> {
    try {
      const lastSync =
        await this.cacheService.get<LastSyncInfoDomain>(QUEUE_LAST_SYNC_KEY)

      return lastSync
    } catch (error) {
      logger.error('Failed to get last sync info from Redis:', error)

      // Return null for Redis failures - this is non-critical data
      // The controller can still return queue stats even if lastSync is unavailable
      return null
    }
  }

  /**
   * Store sync result information
   */
  async storeSyncResult(result: SyncResultDomain): Promise<void> {
    try {
      const lastSyncInfo: LastSyncInfoDomain = {
        timestamp: new Date().toISOString(),
        eventsProcessed: result.eventsProcessed,
        duration: result.duration,
        success: result.success,
      }

      await this.cacheService.set(
        QUEUE_LAST_SYNC_KEY,
        lastSyncInfo,
        QUEUE_LAST_SYNC_TTL,
      )

      logger.info(
        {
          eventsProcessed: result.eventsProcessed,
          duration: result.duration,
          success: result.success,
        },
        'Sync result stored',
      )
    } catch (error) {
      logger.error('Failed to store sync result:', error)
      // Don't throw - this is non-critical
    }
  }

  /**
   * Clear all jobs from the queue
   * Useful for maintenance and cleanup operations
   */
  async clearAllJobs(): Promise<void> {
    try {
      await this.queue.obliterate({ force: true })

      // Wait a bit for the operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      logger.info('All queue jobs cleared')
    } catch (error) {
      logger.error('Failed to clear queue jobs:', error)
      // Don't throw - allow cleanup to continue even if this fails
    }
  }

  /**
   * Clean up queue resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.queue.close()
      logger.info('Queue cleanup completed')
    } catch (error) {
      logger.error('Failed to cleanup queue:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Setup periodic sync for development mode
   */
  async setupDevelopmentSync(intervalMs: number): Promise<void> {
    try {
      const job = await this.queue.add(
        QUEUE_CONFIG.JOB_NAME,
        {
          timestamp: new Date().toISOString(),
          trigger: 'scheduled-local-dev',
        },
        {
          repeat: {
            every: intervalMs,
            key: 'local-dev-sync',
            immediately: true,
          },
          priority: 5,
        },
      )

      logger.info(
        `Scheduled automatic sync every ${intervalMs}ms (${intervalMs / 1000}s) for local development`,
      )
      logger.info(`Repeatable job created: ${job.id}`)
    } catch (error) {
      logger.error('Failed to setup development sync:', error)
      throw ErrorFactory.fromError(error)
    }
  }
}
