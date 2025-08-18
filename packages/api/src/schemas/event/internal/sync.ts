import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z)

/**
 * Internal Event Sync Schemas
 * Used for service-to-service communication and queue management
 */

// ============= Sync Job Request =============

/**
 * Request to trigger an event sync (raw Zod)
 */
export const InternalTriggerSyncRequest = z.object({
  force: z
    .boolean()
    .optional()
    .describe('Force sync even if a job is already in queue'),
  priority: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .default(0)
    .describe('Job priority (0-10, higher is more important)'),
  delay: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Delay in milliseconds before processing the job'),
})

/**
 * Request to trigger an event sync (OpenAPI documented)
 */
export const InternalTriggerSyncRequestSchema =
  InternalTriggerSyncRequest.openapi('InternalTriggerSyncRequest', {
    description: 'Request to trigger an event sync job',
    example: {
      force: false,
      priority: 5,
      delay: 1000,
    },
  })

export type InternalTriggerSyncRequest = z.infer<
  typeof InternalTriggerSyncRequest
>

// ============= Sync Job Response =============

/**
 * Response from triggering a sync (raw Zod)
 */
export const InternalTriggerSyncResponse = z.object({
  success: z.boolean(),
  jobId: z.string().describe('Queue job ID or "skipped" if job already exists'),
  message: z.string(),
  timestamp: z.string().datetime().optional(),
})

/**
 * Response from triggering a sync (OpenAPI documented)
 */
export const InternalTriggerSyncResponseSchema =
  InternalTriggerSyncResponse.openapi('InternalTriggerSyncResponse', {
    description: 'Response after triggering a sync job',
    example: {
      success: true,
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Sync job scheduled',
      timestamp: '2024-01-01T00:00:00Z',
    },
  })

export type InternalTriggerSyncResponse = z.infer<
  typeof InternalTriggerSyncResponse
>

// ============= Queue Statistics =============

/**
 * Queue statistics (raw Zod)
 */
export const QueueStats = z.object({
  waiting: z.number().int().describe('Number of jobs waiting to be processed'),
  active: z.number().int().describe('Number of jobs currently being processed'),
  completed: z.number().int().describe('Total number of completed jobs'),
  failed: z.number().int().describe('Total number of failed jobs'),
  delayed: z.number().int().describe('Number of delayed jobs'),
  total: z
    .number()
    .int()
    .describe('Total jobs in queue (waiting + active + delayed)'),
})

/**
 * Queue statistics (OpenAPI documented)
 */
export const QueueStatsSchema = QueueStats.openapi('QueueStats', {
  description: 'Queue statistics',
  example: {
    waiting: 2,
    active: 1,
    completed: 150,
    failed: 3,
    delayed: 0,
    total: 3,
  },
})

export type QueueStats = z.infer<typeof QueueStats>

// ============= Sync Status Response =============

/**
 * Response for sync status endpoint (raw Zod)
 */
export const InternalSyncStatusResponse = z.object({
  success: z.boolean(),
  queue: QueueStats,
  lastSync: z
    .object({
      timestamp: z.string().datetime(),
      eventsProcessed: z.number().int(),
      duration: z.number().int().describe('Duration in milliseconds'),
      success: z.boolean(),
    })
    .optional()
    .describe('Information about the last sync job'),
})

/**
 * Response for sync status endpoint (OpenAPI documented)
 */
export const InternalSyncStatusResponseSchema =
  InternalSyncStatusResponse.openapi('InternalSyncStatusResponse', {
    description: 'Current sync queue status and statistics',
    example: {
      success: true,
      queue: {
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 0,
        delayed: 0,
        total: 0,
      },
      lastSync: {
        timestamp: '2024-01-01T00:00:00Z',
        eventsProcessed: 25,
        duration: 1500,
        success: true,
      },
    },
  })

export type InternalSyncStatusResponse = z.infer<
  typeof InternalSyncStatusResponse
>

// ============= Sync Job Result =============

/**
 * Sync job result for internal queue storage (raw Zod)
 */
export const SyncJobResult = z.object({
  eventsProcessed: z.number().int(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  duration: z.number().int().describe('Sync duration in milliseconds'),
  timestamp: z.string().datetime(),
})

/**
 * Sync job result (OpenAPI documented)
 */
export const SyncJobResultSchema = SyncJobResult.openapi('SyncJobResult', {
  description: 'Result of a sync job execution',
  example: {
    eventsProcessed: 50,
    success: true,
    duration: 2000,
    timestamp: '2024-01-01T00:00:00Z',
  },
})

export type SyncJobResult = z.infer<typeof SyncJobResult>
