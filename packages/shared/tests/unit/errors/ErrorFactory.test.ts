import { ErrorCode, ErrorSeverity } from '@fever/types'
import { describe, expect, it } from 'vitest'

import {
  ApplicationError,
  NotAuthenticatedError,
  NotAuthorizedError,
  RateLimitError,
  ValidationError,
} from '../../../src/errors/ApplicationErrors.js'
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
  UniqueConstraintViolationError,
} from '../../../src/errors/DomainErrors.js'
import { ErrorFactory } from '../../../src/errors/ErrorFactory.js'
import {
  CacheError,
  ConnectionError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
} from '../../../src/errors/InfrastructureErrors.js'

describe('ErrorFactory', () => {
  describe('resourceNotFound', () => {
    it('should create ResourceNotFoundError with correct properties', () => {
      const error = ErrorFactory.resourceNotFound('User', '123')

      expect(error).toBeInstanceOf(ResourceNotFoundError)
      expect(error.message).toBe("User with ID '123' not found")
      expect(error.context.code).toBe(ErrorCode.NOT_FOUND)
      expect(error.context.httpStatus).toBe(404)
    })

    it('should accept custom context', () => {
      const error = ErrorFactory.resourceNotFound('Product', 'abc', {
        correlationId: 'test-123',
      })

      expect(error.context.correlationId).toBe('test-123')
    })
  })

  describe('databaseError', () => {
    it('should create DatabaseError with correct properties', () => {
      const error = ErrorFactory.databaseError('INSERT', 'Connection failed')

      expect(error).toBeInstanceOf(DatabaseError)
      expect(error.message).toBe('Database INSERT failed: Connection failed')
      expect(error.context.code).toBe(ErrorCode.DATABASE_ERROR)
      expect(error.context.severity).toBe(ErrorSeverity.ERROR)
    })

    it('should include original error', () => {
      const originalError = new Error('Original DB error')
      const error = ErrorFactory.databaseError(
        'SELECT',
        'Query failed',
        originalError,
      )

      expect(error.context.metadata?.['originalError']).toBe(
        'Original DB error',
      )
    })
  })

  describe('validationError', () => {
    it('should create ValidationError with validation errors', () => {
      const validationErrors = {
        email: ['Invalid format', 'Required'],
        password: ['Too short'],
      }

      const error = ErrorFactory.validationError(validationErrors)

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toContain('Validation failed')
      expect(error.context.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.context.httpStatus).toBe(400)
      expect(error.context.metadata?.['validationErrors']).toEqual(
        validationErrors,
      )
    })

    it('should format message with field errors', () => {
      const error = ErrorFactory.validationError({
        field1: ['error1'],
        field2: ['error2'],
        field3: ['error3'],
      })

      expect(error.message).toBe(
        'Validation failed: field1: error1; field2: error2; field3: error3',
      )
    })
  })

  describe('badRequest', () => {
    it('should create ApplicationError with 400 status', () => {
      const error = ErrorFactory.badRequest('Invalid request format')

      expect(error).toBeInstanceOf(ApplicationError)
      expect(error.message).toBe('Invalid request format')
      expect(error.context.code).toBe(ErrorCode.BAD_REQUEST)
      expect(error.context.httpStatus).toBe(400)
      expect(error.context.severity).toBe(ErrorSeverity.WARNING)
    })
  })

  describe('uniqueConstraintViolation', () => {
    it('should create UniqueConstraintViolationError', () => {
      const error = ErrorFactory.uniqueConstraintViolation(
        'User',
        'email',
        'test@example.com',
      )

      expect(error).toBeInstanceOf(UniqueConstraintViolationError)
      expect(error.message).toBe(
        "User with email 'test@example.com' already exists",
      )
      expect(error.context.code).toBe(ErrorCode.UNIQUE_CONSTRAINT_VIOLATION)
      expect(error.context.httpStatus).toBe(409)
    })
  })

  describe('businessRuleViolation', () => {
    it('should create BusinessRuleViolationError', () => {
      const error = ErrorFactory.businessRuleViolation(
        'OrderLimit',
        'Maximum order amount exceeded',
      )

      expect(error).toBeInstanceOf(BusinessRuleViolationError)
      expect(error.message).toBe(
        'Business rule violation: OrderLimit. Maximum order amount exceeded',
      )
      expect(error.context.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION)
      expect(error.context.httpStatus).toBe(422)
    })
  })

  describe('notAuthenticated', () => {
    it('should create NotAuthenticatedError', () => {
      const error = ErrorFactory.notAuthenticated('Invalid token')

      expect(error).toBeInstanceOf(NotAuthenticatedError)
      expect(error.message).toBe('Authentication failed: Invalid token')
      expect(error.context.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(error.context.httpStatus).toBe(401)
    })
  })

  describe('notAuthorized', () => {
    it('should create NotAuthorizedError', () => {
      const error = ErrorFactory.notAuthorized('DELETE', 'User')

      expect(error).toBeInstanceOf(NotAuthorizedError)
      expect(error.message).toBe('Not authorized to DELETE on User')
      expect(error.context.code).toBe(ErrorCode.FORBIDDEN)
      expect(error.context.httpStatus).toBe(403)
    })
  })

  describe('externalServiceError', () => {
    it('should create ExternalServiceError', () => {
      const error = ErrorFactory.externalServiceError(
        'PaymentGateway',
        'charge',
        'Connection timeout',
      )

      expect(error).toBeInstanceOf(ExternalServiceError)
      expect(error.message).toBe(
        "External service 'PaymentGateway' failed during charge: Connection timeout",
      )
      expect(error.context.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR)
      expect(error.context.httpStatus).toBe(502)
    })

    it('should include original error', () => {
      const originalError = new Error('Gateway error')
      const error = ErrorFactory.externalServiceError(
        'API',
        'fetch',
        'Failed',
        originalError,
      )

      expect(error.context.metadata?.['originalError']).toBe('Gateway error')
    })
  })

  describe('cacheError', () => {
    it('should create CacheError', () => {
      const error = ErrorFactory.cacheError(
        'SET',
        'user:123',
        'Redis connection lost',
      )

      expect(error).toBeInstanceOf(CacheError)
      expect(error.message).toBe(
        "Cache SET failed for key 'user:123': Redis connection lost",
      )
      expect(error.context.code).toBe(ErrorCode.CACHE_ERROR)
      expect(error.context.severity).toBe(ErrorSeverity.WARNING)
    })
  })

  describe('connectionError', () => {
    it('should create ConnectionError', () => {
      const error = ErrorFactory.connectionError(
        'Database',
        'Connection refused',
      )

      expect(error).toBeInstanceOf(ConnectionError)
      expect(error.message).toBe(
        "Connection to 'Database' failed: Connection refused",
      )
      expect(error.context.code).toBe(ErrorCode.CONNECTION_ERROR)
      expect(error.context.httpStatus).toBe(503)
    })
  })

  describe('timeoutError', () => {
    it('should create TimeoutError', () => {
      const error = ErrorFactory.timeoutError('API request', 5000)

      expect(error).toBeInstanceOf(TimeoutError)
      expect(error.message).toBe(
        "Operation 'API request' timed out after 5000ms",
      )
      expect(error.context.code).toBe(ErrorCode.TIMEOUT_ERROR)
      expect(error.context.httpStatus).toBe(504)
    })
  })

  describe('rateLimitError', () => {
    it('should create RateLimitError', () => {
      const error = ErrorFactory.rateLimitError(100, '1 hour', 3600)

      expect(error).toBeInstanceOf(RateLimitError)
      expect(error.message).toBe('Rate limit exceeded: 100 requests per 1 hour')
      expect(error.context.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
      expect(error.context.httpStatus).toBe(429)
    })

    it('should handle missing retryAfter', () => {
      const error = ErrorFactory.rateLimitError(50, '1 minute')

      expect(error.message).toBe(
        'Rate limit exceeded: 50 requests per 1 minute',
      )
    })
  })

  describe('invalidStateTransition', () => {
    it('should create InvalidStateTransitionError', () => {
      const error = ErrorFactory.invalidStateTransition(
        'Order',
        'pending',
        'cancelled',
      )

      expect(error).toBeInstanceOf(InvalidStateTransitionError)
      expect(error.message).toBe(
        "Invalid state transition for Order: cannot transition from 'pending' to 'cancelled'",
      )
      expect(error.context.code).toBe(ErrorCode.INVALID_STATE_TRANSITION)
      expect(error.context.httpStatus).toBe(422)
    })
  })

  describe('fromError', () => {
    it('should return BaseError instances as-is', () => {
      const baseError = ErrorFactory.badRequest('Test')
      const result = ErrorFactory.fromError(baseError)

      expect(result).toBe(baseError)
    })

    it('should convert Error to ApplicationError', () => {
      const error = new Error('Regular error')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(ApplicationError)
      expect(result.message).toBe('Regular error')
      expect(result.context.code).toBe(ErrorCode.INTERNAL_ERROR)
    })

    it('should handle string errors', () => {
      const result = ErrorFactory.fromError('String error')

      expect(result).toBeInstanceOf(ApplicationError)
      expect(result.message).toBe('An unknown error occurred')
      expect(result.context.metadata?.['originalError']).toBe('String error')
    })

    it('should handle null/undefined errors', () => {
      const resultNull = ErrorFactory.fromError(null)
      const resultUndefined = ErrorFactory.fromError(undefined)

      expect(resultNull).toBeInstanceOf(ApplicationError)
      expect(resultNull.message).toBe('An unknown error occurred')
      expect(resultUndefined).toBeInstanceOf(ApplicationError)
      expect(resultUndefined.message).toBe('An unknown error occurred')
    })

    it('should handle object errors', () => {
      const result = ErrorFactory.fromError({
        message: 'Object error',
        code: 'OBJ',
      })

      expect(result).toBeInstanceOf(ApplicationError)
      expect(result.message).toBe('An unknown error occurred')
      expect(result.context.metadata?.['originalError']).toContain(
        '[object Object]',
      )
    })
  })
})
