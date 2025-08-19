import { describe, expect, it } from 'vitest'

import {
  createErrorResponse,
  createSuccessResponse,
} from '../../src/common/api.js'
import { ErrorCode } from '../../src/errorCodes.js'

describe('API response utilities', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test' }
      const response = createSuccessResponse(data)

      expect(response).toEqual({
        data,
        error: null,
      })
    })

    it('should handle array data', () => {
      const data = [1, 2, 3]
      const response = createSuccessResponse(data)

      expect(response).toEqual({
        data,
        error: null,
      })
    })

    it('should handle string data', () => {
      const data = 'Success'
      const response = createSuccessResponse(data)

      expect(response).toEqual({
        data,
        error: null,
      })
    })

    it('should handle null data', () => {
      const data = null
      const response = createSuccessResponse(data)

      expect(response).toEqual({
        data: null,
        error: null,
      })
    })

    it('should handle complex nested data', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            settings: {
              theme: 'dark',
            },
          },
        },
        metadata: {
          timestamp: '2024-01-01',
        },
      }
      const response = createSuccessResponse(data)

      expect(response).toEqual({
        data,
        error: null,
      })
    })
  })

  describe('createErrorResponse', () => {
    it('should create an error response with ErrorCode enum', () => {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
      )

      expect(response).toEqual({
        data: null,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
        },
      })
    })

    it('should create an error response with string code', () => {
      const response = createErrorResponse(
        'CUSTOM_ERROR',
        'Custom error occurred',
      )

      expect(response).toEqual({
        data: null,
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error occurred',
        },
      })
    })

    it('should handle different error codes', () => {
      const testCases = [
        { code: ErrorCode.NOT_FOUND, message: 'Resource not found' },
        { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated' },
        { code: ErrorCode.FORBIDDEN, message: 'Not authorized' },
        { code: ErrorCode.INTERNAL_ERROR, message: 'Server error' },
      ]

      testCases.forEach(({ code, message }) => {
        const response = createErrorResponse(code, message)

        expect(response).toEqual({
          data: null,
          error: { code, message },
        })
      })
    })

    it('should handle empty message', () => {
      const response = createErrorResponse(ErrorCode.BAD_REQUEST, '')

      expect(response).toEqual({
        data: null,
        error: {
          code: ErrorCode.BAD_REQUEST,
          message: '',
        },
      })
    })

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(1000)
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        longMessage,
      )

      expect(response).toEqual({
        data: null,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: longMessage,
        },
      })
    })
  })

  describe('type safety', () => {
    it('should maintain proper TypeScript types', () => {
      const successResponse = createSuccessResponse({ id: 1 })
      const errorResponse = createErrorResponse(
        ErrorCode.NOT_FOUND,
        'Not found',
      )

      // TypeScript compile-time checks (runtime assertions for test)
      expect(successResponse.data).toBeDefined()
      expect(successResponse.error).toBeNull()
      expect(errorResponse.data).toBeNull()
      expect(errorResponse.error).toBeDefined()
    })
  })
})
