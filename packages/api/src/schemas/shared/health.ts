import { HealthStatus } from '@fever/types'
import { z } from 'zod'

import { createZodEnum } from '../../common/utils/zodEnum.js'

/**
 * Health check schemas
 */

// ============= Health Check Response =============

/**
 * Health check response (raw Zod)
 */
export const HealthCheckResponse = z.object({
  status: createZodEnum(HealthStatus),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime({ offset: true }),
  uptime: z.number().nonnegative().describe('Uptime in seconds'),
  dependencies: z
    .record(
      z.string(),
      z.object({
        status: createZodEnum(HealthStatus),
        latency: z.number().optional().describe('Latency in milliseconds'),
        error: z.string().optional(),
      }),
    )
    .optional(),
})

/**
 * Health check response (OpenAPI documented)
 */
export const HealthCheckResponseSchema = HealthCheckResponse.openapi(
  'HealthCheckResponse',
  {
    description: 'Service health check response',
  },
)

export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>
