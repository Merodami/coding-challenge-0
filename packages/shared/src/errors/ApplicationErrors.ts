import {
  ErrorCode,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
} from '@fever/types'

import { BaseError } from './ErrorBase.js'

/**
 * General application error
 */
export class ApplicationError extends BaseError {
  constructor(
    message: string,
    context: Partial<ErrorContext> & { code: string },
  ) {
    super(message, {
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.ERROR,
      httpStatus: 500,
      ...context,
    })
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends BaseError {
  constructor(
    validationErrors: Record<string, string[]>,
    context: Partial<ErrorContext> = {},
  ) {
    const errorMessages = Object.entries(validationErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ')

    super(`Validation failed: ${errorMessages}`, {
      code: ErrorCode.VALIDATION_ERROR,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.WARNING,
      httpStatus: 400,
      metadata: {
        validationErrors,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when authentication fails
 */
export class NotAuthenticatedError extends BaseError {
  constructor(reason: string, context: Partial<ErrorContext> = {}) {
    super(`Authentication failed: ${reason}`, {
      code: ErrorCode.UNAUTHORIZED,
      domain: ErrorDomain.SECURITY,
      severity: ErrorSeverity.WARNING,
      httpStatus: 401,
      metadata: {
        reason,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when authorization fails
 */
export class NotAuthorizedError extends BaseError {
  constructor(
    action: string,
    resource: string,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Not authorized to ${action} on ${resource}`, {
      code: ErrorCode.FORBIDDEN,
      domain: ErrorDomain.SECURITY,
      severity: ErrorSeverity.WARNING,
      httpStatus: 403,
      metadata: {
        action,
        resource,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends BaseError {
  constructor(
    limit: number,
    window: string,
    retryAfter?: number,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.WARNING,
      httpStatus: 429,
      metadata: {
        limit,
        window,
        retryAfter,
      },
      retryable: true,
      ...context,
    })
  }
}
