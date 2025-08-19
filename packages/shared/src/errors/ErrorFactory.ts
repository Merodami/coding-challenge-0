import { ErrorCode, ErrorContext, ErrorSeverity } from '@fever/types'

/**
 * Type for original errors that can be passed to error constructors
 */
type OriginalError =
  | Error
  | BaseError
  | Record<string, unknown>
  | string
  | null
  | undefined

import {
  ApplicationError,
  NotAuthenticatedError,
  NotAuthorizedError,
  RateLimitError,
  ValidationError,
} from './ApplicationErrors.js'
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
  UniqueConstraintViolationError,
} from './DomainErrors.js'
import { BaseError } from './ErrorBase.js'
import {
  CacheError,
  ConnectionError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
} from './InfrastructureErrors.js'

/**
 * Creates appropriate error objects based on type and context
 */
export class ErrorFactory {
  /**
   * Create a resource not found error
   */
  static resourceNotFound(
    resourceType: string,
    resourceId: string,
    context: Partial<ErrorContext> = {},
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId, context)
  }

  /**
   * Create a database error
   */
  static databaseError(
    operation: string,
    details: string,
    originalError?: OriginalError,
    context: Partial<ErrorContext> = {},
  ): DatabaseError {
    return new DatabaseError(operation, details, originalError, context)
  }

  /**
   * Create a validation error
   */
  static validationError(
    validationErrors: Record<string, string[]>,
    context: Partial<ErrorContext> = {},
  ): ValidationError {
    return new ValidationError(validationErrors, context)
  }

  /**
   * Create a bad request error
   */
  static badRequest(
    message: string,
    context: Partial<ErrorContext> = {},
  ): ApplicationError {
    return new ApplicationError(message, {
      code: ErrorCode.BAD_REQUEST,
      httpStatus: 400,
      severity: ErrorSeverity.WARNING,
      ...context,
    })
  }

  /**
   * Create a unique constraint violation error
   */
  static uniqueConstraintViolation(
    entityName: string,
    field: string,
    value: string,
    context: Partial<ErrorContext> = {},
  ): UniqueConstraintViolationError {
    return new UniqueConstraintViolationError(entityName, field, value, context)
  }

  /**
   * Create a business rule violation error
   */
  static businessRuleViolation(
    rule: string,
    details: string,
    context: Partial<ErrorContext> = {},
  ): BusinessRuleViolationError {
    return new BusinessRuleViolationError(rule, details, context)
  }

  /**
   * Create an authentication error
   */
  static notAuthenticated(
    reason: string,
    context: Partial<ErrorContext> = {},
  ): NotAuthenticatedError {
    return new NotAuthenticatedError(reason, context)
  }

  /**
   * Create an authorization error
   */
  static notAuthorized(
    action: string,
    resource: string,
    context: Partial<ErrorContext> = {},
  ): NotAuthorizedError {
    return new NotAuthorizedError(action, resource, context)
  }

  /**
   * Create an external service error
   */
  static externalServiceError(
    service: string,
    operation: string,
    details: string,
    originalError?: OriginalError,
    context: Partial<ErrorContext> = {},
  ): ExternalServiceError {
    return new ExternalServiceError(
      service,
      operation,
      details,
      originalError,
      context,
    )
  }

  /**
   * Create a cache error
   */
  static cacheError(
    operation: string,
    key: string,
    details: string,
    originalError?: OriginalError,
    context: Partial<ErrorContext> = {},
  ): CacheError {
    return new CacheError(operation, key, details, originalError, context)
  }

  /**
   * Create a connection error
   */
  static connectionError(
    service: string,
    details: string,
    originalError?: OriginalError,
    context: Partial<ErrorContext> = {},
  ): ConnectionError {
    return new ConnectionError(service, details, originalError, context)
  }

  /**
   * Create a timeout error
   */
  static timeoutError(
    operation: string,
    timeoutMs: number,
    context: Partial<ErrorContext> = {},
  ): TimeoutError {
    return new TimeoutError(operation, timeoutMs, context)
  }

  /**
   * Create a rate limit error
   */
  static rateLimitError(
    limit: number,
    window: string,
    retryAfter?: number,
    context: Partial<ErrorContext> = {},
  ): RateLimitError {
    return new RateLimitError(limit, window, retryAfter, context)
  }

  /**
   * Create an invalid state transition error
   */
  static invalidStateTransition(
    entity: string,
    fromState: string,
    toState: string,
    context: Partial<ErrorContext> = {},
  ): InvalidStateTransitionError {
    return new InvalidStateTransitionError(entity, fromState, toState, context)
  }

  /**
   * Check if an error is already a standardized BaseError
   */
  static isStandardError(error: unknown): error is BaseError {
    return error instanceof BaseError
  }

  /**
   * Create an error from an unknown error
   */
  static fromError(
    error: unknown,
    context: Partial<ErrorContext> = {},
  ): BaseError {
    // If it's already a BaseError, return it
    if (error instanceof BaseError) {
      return error
    }

    // If it's a standard Error, wrap it
    if (error instanceof Error) {
      return new ApplicationError(error.message, {
        code: ErrorCode.INTERNAL_ERROR,
        metadata: {
          originalError: error.name,
          stack: error.stack,
        },
        ...context,
      })
    }

    // For unknown errors, create a generic error
    return new ApplicationError('An unknown error occurred', {
      code: ErrorCode.INTERNAL_ERROR,
      metadata: {
        originalError: String(error),
      },
      ...context,
    })
  }
}
