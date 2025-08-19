/**
 * API Key Authentication Middleware
 *
 * Simple API key validation for public-facing endpoints
 * Following the pattern from .project/packages/http/src/infrastructure/express/middleware/serviceAuth.ts
 */

import { API_KEY, API_KEY_HEADER, REQUIRE_API_KEY } from '@fever/environment'
import { ErrorFactory, logger } from '@fever/shared'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Validates API key from request headers
 */
export function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || !API_KEY) {
    return false
  }

  // Simple string comparison - in production you might want to support
  // multiple API keys or use a more sophisticated validation mechanism
  return apiKey === API_KEY
}

/**
 * Middleware to require API key authentication
 * Used for public-facing endpoints that need simple API key protection
 */
export function requireApiKey(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip authentication if not required (development mode)
    if (!REQUIRE_API_KEY) {
      return next()
    }

    // Extract API key from header
    const apiKey = req.headers[API_KEY_HEADER.toLowerCase()] as string

    // Validate API key
    if (!validateApiKey(apiKey)) {
      logger.warn('Invalid or missing API key', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        providedKey: apiKey ? '***' + apiKey.slice(-4) : 'none',
      })

      const error = ErrorFactory.notAuthenticated(
        'Invalid or missing API key',
        {
          source: 'apiKeyAuth.middleware',
          code: 'API_KEY_INVALID',
        },
      )

      return res.status(401).json({
        data: null,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    // API key is valid
    logger.debug('API key validated successfully', {
      path: req.path,
      method: req.method,
    })

    next()
  }
}

/**
 * Middleware that optionally requires API key based on environment
 * Useful for endpoints that should be protected in production but open in development
 */
export function optionalApiKey(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only require API key if REQUIRE_API_KEY is true
    if (REQUIRE_API_KEY) {
      return requireApiKey()(req, res, next)
    }

    // Skip authentication in development
    next()
  }
}
