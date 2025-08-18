import { HealthStatus } from '@fever/types'
import { Express, Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupServiceHealthCheck } from '../../../../src/application/api/healthCheck.js'
import type { HealthCheckConfig } from '../../../../src/domain/types/healthCheck.js'

describe('healthCheck', () => {
  let mockApp: Partial<Express>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let healthEndpointHandler: any
  let detailsEndpointHandler: any

  beforeEach(() => {
    vi.useFakeTimers()

    mockRequest = {}
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    }

    mockApp = {
      get: vi.fn((path: string, handler: any) => {
        if (path === '/health') {
          healthEndpointHandler = handler
        } else if (path === '/health/details') {
          detailsEndpointHandler = handler
        }
      }) as any,
    } as Partial<Express> as Express
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('setupServiceHealthCheck', () => {
    it('should register health endpoints', () => {
      const healthChecks: HealthCheckConfig[] = []

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      expect(mockApp.get).toHaveBeenCalledTimes(2)
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function))
      expect(mockApp.get).toHaveBeenCalledWith(
        '/health/details',
        expect.any(Function),
      )
    })
  })

  describe('/health endpoint', () => {
    it('should return healthy status with service info', () => {
      const healthChecks: HealthCheckConfig[] = []

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      // Advance time to simulate uptime AFTER setup
      vi.advanceTimersByTime(5000) // 5 seconds uptime

      // Call the health endpoint handler
      healthEndpointHandler(mockRequest, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(String),
        service: 'test-service',
        uptime: 5,
      })
    })

    it('should calculate uptime correctly', () => {
      const healthChecks: HealthCheckConfig[] = []

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000)

      healthEndpointHandler(mockRequest, mockResponse)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.uptime).toBe(60)
    })
  })

  describe('/health/details endpoint', () => {
    it('should return healthy when all checks pass', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'database',
          check: vi.fn().mockResolvedValue(true),
        },
        {
          name: 'redis',
          check: vi.fn().mockResolvedValue(true),
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(String),
        service: 'test-service',
        uptime: expect.any(Number),
        checks: [
          {
            name: 'database',
            status: HealthStatus.HEALTHY,
            duration: expect.any(Number),
          },
          {
            name: 'redis',
            status: HealthStatus.HEALTHY,
            duration: expect.any(Number),
          },
        ],
      })
    })

    it('should return unhealthy when critical check fails', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'database',
          check: vi.fn().mockResolvedValue(false),
          critical: true,
        },
        {
          name: 'redis',
          check: vi.fn().mockResolvedValue(true),
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(503)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.status).toBe(HealthStatus.UNHEALTHY)
      expect(response.checks[0].status).toBe(HealthStatus.UNHEALTHY)
    })

    it('should return degraded when non-critical check fails', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'database',
          check: vi.fn().mockResolvedValue(true),
        },
        {
          name: 'optional-service',
          check: vi.fn().mockResolvedValue(false),
          critical: false,
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(503)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.status).toBe(HealthStatus.DEGRADED)
    })

    it('should handle check errors', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'database',
          check: vi.fn().mockRejectedValue(new Error('Connection failed')),
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(503)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.status).toBe(HealthStatus.UNHEALTHY)
      expect(response.checks[0]).toEqual({
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        duration: expect.any(Number),
        error: 'Connection failed',
      })
    })

    it('should handle check timeouts', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'slow-service',
          check: vi.fn(() => new Promise<boolean>(() => {})), // Never resolves
          timeout: 100,
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      const promise = detailsEndpointHandler(mockRequest, mockResponse)

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(101)

      await promise

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.checks[0]).toEqual({
        name: 'slow-service',
        status: HealthStatus.UNHEALTHY,
        duration: expect.any(Number),
        error: 'Health check timeout',
      })
    })

    it('should use default timeout of 5000ms', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'default-timeout',
          check: vi.fn(() => new Promise<boolean>(() => {})), // Never resolves
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      const promise = detailsEndpointHandler(mockRequest, mockResponse)

      // Advance just under default timeout
      vi.advanceTimersByTime(4999)

      // Should not have resolved yet
      let resolved = false

      promise.then(() => {
        resolved = true
      })
      await Promise.resolve() // Flush promises
      expect(resolved).toBe(false)

      // Now trigger timeout
      vi.advanceTimersByTime(2)
      await promise

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.checks[0].status).toBe(HealthStatus.UNHEALTHY)
    })

    it('should handle mixed check results', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'database',
          check: vi.fn().mockResolvedValue(true),
        },
        {
          name: 'redis',
          check: vi.fn().mockRejectedValue(new Error('Connection lost')),
          critical: true,
        },
        {
          name: 'optional',
          check: vi.fn().mockResolvedValue(false),
          critical: false,
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.status).toBe(HealthStatus.UNHEALTHY) // Critical failure takes precedence
      expect(response.checks).toHaveLength(3)
      expect(response.checks[0].status).toBe(HealthStatus.HEALTHY)
      expect(response.checks[1].status).toBe(HealthStatus.UNHEALTHY)
      expect(response.checks[2].status).toBe(HealthStatus.UNHEALTHY)
    })

    it('should handle non-Error exceptions', async () => {
      const healthChecks: HealthCheckConfig[] = [
        {
          name: 'strange-error',
          check: vi.fn().mockRejectedValue('string error'),
        },
      ]

      setupServiceHealthCheck(mockApp as Express, healthChecks, {
        serviceName: 'test-service',
      })

      await detailsEndpointHandler(mockRequest, mockResponse)

      const response = (mockResponse.json as any).mock.calls[0][0]

      expect(response.checks[0].error).toBe('Unknown error')
    })
  })
})
