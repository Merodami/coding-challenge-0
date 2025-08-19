import { CircuitBreakerState } from '@fever/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AsyncFunction,
  createCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  type ExtendedCircuitBreakerOptions,
  getCircuitBreakerStats,
} from '../../../src/utils/circuitBreaker.js'

// Mock environment variables
vi.mock('@fever/environment', () => ({
  CIRCUIT_BREAKER_TIMEOUT: 3000,
  CIRCUIT_BREAKER_ERROR_THRESHOLD: 50,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 10000,
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: 5,
  CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT: 60000,
}))

// Mock logger
vi.mock('../../../src/infrastructure/logger/index.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('circuitBreaker', () => {
  let mockFunction: AsyncFunction<[string], string>
  let successFunction: AsyncFunction<[string], string>
  let failingFunction: AsyncFunction<[string], string>
  let slowFunction: AsyncFunction<[string], string>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock functions
    mockFunction = vi.fn(async (input: string) => `success: ${input}`)
    successFunction = async (input: string) => `result: ${input}`
    failingFunction = async () => {
      throw new Error('Service unavailable')
    }
    slowFunction = async (input: string) => {
      await new Promise((resolve) => setTimeout(resolve, 5000))

      return `slow: ${input}`
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('createCircuitBreaker', () => {
    it('should create a circuit breaker with default options', () => {
      const breaker = createCircuitBreaker(successFunction)

      expect(breaker).toBeDefined()
      expect(breaker.name).toBeDefined()
      expect(breaker.enabled).toBe(true)
    })

    it('should create a circuit breaker with custom options', () => {
      const options: ExtendedCircuitBreakerOptions = {
        name: 'test-breaker',
        timeout: 1000,
        errorThresholdPercentage: 60,
        volumeThreshold: 3,
      }

      const breaker = createCircuitBreaker(successFunction, options)

      expect(breaker).toBeDefined()
      expect((breaker as any).options.timeout).toBe(1000)
      expect((breaker as any).volumeThreshold).toBe(3)
    })

    it('should merge custom options with defaults', () => {
      const options: ExtendedCircuitBreakerOptions = {
        timeout: 1000,
      }

      const breaker = createCircuitBreaker(successFunction, options)

      expect((breaker as any).options.timeout).toBe(1000)
      expect((breaker as any).volumeThreshold).toBe(
        DEFAULT_CIRCUIT_BREAKER_OPTIONS.volumeThreshold,
      )
    })

    it('should execute wrapped function successfully', async () => {
      const breaker = createCircuitBreaker(mockFunction)

      const result = await breaker.fire('test')

      expect(result).toBe('success: test')
      expect(mockFunction).toHaveBeenCalledWith('test')
    })

    it('should handle function failures', async () => {
      const breaker = createCircuitBreaker(failingFunction, {
        volumeThreshold: 1,
      })

      await expect(breaker.fire('test')).rejects.toThrow('Service unavailable')
    })

    it('should timeout slow functions', async () => {
      const breaker = createCircuitBreaker(slowFunction, {
        timeout: 100,
      })

      await expect(breaker.fire('test')).rejects.toThrow()
    })
  })

  describe('circuit breaker states', () => {
    it('should start in closed state', () => {
      const breaker = createCircuitBreaker(successFunction)

      expect(breaker.opened).toBe(false)
      expect(breaker.halfOpen).toBe(false)
    })

    it('should open after threshold failures', async () => {
      const breaker = createCircuitBreaker(failingFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      })

      // Need to reach volume threshold
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      // Circuit should be open
      expect(breaker.opened).toBe(true)
    })

    it('should reject requests when open', async () => {
      const breaker = createCircuitBreaker(failingFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      })

      // Open the circuit
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      // Should reject without calling function
      ;(mockFunction as any).mockClear?.()
      await expect(breaker.fire('test')).rejects.toThrow()
      expect(mockFunction).not.toHaveBeenCalled()
    })

    it('should transition to half-open after reset timeout', async () => {
      vi.useFakeTimers()

      const breaker = createCircuitBreaker(failingFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        resetTimeout: 1000,
      })

      // Open the circuit
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      expect(breaker.opened).toBe(true)

      // Wait for reset timeout
      vi.advanceTimersByTime(1000)

      // Should be half-open (will test next request)
      expect(breaker.halfOpen).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('event listeners', () => {
    it('should log when circuit opens', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(failingFunction, {
        name: 'test-service',
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      })

      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      expect(logger.warn).toHaveBeenCalledWith(
        'Circuit breaker opened: test-service',
      )
    })

    it('should log successful requests', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(successFunction, {
        name: 'test-service',
      })

      await breaker.fire('test')

      expect(logger.debug).toHaveBeenCalledWith(
        'Circuit breaker success: test-service',
      )
    })

    it('should log failures', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(failingFunction, {
        name: 'test-service',
      })

      await expect(breaker.fire('test')).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        { error: 'Service unavailable' },
        'Circuit breaker failure: test-service',
      )
    })

    it('should log timeouts', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(slowFunction, {
        name: 'test-service',
        timeout: 10,
      })

      await expect(breaker.fire('test')).rejects.toThrow()

      expect(logger.warn).toHaveBeenCalledWith(
        'Circuit breaker timeout: test-service',
      )
    })

    it('should log rejections when open', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(failingFunction, {
        name: 'test-service',
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      })

      // Open the circuit
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      // Clear previous logs
      vi.clearAllMocks()

      // This should be rejected
      await expect(breaker.fire('test')).rejects.toThrow()

      expect(logger.warn).toHaveBeenCalledWith(
        'Circuit breaker rejected request: test-service',
      )
    })

    it('should use default name when not provided', async () => {
      const { logger } = await import(
        '../../../src/infrastructure/logger/index.js'
      )
      const breaker = createCircuitBreaker(successFunction)

      await breaker.fire('test')

      expect(logger.debug).toHaveBeenCalledWith(
        'Circuit breaker success: circuit-breaker',
      )
    })
  })

  describe('getCircuitBreakerStats', () => {
    it('should return stats for closed circuit', () => {
      const breaker = createCircuitBreaker(successFunction, {
        name: 'test-breaker',
        errorThresholdPercentage: 60,
      })

      const stats = getCircuitBreakerStats(breaker, {
        errorThresholdPercentage: 60,
      })

      expect(stats.state).toBe(CircuitBreakerState.CLOSED)
      expect(stats.enabled).toBe(true)
      expect(stats.name).toBeDefined()
      expect(stats.volumeThreshold).toBe(5) // Default from mock
      expect(stats.errorThresholdPercentage).toBe(60)
    })

    it('should return stats for open circuit', async () => {
      const breaker = createCircuitBreaker(failingFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      })

      // Open the circuit
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      const stats = getCircuitBreakerStats(breaker, {
        errorThresholdPercentage: 50,
      })

      expect(stats.state).toBe(CircuitBreakerState.OPEN)
    })

    it('should return stats for half-open circuit', async () => {
      vi.useFakeTimers()

      const breaker = createCircuitBreaker(failingFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        resetTimeout: 100,
      })

      // Open the circuit
      await expect(breaker.fire('test')).rejects.toThrow()
      await expect(breaker.fire('test')).rejects.toThrow()

      // Wait for reset timeout to transition to half-open
      vi.advanceTimersByTime(100)

      const stats = getCircuitBreakerStats(breaker, {})

      expect(stats.state).toBe(CircuitBreakerState.HALF_OPEN)

      vi.useRealTimers()
    })

    it('should use default error threshold when not provided', () => {
      const breaker = createCircuitBreaker(successFunction)

      const stats = getCircuitBreakerStats(breaker, {})

      expect(stats.errorThresholdPercentage).toBe(50) // Default from mock
    })

    it('should include breaker stats object', () => {
      const breaker = createCircuitBreaker(successFunction)

      const stats = getCircuitBreakerStats(breaker, {})

      expect(stats.stats).toBeDefined()
      expect(typeof stats.stats).toBe('object')
    })
  })

  describe('DEFAULT_CIRCUIT_BREAKER_OPTIONS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.timeout).toBe(3000)
      expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.errorThresholdPercentage).toBe(50)
      expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.resetTimeout).toBe(10000)
      expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.volumeThreshold).toBe(5)
      expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.rollingCountTimeout).toBe(60000)
    })
  })

  describe('complex scenarios', () => {
    it('should handle mixed success and failure', async () => {
      let callCount = 0

      const mixedFunction = async () => {
        callCount++
        if (callCount % 2 === 0) {
          throw new Error('Intermittent failure')
        }

        return 'success'
      }

      const breaker = createCircuitBreaker(mixedFunction, {
        errorThresholdPercentage: 60,
        volumeThreshold: 5,
      })

      // Mix of success and failures
      await expect(breaker.fire()).resolves.toBe('success')
      await expect(breaker.fire()).rejects.toThrow()
      await expect(breaker.fire()).resolves.toBe('success')
      await expect(breaker.fire()).rejects.toThrow()
      await expect(breaker.fire()).resolves.toBe('success')

      // Circuit should still be closed (40% failure rate < 60% threshold)
      expect(breaker.opened).toBe(false)
    })

    it('should recover from open state on successful half-open test', async () => {
      vi.useFakeTimers()

      let shouldFail = true

      const recoveringFunction = async () => {
        if (shouldFail) {
          throw new Error('Service down')
        }

        return 'recovered'
      }

      const breaker = createCircuitBreaker(recoveringFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        resetTimeout: 1000,
      })

      // Open the circuit
      await expect(breaker.fire()).rejects.toThrow()
      await expect(breaker.fire()).rejects.toThrow()
      expect(breaker.opened).toBe(true)

      // Service recovers
      shouldFail = false

      // Wait for reset timeout
      vi.advanceTimersByTime(1000)

      // Half-open test should succeed and close circuit
      await expect(breaker.fire()).resolves.toBe('recovered')
      expect(breaker.opened).toBe(false)

      vi.useRealTimers()
    })
  })
})
