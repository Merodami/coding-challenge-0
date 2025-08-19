/**
 * Internal Routes
 * Routes for internal service-to-service operations
 * Protected by SERVICE_API_KEY for service-to-service communication
 */

import { InternalTriggerSyncRequest } from '@fever/api'
import { requireServiceApiKey, validateBody } from '@fever/http'
import { Router } from 'express'

import type { InternalController } from '../controllers/InternalController.js'

export function createInternalRoutes(
  internalController: InternalController,
): Router {
  const routes = new InternalRoutes(internalController)

  return routes.getRouter()
}

export class InternalRoutes {
  private router: Router

  constructor(private readonly internalController: InternalController) {
    this.router = Router()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    /**
     * POST /internal/sync
     * Trigger a sync job via the queue
     * Used by Vercel cron or manual triggers
     * Protected by SERVICE_API_KEY
     */
    this.router.post(
      '/internal/sync',
      requireServiceApiKey(),
      validateBody(InternalTriggerSyncRequest),
      this.internalController.triggerSync,
    )

    /**
     * GET /internal/sync/status
     * Get queue statistics and last sync information
     * Protected by SERVICE_API_KEY
     */
    this.router.get(
      '/internal/sync/status',
      requireServiceApiKey(),
      this.internalController.getSyncStatus,
    )
  }

  getRouter(): Router {
    return this.router
  }
}
