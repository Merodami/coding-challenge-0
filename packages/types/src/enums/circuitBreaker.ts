/**
 * Circuit breaker state enums
 */

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  OPEN = 'open',
  HALF_OPEN = 'half-open',
  CLOSED = 'closed',
}

/**
 * Type definition for circuit breaker state
 */
export type CircuitBreakerStateType = `${CircuitBreakerState}`
