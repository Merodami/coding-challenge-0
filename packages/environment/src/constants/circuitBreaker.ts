import { getEnvVariable } from '../getEnvVariable.js'
import { parseNumber } from '../parsers.js'

// Circuit Breaker Configuration
// Timeout should be long enough to allow retries to complete
// With 3 retries and exponential backoff: ~15 seconds should be enough for fast failures
// But we set to 120 seconds to handle slow provider responses (up to 30s each)
export const CIRCUIT_BREAKER_TIMEOUT = getEnvVariable(
  'CIRCUIT_BREAKER_TIMEOUT',
  parseNumber,
  120000, // 120 seconds to allow for 3 retries with 30s timeout each
)
export const CIRCUIT_BREAKER_ERROR_THRESHOLD = getEnvVariable(
  'CIRCUIT_BREAKER_ERROR_THRESHOLD',
  parseNumber,
  50,
)
export const CIRCUIT_BREAKER_RESET_TIMEOUT = getEnvVariable(
  'CIRCUIT_BREAKER_RESET_TIMEOUT',
  parseNumber,
  30000,
)
export const CIRCUIT_BREAKER_VOLUME_THRESHOLD = getEnvVariable(
  'CIRCUIT_BREAKER_VOLUME_THRESHOLD',
  parseNumber,
  10,
)
export const CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT = getEnvVariable(
  'CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT',
  parseNumber,
  10000,
)
