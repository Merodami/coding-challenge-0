import { ErrorDomain, ErrorSeverity } from '@fever/types'
import { describe, expect, it } from 'vitest'

import { BaseError } from '../../../src/errors/ErrorBase.js'

describe('BaseError', () => {
  describe('constructor', () => {
    it('should create error with required context', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.message).toBe('Test error')
      expect(error.name).toBe('BaseError')
      expect(error.context.code).toBe('TEST_ERROR')
      expect(error.context.domain).toBe(ErrorDomain.APPLICATION)
    })

    it('should set default severity to ERROR', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.context.severity).toBe(ErrorSeverity.ERROR)
    })

    it('should set timestamp automatically', () => {
      const before = new Date().toISOString()
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })
      const after = new Date().toISOString()

      expect(error.context.timestamp).toBeDefined()
      expect(
        new Date(error.context.timestamp).getTime(),
      ).toBeGreaterThanOrEqual(new Date(before).getTime())
      expect(new Date(error.context.timestamp).getTime()).toBeLessThanOrEqual(
        new Date(after).getTime(),
      )
    })

    it('should accept custom context values', () => {
      const error = new BaseError('Test error', {
        code: 'CUSTOM_ERROR',
        domain: ErrorDomain.INFRASTRUCTURE,
        severity: ErrorSeverity.CRITICAL,
        httpStatus: 503,
        suggestion: 'Try again later',
        supportReferenceCode: 'REF-123',
        correlationId: 'corr-456',
        metadata: { extra: 'data' },
      })

      expect(error.context.severity).toBe(ErrorSeverity.CRITICAL)
      expect(error.context.httpStatus).toBe(503)
      expect(error.context.suggestion).toBe('Try again later')
      expect(error.context.supportReferenceCode).toBe('REF-123')
      expect(error.context.correlationId).toBe('corr-456')
      expect(error.context.metadata).toEqual({ extra: 'data' })
    })

    it('should have proper stack trace', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('BaseError')
      expect(error.stack).toContain('Test error')
    })
  })

  describe('getHttpStatus', () => {
    it('should return custom HTTP status when set', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
        httpStatus: 404,
      })

      expect(error.getHttpStatus()).toBe(404)
    })

    it('should return 500 by default', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.getHttpStatus()).toBe(500)
    })
  })

  describe('getCode and code property', () => {
    it('should return error code via getCode method', () => {
      const error = new BaseError('Test error', {
        code: 'UNIQUE_CODE',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.getCode()).toBe('UNIQUE_CODE')
    })

    it('should return error code via code property', () => {
      const error = new BaseError('Test error', {
        code: 'UNIQUE_CODE',
        domain: ErrorDomain.APPLICATION,
      })

      expect(error.code).toBe('UNIQUE_CODE')
    })
  })

  describe('getSeverity', () => {
    it('should return error severity', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
        severity: ErrorSeverity.WARNING,
      })

      expect(error.getSeverity()).toBe(ErrorSeverity.WARNING)
    })
  })

  describe('toResponse', () => {
    it('should convert to client-safe response without stack', () => {
      const error = new BaseError('User not found', {
        code: 'USER_NOT_FOUND',
        domain: ErrorDomain.DOMAIN,
        httpStatus: 404,
      })

      const response = error.toResponse()

      expect(response).toEqual({
        error: {
          code: 'USER_NOT_FOUND',
          type: 'BaseError',
          message: 'User not found',
          domain: ErrorDomain.DOMAIN,
          timestamp: error.context.timestamp,
        },
      })
      expect(response.error.stack).toBeUndefined()
    })

    it('should include stack when requested', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      const response = error.toResponse(true)

      expect(response.error.stack).toBeDefined()
      expect(response.error.stack).toContain('BaseError')
    })

    it('should include suggestion when provided', () => {
      const error = new BaseError('Invalid input', {
        code: 'INVALID_INPUT',
        domain: ErrorDomain.APPLICATION,
        suggestion: 'Check the input format',
      })

      const response = error.toResponse()

      expect(response.error.suggestion).toBe('Check the input format')
    })

    it('should include reference code when provided', () => {
      const error = new BaseError('System error', {
        code: 'SYSTEM_ERROR',
        domain: ErrorDomain.INFRASTRUCTURE,
        supportReferenceCode: 'ERR-789',
      })

      const response = error.toResponse()

      expect(response.error.referenceCode).toBe('ERR-789')
    })
  })

  describe('addMetadata', () => {
    it('should add metadata to context', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      error.addMetadata({ userId: 123, action: 'update' })

      expect(error.context.metadata).toEqual({
        userId: 123,
        action: 'update',
      })
    })

    it('should merge with existing metadata', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
        metadata: { initial: 'value' },
      })

      error.addMetadata({ additional: 'data' })

      expect(error.context.metadata).toEqual({
        initial: 'value',
        additional: 'data',
      })
    })

    it('should return self for chaining', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      const result = error.addMetadata({ test: 'data' })

      expect(result).toBe(error)
    })

    it('should override existing metadata keys', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
        metadata: { key: 'old' },
      })

      error.addMetadata({ key: 'new', extra: 'value' })

      expect(error.context.metadata).toEqual({
        key: 'new',
        extra: 'value',
      })
    })
  })

  describe('setCorrelationId', () => {
    it('should set correlation ID', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      error.setCorrelationId('corr-abc-123')

      expect(error.context.correlationId).toBe('corr-abc-123')
    })

    it('should override existing correlation ID', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
        correlationId: 'old-id',
      })

      error.setCorrelationId('new-id')

      expect(error.context.correlationId).toBe('new-id')
    })

    it('should return self for chaining', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      const result = error.setCorrelationId('test-id')

      expect(result).toBe(error)
    })
  })

  describe('method chaining', () => {
    it('should support method chaining', () => {
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: ErrorDomain.APPLICATION,
      })

      error
        .setCorrelationId('chain-id')
        .addMetadata({ step: 1 })
        .addMetadata({ step: 2 })

      expect(error.context.correlationId).toBe('chain-id')
      expect(error.context.metadata).toEqual({ step: 2 })
    })
  })
})
