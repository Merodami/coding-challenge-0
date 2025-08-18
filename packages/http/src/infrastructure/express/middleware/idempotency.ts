import type { ICacheService } from '@fever/redis'
import { HttpMethod } from '@fever/types'
import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { set } from 'lodash-es'

import {
  IdempotencyConfig,
  IdempotentResponse,
} from '../../../domain/types/idempotency.js'

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(req: Request, headerName: string): string {
  // Check for explicit idempotency key in header
  const explicitKey = req.headers[headerName.toLowerCase()]

  if (explicitKey) {
    return String(explicitKey)
  }

  // Generate key from request properties
  const keyData = {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(keyData))
    .digest('hex')
}

/**
 * Idempotency middleware for request deduplication
 */
export function idempotencyMiddleware(
  config: IdempotencyConfig & { cacheService: ICacheService },
) {
  const {
    enabled = true,
    defaultTTL = 86400,
    methods = [HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH],
    excludeRoutes = ['/health', '/metrics'],
    headerName = 'idempotency-key',
    keyPrefix = 'idempotency',
    cacheService,
  } = config

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if disabled
    if (!enabled) {
      return next()
    }

    // Skip if method not configured for idempotency
    if (!methods.includes(req.method as HttpMethod)) {
      return next()
    }

    // Skip excluded routes
    if (excludeRoutes.some((route) => req.path.startsWith(route))) {
      return next()
    }

    try {
      const idempotencyKey = generateIdempotencyKey(req, headerName)
      const cacheKey = `${keyPrefix}:${idempotencyKey}`

      // Check for existing response
      const cachedResponse =
        await cacheService.get<IdempotentResponse>(cacheKey)

      if (cachedResponse) {
        // Return cached response
        res.set('X-Idempotent-Replayed', 'true')
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.set(key, value)
        })

        return res.status(cachedResponse.statusCode).json(cachedResponse.body)
      }

      // Capture response for caching
      const originalSend = res.send
      const originalJson = res.json

      let responseData: any

      const responseHeaders: Record<string, string> = {}

      // Override send
      res.send = function (data: any) {
        responseData = data

        return originalSend.call(this, data)
      }

      // Override json
      res.json = function (data: any) {
        responseData = data

        return originalJson.call(this, data)
      }

      // Capture headers when response is sent
      res.on('finish', async () => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Capture response headers
          res.getHeaderNames().forEach((name) => {
            set(responseHeaders, name, String(res.getHeader(name)))
          })

          const response: IdempotentResponse = {
            statusCode: res.statusCode,
            headers: responseHeaders,
            body: responseData,
          }

          await cacheService.set(cacheKey, response, defaultTTL)
        }
      })

      next()
    } catch (error) {
      // Log error but don't block request
      console.error('Idempotency middleware error:', error)
      next()
    }
  }
}

/**
 * Idempotency plugin for manual control
 */
export function idempotencyPlugin(
  cacheService: ICacheService,
  config?: Partial<IdempotencyConfig>,
) {
  return {
    async check(key: string): Promise<IdempotentResponse | null> {
      const cacheKey = `${config?.keyPrefix || 'idempotency'}:${key}`

      return cacheService.get<IdempotentResponse>(cacheKey)
    },

    async store(
      key: string,
      response: IdempotentResponse,
      ttl?: number,
    ): Promise<void> {
      const cacheKey = `${config?.keyPrefix || 'idempotency'}:${key}`

      await cacheService.set(
        cacheKey,
        response,
        ttl || config?.defaultTTL || 86400,
      )
    },

    async clear(key: string): Promise<void> {
      const cacheKey = `${config?.keyPrefix || 'idempotency'}:${key}`

      await cacheService.del(cacheKey)
    },
  }
}
