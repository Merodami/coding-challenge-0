/**
 * ProviderClient Unit Tests
 */

import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProviderClient } from '../../../src/providers/http/ProviderClient.js'

// Mock axios
vi.mock('axios')

const mockedAxios = vi.mocked(axios)

// Mock axios.isAxiosError to properly identify axios errors
mockedAxios.isAxiosError = vi.fn((error: any): error is any => {
  return error && error.name === 'AxiosError'
}) as any

// Mock axios-retry
vi.mock('axios-retry', () => ({
  default: vi.fn(),
  exponentialDelay: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn(),
}))

// Mock the shared circuit breaker
vi.mock('@fever/shared', () => ({
  createCircuitBreaker: vi.fn((fn) => ({
    fire: async (...args: any[]) => fn(...args), // Call the function, don't just pass it
    opened: false,
    halfOpen: false,
    stats: {
      successes: 0,
      failures: 0,
      requests: 0,
      timeouts: 0,
    },
    on: vi.fn(),
  })),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  ErrorFactory: {
    timeoutError: vi.fn(
      (operation, timeoutMs) =>
        new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`),
    ),
    externalServiceError: vi.fn(
      (service, operation, details) =>
        new Error(
          `External service '${service}' failed during ${operation}: ${details}`,
        ),
    ),
    fromError: vi.fn((error) =>
      error instanceof Error ? error : new Error(String(error)),
    ),
  },
}))

describe('ProviderClient', () => {
  let client: ProviderClient
  let mockAxiosInstance: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      head: vi.fn(),
      defaults: {
        baseURL: 'http://test-provider.com',
        timeout: 5000,
      },
    }

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance)

    client = new ProviderClient({
      url: 'https://test-provider.com/api/events',
      timeout: 5000,
      retries: 2,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test-provider.com/api/events',
        timeout: 5000,
        headers: {
          Accept: 'application/xml',
          'User-Agent': 'Fever-Event-Service/1.0',
          Connection: 'keep-alive',
        },
        validateStatus: expect.any(Function),
      })
    })

    it('should use default options when none provided', () => {
      // Don't clear mocks - we need to check the second call
      new ProviderClient()

      // Check the second call (first is in beforeEach)
      expect(mockedAxios.create).toHaveBeenCalledTimes(2)
      expect(mockedAxios.create).toHaveBeenNthCalledWith(2, {
        baseURL: 'https://provider.code-challenge.feverup.com/api/events',
        timeout: 5000, // From .env.test PROVIDER_API_TIMEOUT
        headers: {
          Accept: 'application/xml',
          'User-Agent': 'Fever-Event-Service/1.0',
          Connection: 'keep-alive',
        },
        validateStatus: expect.any(Function),
      })
    })
  })

  describe('fetchEvents', () => {
    it('should return XML data on successful request', async () => {
      const mockXmlData =
        '<?xml version="1.0"?><eventList><event>Test</event></eventList>'

      mockAxiosInstance.get.mockResolvedValue({
        data: mockXmlData,
        status: 200,
      })

      const result = await client.fetchEvents()

      expect(result).toBe(mockXmlData)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('')
    })

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')

      networkError.name = 'NetworkError'
      mockAxiosInstance.get.mockRejectedValue(networkError)

      await expect(client.fetchEvents()).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')

      timeoutError.name = 'AxiosError'
      ;(timeoutError as any).code = 'ECONNABORTED'
      mockAxiosInstance.get.mockRejectedValue(timeoutError)

      await expect(client.fetchEvents()).rejects.toThrow(
        "Operation 'Provider API request' timed out after 5000ms",
      )
    })

    it('should handle 503 service unavailable', async () => {
      const error = new Error('Request failed with status code 503')

      error.name = 'AxiosError'
      ;(error as any).response = {
        status: 503,
        statusText: 'Service Unavailable',
      }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(client.fetchEvents()).rejects.toThrow(
        "External service 'Provider API' failed during fetch: Service temporarily unavailable",
      )
    })

    it('should handle 500 server errors', async () => {
      const error = new Error('Request failed with status code 500')

      error.name = 'AxiosError'
      ;(error as any).response = {
        status: 500,
        statusText: 'Internal Server Error',
      }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(client.fetchEvents()).rejects.toThrow(
        "External service 'Provider API' failed during fetch: Server error: 500 Internal Server Error",
      )
    })

    it('should handle 400 client errors', async () => {
      const error = new Error('Request failed with status code 400')

      error.name = 'AxiosError'
      ;(error as any).response = {
        status: 400,
        statusText: 'Bad Request',
      }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(client.fetchEvents()).rejects.toThrow(
        "External service 'Provider API' failed during fetch: Client error: 400 Bad Request",
      )
    })

    it('should throw error when circuit breaker is open', async () => {
      // Mock circuit breaker to be open
      const { createCircuitBreaker } = await import('@fever/shared')

      vi.mocked(createCircuitBreaker).mockReturnValue({
        fire: vi.fn().mockRejectedValue(new Error('Circuit breaker is open')),
        opened: true,
        halfOpen: false,
        stats: {
          successes: 0,
          failures: 0,
          fallbacks: 0,
          timeouts: 0,
          cacheHits: 0,
          cacheMisses: 0,
          semaphoreRejections: 0,
          percentiles: {},
          latencyMean: 0,
          latencyTimes: [],
          fires: 0,
        } as any,
        on: vi.fn(),
      } as any)

      // Create new client to use mocked circuit breaker
      const clientWithOpenCircuit = new ProviderClient()

      await expect(clientWithOpenCircuit.fetchEvents()).rejects.toThrow(
        'Circuit breaker is open',
      )
    })
  })

  describe('healthCheck', () => {
    it('should return true for successful health check', async () => {
      mockAxiosInstance.head.mockResolvedValue({
        status: 200,
      })

      const result = await client.healthCheck()

      expect(result).toBe(true)
      expect(mockAxiosInstance.head).toHaveBeenCalledWith('', { timeout: 5000 })
    })

    it('should return false for 503 status (service unavailable)', async () => {
      mockAxiosInstance.head.mockResolvedValue({
        status: 503,
      })

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false for other error status codes', async () => {
      mockAxiosInstance.head.mockResolvedValue({
        status: 404,
      })

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false on network errors', async () => {
      mockAxiosInstance.head.mockRejectedValue(new Error('Network error'))

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return circuit breaker statistics', () => {
      const stats = client.getStats()

      expect(stats).toEqual({
        state: 'closed',
        stats: {
          successes: 0,
          failures: 0,
          requests: 0,
          timeouts: 0,
        },
      })
    })

    it('should return open state when circuit breaker is open', () => {
      // Mock opened circuit breaker
      const mockCircuitBreaker = {
        fire: vi.fn(),
        opened: true,
        halfOpen: false,
        stats: { failures: 5 },
      }

      // Access the private circuit breaker and mock it
      ;(client as any).circuitBreaker = mockCircuitBreaker

      const stats = client.getStats()

      expect(stats).toEqual({
        state: 'open',
        stats: { failures: 5 },
      })
    })

    it('should return half-open state when circuit breaker is half-open', () => {
      const mockCircuitBreaker = {
        fire: vi.fn(),
        opened: false,
        halfOpen: true,
        stats: { requests: 10 },
      }

      ;(client as any).circuitBreaker = mockCircuitBreaker

      const stats = client.getStats()

      expect(stats).toEqual({
        state: 'half-open',
        stats: { requests: 10 },
      })
    })
  })

  describe('error transformation', () => {
    it('should transform axios timeout error correctly', async () => {
      const timeoutError = new Error('timeout')

      timeoutError.name = 'AxiosError'
      ;(timeoutError as any).code = 'ECONNABORTED'
      mockAxiosInstance.get.mockRejectedValue(timeoutError)

      await expect(client.fetchEvents()).rejects.toThrow(
        "Operation 'Provider API request' timed out after 5000ms",
      )
    })

    it('should transform network error correctly', async () => {
      const networkError = new Error('network error')

      networkError.name = 'AxiosError'
      ;(networkError as any).response = undefined
      mockAxiosInstance.get.mockRejectedValue(networkError)

      await expect(client.fetchEvents()).rejects.toThrow(
        "External service 'Provider API' failed during fetch: Network error or service unavailable",
      )
    })

    it('should handle general TypeError correctly', async () => {
      const typeError = new TypeError('fetch is not defined')

      mockAxiosInstance.get.mockRejectedValue(typeError)

      await expect(client.fetchEvents()).rejects.toThrow(
        "External service 'Provider API' failed during fetch: Network connection failed",
      )
    })
  })

  describe('validateStatus function', () => {
    it('should validate 2xx status codes as successful', () => {
      const axiosConfig = (mockedAxios.create as any).mock.calls[0]?.[0]
      const validateStatus = axiosConfig?.validateStatus

      expect(validateStatus(200)).toBe(true)
      expect(validateStatus(201)).toBe(true)
      expect(validateStatus(299)).toBe(true)
    })

    it('should reject non-2xx status codes', () => {
      const axiosConfig = (mockedAxios.create as any).mock.calls[0][0]
      const validateStatus = axiosConfig.validateStatus

      expect(validateStatus(300)).toBe(false)
      expect(validateStatus(400)).toBe(false)
      expect(validateStatus(500)).toBe(false)
    })
  })
})
