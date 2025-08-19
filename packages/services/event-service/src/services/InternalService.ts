/**
 * Internal Service
 * Minimal service for interacting with the event sync queue
 * Connects to the same BullMQ queue that the worker processes
 */

import {
  QUEUE_CONFIG,
  QUEUE_LAST_SYNC_KEY,
  REDIS_CONFIG,
} from '@fever/environment'
import type { ICacheService } from '@fever/redis'
import { ErrorFactory, logger } from '@fever/shared'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

import type {
  IInternalService,
  LastSyncInfoDomain,
  QueueStatsDomain,
  SyncJobOptionsDomain,
} from '../types/interfaces.js'

export class InternalService implements IInternalService {
  private queue: Queue
  private redisConnection: Redis

  constructor(private readonly cacheService: ICacheService) {
    // Create a dedicated Redis connection for BullMQ
    // BullMQ requires its own connection separate from the cache service
    this.redisConnection = new Redis({
      host: REDIS_CONFIG.HOST,
      port: REDIS_CONFIG.PORT,
      password: REDIS_CONFIG.PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false, // Recommended for BullMQ
    })

    logger.info('Connecting to event sync queue:', {
      queueName: QUEUE_CONFIG.NAME,
      host: REDIS_CONFIG.HOST,
      port: REDIS_CONFIG.PORT,
    })

    try {
      // Connect to the existing queue (same queue the worker uses)
      this.queue = new Queue(QUEUE_CONFIG.NAME, {
        connection: this.redisConnection,
      })

      logger.info('Connected to event sync queue')
    } catch (error) {
      logger.error('Failed to connect to sync queue:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Schedule a sync job
   * Adds a job to the queue that will be processed by the worker
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
        'Sync job scheduled via internal API',
      )

      return job.id as string
    } catch (error) {
      logger.error('Failed to schedule sync job:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStatsDomain> {
    try {
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
    } catch (error) {
      logger.error('Failed to get queue stats:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Get last sync information from cache
   * This is stored by the worker after each sync completes
   */
  async getLastSyncInfo(): Promise<LastSyncInfoDomain | null> {
    try {
      const lastSync =
        await this.cacheService.get<LastSyncInfoDomain>(QUEUE_LAST_SYNC_KEY)

      return lastSync
    } catch (error) {
      logger.error('Failed to get last sync info from cache:', error)
      // Return null for cache failures - this is non-critical data
      return null
    }
  }
}
