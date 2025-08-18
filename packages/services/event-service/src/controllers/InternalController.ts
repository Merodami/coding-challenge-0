/**
 * Internal Controller
 * Handles internal service-to-service operations like triggering sync via queue
 * Protected by SERVICE_API_KEY for service-to-service communication
 */

import type {
  InternalSyncStatusResponse,
  InternalTriggerSyncRequest,
  InternalTriggerSyncResponse,
} from '@fever/api'
import { ErrorFactory, logger } from '@fever/shared'
import type { NextFunction, Request, Response } from 'express'

import type { IInternalService } from '../types/interfaces.js'

export class InternalController {
  constructor(private readonly internalService: IInternalService) {
    this.triggerSync = this.triggerSync.bind(this)
    this.getSyncStatus = this.getSyncStatus.bind(this)
  }

  /**
   * Trigger a sync job via the queue
   * Used by Vercel cron or manual triggers
   */
  async triggerSync(
    request: Request<{}, {}, InternalTriggerSyncRequest>,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = request.body

      const jobId = await this.internalService.scheduleSync({
        force: body.force,
        priority: body.priority ?? 0,
        delay: body.delay,
      })

      const result: InternalTriggerSyncResponse = {
        success: true,
        jobId,
        message:
          jobId === 'skipped' ? 'Job already in queue' : 'Sync job scheduled',
        timestamp: new Date().toISOString(),
      }

      response.json(result)
    } catch (error) {
      logger.error('Failed to trigger sync:', error)
      next(ErrorFactory.fromError(error))
    }
  }

  /**
   * Get queue statistics and last sync information
   */
  async getSyncStatus(
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await this.internalService.getQueueStats()
      const lastSync = await this.internalService.getLastSyncInfo()

      const result: InternalSyncStatusResponse = {
        success: true,
        queue: stats,
        ...(lastSync && { lastSync }),
      }

      response.json(result)
    } catch (error) {
      logger.error('Failed to get sync status:', error)
      next(ErrorFactory.fromError(error))
    }
  }
}
