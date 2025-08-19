import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  getValidatedBody,
  getValidatedData,
  getValidatedParams,
  getValidatedQuery,
  validateResponse,
} from '../../../src/utils/validation.js'

describe('validation helpers', () => {
  describe('getValidatedQuery', () => {
    it('should return request.query with proper typing', () => {
      const mockRequest = {
        query: { page: 1, limit: 10, search: 'test' },
      } as unknown as Request

      interface QueryType {
        page: number
        limit: number
        search: string
      }

      const result = getValidatedQuery<QueryType>(mockRequest)

      expect(result).toEqual({ page: 1, limit: 10, search: 'test' })
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.search).toBe('test')
    })

    it('should handle empty query object', () => {
      const mockRequest = {
        query: {},
      } as unknown as Request

      const result = getValidatedQuery(mockRequest)

      expect(result).toEqual({})
    })
  })

  describe('getValidatedParams', () => {
    it('should return request.params with proper typing', () => {
      const mockRequest = {
        params: { id: '123', category: 'events' },
      } as unknown as Request

      interface ParamsType {
        id: string
        category: string
      }

      const result = getValidatedParams<ParamsType>(mockRequest)

      expect(result).toEqual({ id: '123', category: 'events' })
      expect(result.id).toBe('123')
      expect(result.category).toBe('events')
    })

    it('should handle empty params object', () => {
      const mockRequest = {
        params: {},
      } as unknown as Request

      const result = getValidatedParams(mockRequest)

      expect(result).toEqual({})
    })
  })

  describe('getValidatedBody', () => {
    it('should return request.body with proper typing', () => {
      const mockRequest = {
        body: { name: 'Test Event', description: 'A test event' },
      } as unknown as Request

      interface BodyType {
        name: string
        description: string
      }

      const result = getValidatedBody<BodyType>(mockRequest)

      expect(result).toEqual({
        name: 'Test Event',
        description: 'A test event',
      })
      expect(result.name).toBe('Test Event')
      expect(result.description).toBe('A test event')
    })

    it('should handle null body', () => {
      const mockRequest = {
        body: null,
      } as unknown as Request

      const result = getValidatedBody(mockRequest)

      expect(result).toBeNull()
    })
  })

  describe('getValidatedData', () => {
    it('should return all validated data with proper typing', () => {
      const mockRequest = {
        query: { page: 1, limit: 10 },
        params: { id: '123' },
        body: { name: 'Test' },
      } as unknown as Request

      interface QueryType {
        page: number
        limit: number
      }
      interface ParamsType {
        id: string
      }
      interface BodyType {
        name: string
      }

      const result = getValidatedData<QueryType, ParamsType, BodyType>(
        mockRequest,
      )

      expect(result.query).toEqual({ page: 1, limit: 10 })
      expect(result.params).toEqual({ id: '123' })
      expect(result.body).toEqual({ name: 'Test' })
    })

    it('should handle empty data objects', () => {
      const mockRequest = {
        query: {},
        params: {},
        body: {},
      } as unknown as Request

      const result = getValidatedData(mockRequest)

      expect(result.query).toEqual({})
      expect(result.params).toEqual({})
      expect(result.body).toEqual({})
    })

    it('should work with default any types', () => {
      const mockRequest = {
        query: { anything: 'goes' },
        params: { here: 'too' },
        body: { and: 'here' },
      } as unknown as Request

      const result = getValidatedData(mockRequest)

      expect(result.query).toEqual({ anything: 'goes' })
      expect(result.params).toEqual({ here: 'too' })
      expect(result.body).toEqual({ and: 'here' })
    })
  })

  describe('validateResponse', () => {
    const userSchema = z.object({
      id: z.number(),
      name: z.string(),
      email: z.string().email(),
    })

    it('should return validated data for valid input', () => {
      const validData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      }

      const result = validateResponse(userSchema, validData)

      expect(result).toEqual(validData)
    })

    it('should throw validation error for invalid data', () => {
      const invalidData = {
        id: 'not-a-number',
        name: 'John Doe',
        email: 'invalid-email',
      }

      expect(() => validateResponse(userSchema, invalidData)).toThrow(
        'Response validation failed',
      )

      try {
        validateResponse(userSchema, invalidData)
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.httpPart).toBe('response')
        expect(error.validation).toBeDefined()
        expect(Array.isArray(error.validation)).toBe(true)
        expect(error.validation.length).toBeGreaterThan(0)

        // Check validation error structure
        const firstValidationError = error.validation[0]

        expect(firstValidationError).toHaveProperty('instancePath')
        expect(firstValidationError).toHaveProperty('message')
        expect(firstValidationError.instancePath).toMatch(/^\/response\//)
      }
    })

    it('should include all validation errors', () => {
      const invalidData = {
        // Missing id
        name: '', // Empty name
        email: 'invalid-email',
      }

      try {
        validateResponse(userSchema, invalidData)
      } catch (error: any) {
        expect(error.validation.length).toBeGreaterThanOrEqual(2)

        // Should have errors for id, name, and email
        const instancePaths = error.validation.map((v: any) => v.instancePath)

        expect(instancePaths.some((path: string) => path.includes('id'))).toBe(
          true,
        )
        expect(
          instancePaths.some((path: string) => path.includes('email')),
        ).toBe(true)
      }
    })

    it('should handle nested object validation', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number().min(0),
          }),
        }),
      })

      const invalidNested = {
        user: {
          profile: {
            age: -5, // Invalid age
          },
        },
      }

      try {
        validateResponse(nestedSchema, invalidNested)
      } catch (error: any) {
        expect(error.validation[0].instancePath).toContain('user')
        expect(error.validation[0].instancePath).toContain('profile')
        expect(error.validation[0].instancePath).toContain('age')
      }
    })

    it('should handle array validation', () => {
      const arraySchema = z.object({
        items: z.array(z.number()),
      })

      const invalidArray = {
        items: [1, 'not-a-number', 3],
      }

      try {
        validateResponse(arraySchema, invalidArray)
      } catch (error: any) {
        expect(error.validation[0].instancePath).toContain('items')
        expect(error.validation[0].instancePath).toContain('1') // Array index
      }
    })

    it('should re-throw non-ZodError errors', () => {
      const customError = new Error('Custom error')
      const faultySchema = {
        parse: () => {
          throw customError
        },
      } as unknown as z.ZodSchema

      expect(() => validateResponse(faultySchema, {})).toThrow('Custom error')
    })

    it('should work with simple schemas', () => {
      const simpleSchema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      })

      const validData = {
        id: 1,
        name: 'Test Item',
        active: true,
      }

      const result = validateResponse(simpleSchema, validData)

      expect(result).toEqual(validData)
    })
  })
})
