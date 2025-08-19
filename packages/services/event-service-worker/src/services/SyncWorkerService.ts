/**
 * Sync Worker Service Implementation
 * Infrastructure layer service for processing sync jobs
 * Follows clean architecture patterns with dependency injection
 */

import { QUEUE_CONFIG } from '@fever/environment'
import type { ICacheService } from '@fever/redis'
import { ErrorFactory, logger } from '@fever/shared'
import { type Job, Worker } from 'bullmq'

import { createBullMQRedisConnection } from '../infrastructure/queue/redisConnection.js'
import type { SyncJobDomain, SyncResultDomain } from '../types/domain.js'
import type {
  IPlanService,
  IQueueService,
  ISyncWorkerService,
} from '../types/interfaces.js'

export class SyncWorkerService implements ISyncWorkerService {
  private worker: Worker | null = null

  constructor(
    private readonly planService: IPlanService,
    private readonly cacheService: ICacheService,
    private readonly queueService: IQueueService,
  ) {}

  /**
   * Process sync jobs from the queue
   */
  async processSyncJob(): Promise<SyncResultDomain> {
    try {
      // Execute the sync through the plan service
      const result = await this.planService.syncEventsFromProvider()

      // Create result with duration (plan service doesn't track this)
      const syncResult: SyncResultDomain = {
        eventsProcessed: result.eventsProcessed,
        success: result.success,
        errorMessage: result.errorMessage,
        duration: 0, // Will be set by the job processor
      }

      return syncResult
    } catch (error) {
      logger.error('Failed to process sync job:', error)
      throw ErrorFactory.fromError(error)
    }
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    const redisConnection = createBullMQRedisConnection()

    logger.info(`Starting worker with Redis connection:`, {
      host: redisConnection.host,
      port: redisConnection.port,
      queueName: QUEUE_CONFIG.NAME,
    })

    this.worker = new Worker(
      QUEUE_CONFIG.NAME,
      async (job: Job<SyncJobDomain>) => {
        const startTime = Date.now()

        logger.info(
          {
            jobId: job.id,
            attempt: job.attemptsStarted,
            data: job.data,
          },
          'Processing sync job',
        )

        try {
          // Execute the sync
          const result = await this.processSyncJob()
          const duration = Date.now() - startTime

          // Update result with actual duration
          const finalResult: SyncResultDomain = {
            ...result,
            duration,
          }

          // Store the sync result in cache for status endpoint
          await this.queueService.storeSyncResult(finalResult)

          logger.info(
            {
              jobId: job.id,
              duration,
              eventsProcessed: finalResult.eventsProcessed,
              success: finalResult.success,
            },
            'Sync job completed',
          )

          return finalResult
        } catch (error) {
          const duration = Date.now() - startTime

          logger.error(
            {
              jobId: job.id,
              attempt: job.attemptsStarted,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration,
            },
            'Sync job failed',
          )
          throw error
        }
      },
      {
        connection: redisConnection,
        concurrency: QUEUE_CONFIG.WORKER.CONCURRENCY,
        limiter: {
          max: QUEUE_CONFIG.RATE_LIMIT.MAX,
          duration: QUEUE_CONFIG.RATE_LIMIT.DURATION,
        },
      },
    )

    // Worker event handlers
    this.worker.on('completed', (job) => {
      logger.info(
        {
          jobId: job.id,
          returnValue: job.returnvalue,
        },
        'Worker completed job',
      )
    })

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          jobId: job?.id,
          error: error.message,
        },
        'Worker job failed',
      )
    })

    this.worker.on('error', (error) => {
      logger.error(
        {
          error: error.message,
        },
        'Worker error',
      )
    })

    // Wait for worker to be ready
    await this.worker.waitUntilReady()
    logger.info('Event sync worker started and ready')
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close()
        logger.info('Sync worker stopped')
      } catch (error) {
        logger.error('Failed to stop sync worker:', error)
        throw ErrorFactory.fromError(error)
      }
    }
  }
}
