import type { ZodRegistry } from '../../common/registry/base.js'
import * as internalSyncSchemas from '../../schemas/event/internal/sync.js'

/**
 * Register all internal API schemas and routes
 */
export function registerInternalAPI(registry: ZodRegistry): void {
  // ============= Internal Sync Schemas =============

  // Register request/response schemas
  registry.registerSchema(
    'InternalTriggerSyncRequest',
    internalSyncSchemas.InternalTriggerSyncRequestSchema,
  )
  registry.registerSchema(
    'InternalTriggerSyncResponse',
    internalSyncSchemas.InternalTriggerSyncResponseSchema,
  )
  registry.registerSchema('QueueStats', internalSyncSchemas.QueueStatsSchema)
  registry.registerSchema(
    'InternalSyncStatusResponse',
    internalSyncSchemas.InternalSyncStatusResponseSchema,
  )
  registry.registerSchema(
    'SyncJobResult',
    internalSyncSchemas.SyncJobResultSchema,
  )

  // ============= Internal Routes =============

  // POST /internal/sync - Trigger sync job
  registry.registerRoute({
    method: 'post',
    path: '/internal/sync',
    summary: 'Trigger event synchronization',
    description:
      'Triggers a background job to synchronize events from the external provider',
    tags: ['Internal'],
    security: [{ serviceApiKey: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalTriggerSyncRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Sync job successfully triggered',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalTriggerSyncResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalTriggerSyncResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing service API key',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalTriggerSyncResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalTriggerSyncResponseSchema,
          },
        },
      },
    },
  })

  // GET /internal/sync/status - Get sync status
  registry.registerRoute({
    method: 'get',
    path: '/internal/sync/status',
    summary: 'Get synchronization status',
    description:
      'Returns the current status of the sync queue and information about the last sync',
    tags: ['Internal'],
    security: [{ serviceApiKey: [] }],
    responses: {
      200: {
        description: 'Current sync status and queue statistics',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalSyncStatusResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing service API key',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalSyncStatusResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: internalSyncSchemas.InternalSyncStatusResponseSchema,
          },
        },
      },
    },
  })
}
