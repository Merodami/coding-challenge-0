import { getEnvVariable } from '../getEnvVariable.js'
import { parseBoolean, parseNumber } from '../parsers.js'

export const REDIS_HOST = getEnvVariable('REDIS_HOST', String, '127.0.0.1')
export const REDIS_PORT = getEnvVariable('REDIS_PORT', parseNumber, 6380)
export const REDIS_PASSWORD = getEnvVariable('REDIS_PASSWORD', String, '')
export const REDIS_PREFIX = getEnvVariable('REDIS_PREFIX', String, 'fever:')
export const REDIS_DEFAULT_TTL = getEnvVariable(
  'REDIS_DEFAULT_TTL',
  parseNumber,
  300,
)
export const REDIS_RETRY_DELAY = getEnvVariable(
  'REDIS_RETRY_DELAY',
  parseNumber,
  50,
)
export const REDIS_MAX_RETRY_DELAY = getEnvVariable(
  'REDIS_MAX_RETRY_DELAY',
  parseNumber,
  2000,
)
export const CACHE_DISABLED = getEnvVariable(
  'CACHE_DISABLED',
  parseBoolean,
  false,
)

// Cache specific TTLs
export const CACHE_EVENTS_TTL = getEnvVariable(
  'CACHE_EVENTS_TTL',
  parseNumber,
  300,
)
export const CACHE_PROVIDER_RESPONSE_TTL = getEnvVariable(
  'CACHE_PROVIDER_RESPONSE_TTL',
  parseNumber,
  300,
)
export const CACHE_SEARCH_RESULTS_TTL = getEnvVariable(
  'CACHE_SEARCH_RESULTS_TTL',
  parseNumber,
  60,
)
export const REDIS_EVENT_CACHE_TTL = getEnvVariable(
  'REDIS_EVENT_CACHE_TTL',
  parseNumber,
  300,
)

// Redis configuration object for packages
export const REDIS_CONFIG = {
  HOST: REDIS_HOST,
  PORT: REDIS_PORT,
  PASSWORD: REDIS_PASSWORD,
  KEY_PREFIX: REDIS_PREFIX,
  DEFAULT_TTL: REDIS_DEFAULT_TTL,
  RETRY_DELAY: REDIS_RETRY_DELAY,
  MAX_RETRY_DELAY: REDIS_MAX_RETRY_DELAY,
  SCAN_COUNT: 100,
  DB: 0,
}

// Cache type configuration
export const CACHE_TYPE = getEnvVariable('CACHE_TYPE', String, 'redis')
