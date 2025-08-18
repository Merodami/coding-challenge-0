import { NODE_ENV, VERSION } from '@fever/environment'
import { logger } from '@fever/shared'
import type { Request, Response } from 'express'

export function handleHealthCheck(_req: Request, res: Response): void {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: VERSION,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: NODE_ENV,
    }

    res.status(200).json(healthData)
  } catch {
    logger.error('Health check failed')

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    })
  }
}
