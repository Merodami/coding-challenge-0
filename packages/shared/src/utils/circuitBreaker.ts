import {
  CIRCUIT_BREAKER_ERROR_THRESHOLD,
  CIRCUIT_BREAKER_RESET_TIMEOUT,
  CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT,
  CIRCUIT_BREAKER_TIMEOUT,
  CIRCUIT_BREAKER_VOLUME_THRESHOLD,
} from '@fever/environment'
import { CircuitBreakerState } from '@fever/types'
import CircuitBreaker, { Options } from 'opossum'

import { logger } from '../infrastructure/logger/index.js'

/**
 * Extended circuit breaker options with our custom properties
 */
export interface ExtendedCircuitBreakerOptions extends Options {
  name?: string
}

/**
 * Default circuit breaker options for external services
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Options = {
  timeout: CIRCUIT_BREAKER_TIMEOUT,
  errorThresholdPercentage: CIRCUIT_BREAKER_ERROR_THRESHOLD,
  resetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
  volumeThreshold: CIRCUIT_BREAKER_VOLUME_THRESHOLD,
  rollingCountTimeout: CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT,
}

/**
 * Type for a function that can be wrapped in a circuit breaker
 */
export type AsyncFunction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>

/**
 * Create a circuit breaker for an external service
 */
export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: AsyncFunction<TArgs, TResult>,
  options: ExtendedCircuitBreakerOptions = {},
): CircuitBreaker<TArgs, TResult> {
  const { name, ...breakerOptions } = options

  const finalOptions: Options = {
    ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
    ...breakerOptions,
  }

  const breaker = new CircuitBreaker<TArgs, TResult>(fn, finalOptions)

  // Set up event listeners for monitoring
  const breakerName = name || 'circuit-breaker'

  breaker.on('open', () => {
    logger.warn(`Circuit breaker opened: ${breakerName}`)
  })

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open, testing: ${breakerName}`)
  })

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed, service recovered: ${breakerName}`)
  })

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout: ${breakerName}`)
  })

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request: ${breakerName}`)
  })

  breaker.on('success', () => {
    logger.debug(`Circuit breaker success: ${breakerName}`)
  })

  breaker.on('failure', (error: Error) => {
    logger.error(
      { error: error.message },
      `Circuit breaker failure: ${breakerName}`,
    )
  })

  return breaker
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState
  stats: Record<string, unknown> & { [key: string]: unknown }
  enabled: boolean
  name: string
  volumeThreshold: number
  errorThresholdPercentage: number
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats<TArgs extends unknown[], TResult>(
  breaker: CircuitBreaker<TArgs, TResult>,
  options: ExtendedCircuitBreakerOptions,
): CircuitBreakerStats {
  let state: CircuitBreakerState

  if (breaker.opened) {
    state = CircuitBreakerState.OPEN
  } else if (breaker.halfOpen) {
    state = CircuitBreakerState.HALF_OPEN
  } else {
    state = CircuitBreakerState.CLOSED
  }

  return {
    state,
    stats: breaker.stats as unknown as Record<string, unknown> & {
      [key: string]: unknown
    },
    enabled: breaker.enabled,
    name: breaker.name,
    volumeThreshold: breaker.volumeThreshold,
    errorThresholdPercentage:
      options.errorThresholdPercentage || CIRCUIT_BREAKER_ERROR_THRESHOLD,
  }
}
