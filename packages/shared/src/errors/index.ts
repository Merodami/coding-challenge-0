/**
 * Error handling exports
 */

// Base error class
export * from './ErrorBase.js'

// Error categories
export * from './ApplicationErrors.js'
export * from './DomainErrors.js'
export * from './InfrastructureErrors.js'

// Error factory
export * from './ErrorFactory.js'

// Simple error handler (HTTP package can create its own complex one)
import { NODE_ENV } from '@fever/environment'
import { createErrorResponse } from '@fever/types'

import { logger } from '../infrastructure/logger/index.js'
import { BaseError } from './ErrorBase.js'

/**
 * Basic error handler for express applications
 * Returns responses in the format required by swagger-spec.json:
 * { data: null, error: { code, message } }
 */
export function createErrorHandler(
  isProduction: boolean = NODE_ENV === 'production',
) {
  return (
    error:
      | Error
      | BaseError
      | { status?: number; code?: string; message?: string; stack?: string },
    request: { method?: string; url?: string },
    reply: { status: (code: number) => { json: (data: unknown) => void } },
  ) => {
    // Log the error
    logger.error({ error }, 'Error occurred')

    // Determine status code
    let statusCode = 500
    let message = 'Internal server error'

    if (error instanceof BaseError) {
      statusCode = error.getHttpStatus()
      message = error.message
    } else if ('status' in error && error.status) {
      statusCode = error.status
      message = error.message || message
    }

    // Use request for logging context
    const { method = 'UNKNOWN', url = 'UNKNOWN' } = request || {}

    logger.error(`${method} ${url} - ${statusCode} ${message}`)

    // Determine error code
    const errorCode =
      error instanceof BaseError
        ? error.code
        : error && typeof error === 'object' && 'code' in error
          ? error.code
          : 'INTERNAL_ERROR'

    // Create response matching Swagger specification
    const response = createErrorResponse(errorCode || 'INTERNAL_ERROR', message)

    // Add stack trace in development
    if (!isProduction && error.stack) {
      ;(response.error as any).stack = error.stack
    }

    reply.status(statusCode).json(response)
  }
}
