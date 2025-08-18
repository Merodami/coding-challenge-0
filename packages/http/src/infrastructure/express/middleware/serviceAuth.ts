/**
 * Service API Key Authentication Middleware
 *
 * Authentication for internal service-to-service communication
 * Uses a separate SERVICE_API_KEY for internal endpoints
 */

import { SERVICE_API_KEY } from '@fever/environment'
import { ErrorFactory, logger } from '@fever/shared'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Validates service API key from request headers
 */
export function validateServiceApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || !SERVICE_API_KEY) {
    return false
  }

  return apiKey === SERVICE_API_KEY
}

/**
 * Middleware to require service API key authentication
 * Used for internal service-to-service endpoints
 */
export function requireServiceApiKey(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract API key from x-service-api-key header
    const apiKey = req.headers['x-service-api-key'] as string

    // Validate service API key
    if (!validateServiceApiKey(apiKey)) {
      logger.warn('Invalid or missing service API key', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        providedKey: apiKey ? '***' + apiKey.slice(-4) : 'none',
      })

      const error = ErrorFactory.notAuthenticated(
        'Invalid or missing service API key',
        {
          source: 'serviceAuth.middleware',
          code: 'SERVICE_API_KEY_INVALID',
        },
      )

      return res.status(401).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    // Service API key is valid
    logger.debug('Service API key validated successfully', {
      path: req.path,
      method: req.method,
    })

    next()
  }
}
