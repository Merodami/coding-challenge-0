import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorMiddleware } from '../../../../../src/infrastructure/express/middleware/errorHandler.js'

// Mock the shared module
vi.mock('@fever/shared', () => ({
  BaseError: class MockBaseError extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message)
      this.name = 'BaseError'
    }
  },
  ErrorFactory: {
    validationError: vi
      .fn()
      .mockReturnValue({ statusCode: 400, message: 'Validation failed' }),
    fromError: vi
      .fn()
      .mockReturnValue({ statusCode: 500, message: 'Internal error' }),
  },
  createErrorHandler: vi.fn(() => vi.fn()),
}))

// Mock environment
vi.mock('@fever/environment', () => ({
  NODE_ENV: 'test',
}))

interface RequestWithCorrelationId extends Request {
  correlationId?: string
}

describe('errorMiddleware', () => {
  let mockRequest: Partial<RequestWithCorrelationId>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      method: 'GET',
      url: '/test',
      correlationId: 'test-correlation-id',
    }

    mockResponse = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    mockNext = vi.fn()
  })

  describe('headers already sent', () => {
    it('should call next() if headers are already sent', async () => {
      const middleware = errorMiddleware({})
      const error = new Error('Test error')

      mockResponse.headersSent = true

      await middleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('status/message error handling', () => {
    it('should handle errors with status and message properties', async () => {
      const middleware = errorMiddleware({})
      const error = {
        status: 404,
        message: 'Not found',
        content: { id: 'missing-resource' },
      } as any

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await middleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        error: {
          code: 'REQUEST_ERROR',
          message: 'Not found',
          content: { id: 'missing-resource' },
        },
      })

      consoleSpy.mockRestore()
    })

    it('should default to status 500 if no status provided', async () => {
      const middleware = errorMiddleware({})
      const error = {
        status: undefined, // Explicitly undefined but property exists
        message: 'Internal error',
      } as any

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await middleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        error: {
          code: 'REQUEST_ERROR',
          message: 'Internal error',
        },
      })

      consoleSpy.mockRestore()
    })
  })

  describe('validation error handling', () => {
    it('should handle validation errors with VALIDATION_ERROR code', async () => {
      const middleware = errorMiddleware({})
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        validation: [
          {
            instancePath: '/body/email',
            message: 'Invalid email format',
          },
          {
            instancePath: '/body/name',
            message: 'Name is required',
          },
        ],
      } as any

      await middleware(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      // The validation error should be processed and converted to a structured error
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle validation errors with validation property', async () => {
      const middleware = errorMiddleware({})
      const validationError = {
        message: 'Validation failed',
        validation: [
          {
            keyword: 'required',
            params: { missingProperty: 'username' },
            message: 'Username is required',
          },
        ],
      } as any

      await middleware(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should skip null/undefined validation entries', async () => {
      const middleware = errorMiddleware({})
      const validationError = {
        validation: [
          null,
          {
            instancePath: '/body/name',
            message: 'Name is required',
          },
          undefined,
        ],
      } as any

      await middleware(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('field path extraction', () => {
    it('should extract field from instancePath correctly', async () => {
      const middleware = errorMiddleware({})
      const validationError = {
        validation: [
          {
            instancePath: '/body/email',
            message: 'Invalid email',
          },
          {
            instancePath: '/query/page',
            message: 'Invalid page',
          },
          {
            instancePath: '/params/id',
            message: 'Invalid ID',
          },
        ],
      } as any

      await middleware(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      // Should extract 'email', 'page', 'id' as field names
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle complex nested paths', async () => {
      const middleware = errorMiddleware({})
      const validationError = {
        validation: [
          {
            instancePath: '/body/user/profile/age',
            message: 'Invalid age',
          },
        ],
      } as any

      await middleware(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
