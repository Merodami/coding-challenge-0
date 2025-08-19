import { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../../../../src/infrastructure/express/middleware/validation.js'

describe('validation middleware', () => {
  let mockRequest: Partial<Request>

  const mockResponse = {} as Response
  const mockNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = {
      query: {},
      params: {},
      body: {},
    }
  })

  describe('validateQuery', () => {
    it('should validate and transform query parameters', async () => {
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10),
      })

      mockRequest.query = { page: '2', limit: '20' }

      const middleware = validateQuery(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.query).toEqual({ page: 2, limit: 20 })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should use default values when query params are missing', async () => {
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10),
      })

      mockRequest.query = {}

      const middleware = validateQuery(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.query).toEqual({ page: 1, limit: 10 })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should call next with validation error for invalid query', async () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
      })

      mockRequest.query = { page: '0' }

      const middleware = validateQuery(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          httpPart: 'query',
          validation: expect.arrayContaining([
            expect.objectContaining({
              instancePath: '/query/page',
              message: expect.stringContaining(''),
            }),
          ]),
        }),
      )
    })

    it('should handle non-Zod errors', async () => {
      const schema = z.object({}).refine(() => {
        throw new Error('Custom error')
      })

      const middleware = validateQuery(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('validateParams', () => {
    it('should validate and transform route parameters', async () => {
      const schema = z.object({
        id: z.coerce.number(),
        slug: z.string(),
      })

      mockRequest.params = { id: '123', slug: 'test-slug' }

      const middleware = validateParams(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.params).toEqual({ id: 123, slug: 'test-slug' })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should call next with validation error for invalid params', async () => {
      const schema = z.object({
        id: z.coerce.number(),
      })

      mockRequest.params = { id: 'not-a-number' }

      const middleware = validateParams(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          httpPart: 'params',
          validation: expect.arrayContaining([
            expect.objectContaining({
              instancePath: '/params/id',
            }),
          ]),
        }),
      )
    })
  })

  describe('validateBody', () => {
    it('should validate and transform request body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
        email: z.string().email(),
      })

      mockRequest.body = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      }

      const middleware = validateBody(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.body).toEqual({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should call next with validation error for invalid body', async () => {
      const schema = z.object({
        email: z.string().email(),
      })

      mockRequest.body = { email: 'invalid-email' }

      const middleware = validateBody(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          httpPart: 'body',
          validation: expect.arrayContaining([
            expect.objectContaining({
              instancePath: '/body/email',
              message: expect.stringContaining(''),
            }),
          ]),
        }),
      )
    })

    it('should handle nested object validation', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            age: z.number(),
          }),
        }),
      })

      mockRequest.body = {
        user: {
          name: 'John',
          profile: {
            age: 25,
          },
        },
      }

      const middleware = validateBody(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.body).toEqual({
        user: {
          name: 'John',
          profile: {
            age: 25,
          },
        },
      })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should handle array validation', async () => {
      const schema = z.object({
        items: z.array(z.string()).min(1),
      })

      mockRequest.body = {
        items: ['one', 'two', 'three'],
      }

      const middleware = validateBody(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      expect(mockRequest.body.items).toEqual(['one', 'two', 'three'])
      expect(mockNext).toHaveBeenCalledWith()
    })
  })

  describe('error formatting', () => {
    it('should format multiple validation errors correctly', async () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
        email: z.string().email(),
      })

      mockRequest.body = {
        name: 'Jo',
        age: 16,
        email: 'invalid',
      }

      const middleware = validateBody(schema)

      await middleware(mockRequest as Request, mockResponse, mockNext)

      const error = mockNext.mock.calls[0]?.[0]

      expect(error.validation).toHaveLength(3)
      expect(error.validation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ instancePath: '/body/name' }),
          expect.objectContaining({ instancePath: '/body/age' }),
          expect.objectContaining({ instancePath: '/body/email' }),
        ]),
      )
    })
  })
})
