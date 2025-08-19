import type { ICacheService } from '@fever/redis'
import { HttpMethod } from '@fever/types'
import type { NextFunction, Request, Response } from 'express'
import { get, set as setProperty } from 'lodash-es'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  idempotencyMiddleware,
  idempotencyPlugin,
} from '../../../../../src/infrastructure/express/middleware/idempotency.js'

describe('idempotency', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let mockCacheService: ICacheService

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/api/users',
      headers: {},
      body: { name: 'John' },
      query: {},
    }

    const headerNames: string[] = []
    const headers: Record<string, string> = {}

    mockResponse = {
      statusCode: 200,
      send: vi.fn().mockImplementation(function (this: any) {
        return this
      }),
      json: vi.fn().mockImplementation(function (this: any) {
        return this
      }),
      status: vi.fn().mockImplementation(function (this: any, code: number) {
        this.statusCode = code

        return this
      }),
      set: vi.fn().mockImplementation(function (
        this: any,
        key: string,
        value: string,
      ) {
        setProperty(headers, key, value)
        if (!headerNames.includes(key)) {
          headerNames.push(key)
        }

        return this
      }),
      getHeaderNames: vi.fn(() => headerNames),
      getHeader: vi.fn((name: string) => get(headers, name)),
      on: vi.fn(),
    }

    mockNext = vi.fn()

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      getTTL: vi.fn(),
      updateTTL: vi.fn(),
      delByPattern: vi.fn(),
      clearAll: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      checkHealth: vi.fn(),
    } as unknown as ICacheService
  })

  describe('idempotencyMiddleware', () => {
    it('should skip when disabled', async () => {
      const middleware = idempotencyMiddleware({
        enabled: false,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should skip for non-configured methods', async () => {
      mockRequest.method = 'GET'

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should skip excluded routes', async () => {
      Object.assign(mockRequest, { path: '/health/check' })

      const middleware = idempotencyMiddleware({
        enabled: true,
        excludeRoutes: ['/health'],
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should check cache for idempotent requests', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^idempotency:/),
      )
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return cached response when found', async () => {
      const cachedResponse = {
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: { id: 1, name: 'John' },
      }

      vi.mocked(mockCacheService.get).mockResolvedValue(cachedResponse)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockResponse.set).toHaveBeenCalledWith(
        'X-Idempotent-Replayed',
        'true',
      )
      expect(mockResponse.set).toHaveBeenCalledWith(
        'content-type',
        'application/json',
      )
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1, name: 'John' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should use idempotency key from header when provided', async () => {
      mockRequest.headers = { 'idempotency-key': 'unique-key-123' }
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'idempotency:unique-key-123',
      )
    })

    it('should generate hash key when no header provided', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      // Should generate a SHA256 hash
      const callArg = vi.mocked(mockCacheService.get).mock.calls[0]?.[0]

      expect(callArg).toMatch(/^idempotency:[a-f0-9]{64}$/)
    })

    it('should cache successful responses', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
        defaultTTL: 3600,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      // Simulate response being sent
      mockResponse.statusCode = 201

      const responseData = { id: 1, name: 'John' }

      mockResponse.json!(responseData)

      // Trigger the finish event
      const onMocked = vi.mocked(mockResponse.on)
      const onCalls = onMocked?.mock?.calls
      const finishCall = onCalls?.find((call) => call[0] === 'finish')
      const finishHandler = finishCall ? finishCall[1] : undefined

      if (finishHandler) {
        await finishHandler()
      }

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^idempotency:/),
        {
          statusCode: 201,
          headers: expect.any(Object),
          body: responseData,
        },
        3600,
      )
    })

    it('should not cache error responses', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      // Simulate error response
      mockResponse.statusCode = 400
      mockResponse.json!({ error: 'Bad request' })

      // Trigger the finish event
      const onMocked = vi.mocked(mockResponse.on)
      const onCalls = onMocked?.mock?.calls
      const finishCall = onCalls?.find((call) => call[0] === 'finish')
      const finishHandler = finishCall ? finishCall[1] : undefined

      if (finishHandler) {
        await finishHandler()
      }

      expect(mockCacheService.set).not.toHaveBeenCalled()
    })

    it('should handle different HTTP methods', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        methods: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE],
        cacheService: mockCacheService,
      })

      // Test DELETE method
      mockRequest.method = 'DELETE'
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).toHaveBeenCalled()

      // Test GET method (should skip)
      vi.clearAllMocks()
      mockRequest.method = 'GET'
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(mockCacheService.get).mockRejectedValue(
        new Error('Cache error'),
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const middleware = idempotencyMiddleware({
        enabled: true,
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        'Idempotency middleware error:',
        expect.any(Error),
      )
      expect(mockNext).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should use custom configuration', async () => {
      mockRequest.headers = { 'x-request-id': 'custom-123' }
      vi.mocked(mockCacheService.get).mockResolvedValue(null)

      const middleware = idempotencyMiddleware({
        enabled: true,
        headerName: 'x-request-id',
        keyPrefix: 'custom-prefix',
        cacheService: mockCacheService,
      })

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      )

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'custom-prefix:custom-123',
      )
    })
  })

  describe('idempotencyPlugin', () => {
    it('should check for cached response', async () => {
      const plugin = idempotencyPlugin(mockCacheService)

      vi.mocked(mockCacheService.get).mockResolvedValue({
        statusCode: 200,
        headers: {},
        body: { data: 'test' },
      })

      const result = await plugin.check('test-key')

      expect(mockCacheService.get).toHaveBeenCalledWith('idempotency:test-key')
      expect(result).toEqual({
        statusCode: 200,
        headers: {},
        body: { data: 'test' },
      })
    })

    it('should store response with TTL', async () => {
      const plugin = idempotencyPlugin(mockCacheService)

      const response = {
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: { id: 1 },
      }

      await plugin.store('test-key', response, 7200)

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'idempotency:test-key',
        response,
        7200,
      )
    })

    it('should use default TTL when not specified', async () => {
      const plugin = idempotencyPlugin(mockCacheService, {
        defaultTTL: 1800,
      })

      const response = {
        statusCode: 200,
        headers: {},
        body: {},
      }

      await plugin.store('test-key', response)

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'idempotency:test-key',
        response,
        1800,
      )
    })

    it('should clear cached response', async () => {
      const plugin = idempotencyPlugin(mockCacheService)

      await plugin.clear('test-key')

      expect(mockCacheService.del).toHaveBeenCalledWith('idempotency:test-key')
    })

    it('should use custom key prefix', async () => {
      const plugin = idempotencyPlugin(mockCacheService, {
        keyPrefix: 'custom',
      })

      await plugin.check('key1')
      await plugin.store('key2', { statusCode: 200, headers: {}, body: {} })
      await plugin.clear('key3')

      expect(mockCacheService.get).toHaveBeenCalledWith('custom:key1')
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'custom:key2',
        expect.any(Object),
        expect.any(Number),
      )
      expect(mockCacheService.del).toHaveBeenCalledWith('custom:key3')
    })
  })
})
