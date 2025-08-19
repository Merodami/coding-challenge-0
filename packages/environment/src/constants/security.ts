import { getEnvVariable } from '../getEnvVariable.js'
import { parseBoolean, parseNumber } from '../parsers.js'

// API Key Protection
// SECURITY: API keys must be provided via environment variables
// Never use default API keys in production
export const API_KEY = (() => {
  const key = process.env['API_KEY']

  if (!key && process.env['NODE_ENV'] === 'production') {
    throw new Error('API_KEY environment variable is required in production')
  }

  // Only use fallback in development/test environments
  return key || (process.env['NODE_ENV'] === 'test' ? 'test-api-key' : '')
})()

export const API_KEY_HEADER = getEnvVariable(
  'API_KEY_HEADER',
  String,
  'x-api-key',
)

export const REQUIRE_API_KEY = getEnvVariable(
  'REQUIRE_API_KEY',
  parseBoolean,
  process.env['NODE_ENV'] === 'production', // Required in production, optional in dev
)

export const SERVICE_API_KEY = (() => {
  const key = process.env['SERVICE_API_KEY']

  if (!key && process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'SERVICE_API_KEY environment variable is required in production',
    )
  }

  // Only use fallback in development/test environments
  return key || (process.env['NODE_ENV'] === 'test' ? 'test-service-key' : '')
})()

// Rate Limiting
export const RATE_LIMIT_ENABLE = getEnvVariable(
  'RATE_LIMIT_ENABLE',
  parseBoolean,
  true,
)
export const RATE_LIMIT_MAX = getEnvVariable('RATE_LIMIT_MAX', parseNumber, 100)
export const RATE_LIMIT_WINDOW = getEnvVariable(
  'RATE_LIMIT_WINDOW',
  String,
  '1 minute',
)
export const RATE_LIMIT_WINDOW_MS = getEnvVariable(
  'RATE_LIMIT_WINDOW_MS',
  parseNumber,
  60000,
)
