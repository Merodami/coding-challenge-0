import {
  ErrorCode,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
} from '@fever/types'

import { BaseError } from './ErrorBase.js'

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends BaseError {
  constructor(
    operation: string,
    details: string,
    originalError?: any,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Database ${operation} failed: ${details}`, {
      code: ErrorCode.DATABASE_ERROR,
      domain: ErrorDomain.INFRASTRUCTURE,
      severity: ErrorSeverity.ERROR,
      httpStatus: 500,
      metadata: {
        operation,
        details,
        originalError: originalError?.message || originalError,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when external service calls fail
 */
export class ExternalServiceError extends BaseError {
  constructor(
    service: string,
    operation: string,
    details: string,
    originalError?: any,
    context: Partial<ErrorContext> = {},
  ) {
    super(
      `External service '${service}' failed during ${operation}: ${details}`,
      {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        domain: ErrorDomain.EXTERNAL,
        severity: ErrorSeverity.ERROR,
        httpStatus: 502,
        metadata: {
          service,
          operation,
          details,
          originalError: originalError?.message || originalError,
        },
        retryable: true,
        ...context,
      },
    )
  }
}

/**
 * Error thrown when cache operations fail
 */
export class CacheError extends BaseError {
  constructor(
    operation: string,
    key: string,
    details: string,
    originalError?: any,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Cache ${operation} failed for key '${key}': ${details}`, {
      code: ErrorCode.CACHE_ERROR,
      domain: ErrorDomain.INFRASTRUCTURE,
      severity: ErrorSeverity.WARNING,
      httpStatus: 500,
      metadata: {
        operation,
        key,
        details,
        originalError: originalError?.message || originalError,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when connection to a service fails
 */
export class ConnectionError extends BaseError {
  constructor(
    service: string,
    details: string,
    originalError?: any,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Connection to '${service}' failed: ${details}`, {
      code: ErrorCode.CONNECTION_ERROR,
      domain: ErrorDomain.INFRASTRUCTURE,
      severity: ErrorSeverity.ERROR,
      httpStatus: 503,
      metadata: {
        service,
        details,
        originalError: originalError?.message || originalError,
      },
      retryable: true,
      ...context,
    })
  }
}

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends BaseError {
  constructor(
    operation: string,
    timeoutMs: number,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, {
      code: ErrorCode.TIMEOUT_ERROR,
      domain: ErrorDomain.INFRASTRUCTURE,
      severity: ErrorSeverity.ERROR,
      httpStatus: 504,
      metadata: {
        operation,
        timeoutMs,
      },
      retryable: true,
      ...context,
    })
  }
}
