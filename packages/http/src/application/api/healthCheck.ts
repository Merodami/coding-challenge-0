import { HealthStatus } from '@fever/types'
import { Express, Request, Response } from 'express'
import { get } from 'lodash-es'

import {
  HealthCheckConfig,
  HealthCheckResponse,
  HealthCheckResult,
} from '../../domain/types/healthCheck.js'

/**
 * Performs a single health check with timeout
 */
async function performHealthCheck(
  config: HealthCheckConfig,
): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const timeout = config.timeout || 5000

  try {
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout)
    })

    const result = await Promise.race([config.check(), timeoutPromise])

    return {
      name: config.name,
      status: result ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      name: config.name,
      status: HealthStatus.UNHEALTHY,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sets up health check endpoints for the service
 */
export function setupServiceHealthCheck(
  app: Express,
  healthChecks: HealthCheckConfig[],
  options: { serviceName: string },
): void {
  const startTime = Date.now()

  // Basic health endpoint (just returns 200 OK)
  app.get('/health', (_req: Request, res: Response) => {
    const response: HealthCheckResponse = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      service: options.serviceName,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }

    res.json(response)
  })

  // Detailed health endpoint (performs all checks)
  app.get('/health/details', async (_req: Request, res: Response) => {
    const checks = await Promise.all(
      healthChecks.map((config) => performHealthCheck(config)),
    )

    // Determine overall status
    const hasUnhealthy = checks.some(
      (check) => check.status === HealthStatus.UNHEALTHY,
    )
    const hasCriticalUnhealthy = checks.some(
      (check, index) =>
        check.status === HealthStatus.UNHEALTHY &&
        get(healthChecks, [index, 'critical'], true) !== false,
    )

    let overallStatus: HealthStatus

    if (hasCriticalUnhealthy) {
      overallStatus = HealthStatus.UNHEALTHY
    } else if (hasUnhealthy) {
      overallStatus = HealthStatus.DEGRADED
    } else {
      overallStatus = HealthStatus.HEALTHY
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: options.serviceName,
      checks,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }

    const statusCode = overallStatus === HealthStatus.HEALTHY ? 200 : 503

    res.status(statusCode).json(response)
  })
}
