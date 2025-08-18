import { getEnvVariable } from '../getEnvVariable.js'
import { parseNumber } from '../parsers.js'

// Event Service Configuration
export const EVENT_SERVICE_NAME = getEnvVariable(
  'EVENT_SERVICE_NAME',
  String,
  'event_service',
)
export const EVENT_SERVICE_PORT = getEnvVariable(
  'EVENT_SERVICE_PORT',
  parseNumber,
  5501,
)
export const EVENT_SERVICE_HOST = getEnvVariable(
  'EVENT_SERVICE_HOST',
  String,
  '0.0.0.0',
)
export const EVENT_API_URL = getEnvVariable(
  'EVENT_API_URL',
  String,
  'http://127.0.0.1:5501',
)

// External Provider Configuration
export const PROVIDER_API_URL = getEnvVariable(
  'PROVIDER_API_URL',
  String,
  'https://provider.code-challenge.feverup.com/api/events',
)
export const PROVIDER_SYNC_INTERVAL = getEnvVariable(
  'PROVIDER_SYNC_INTERVAL',
  parseNumber,
  30000,
) // 30 seconds
export const PROVIDER_API_TIMEOUT = getEnvVariable(
  'PROVIDER_API_TIMEOUT',
  parseNumber,
  30000,
) // 30 seconds
export const PROVIDER_TIMEOUT = getEnvVariable(
  'PROVIDER_TIMEOUT',
  parseNumber,
  30000,
) // 30 seconds
export const PROVIDER_MAX_RETRIES = getEnvVariable(
  'PROVIDER_MAX_RETRIES',
  parseNumber,
  3,
)
export const PROVIDER_RETRY_DELAY = getEnvVariable(
  'PROVIDER_RETRY_DELAY',
  parseNumber,
  1000,
)
export const PROVIDER_CACHE_TTL = getEnvVariable(
  'PROVIDER_CACHE_TTL',
  parseNumber,
  300,
) // 5 minutes

// Queue Configuration
export const QUEUE_MAX_ATTEMPTS = getEnvVariable(
  'QUEUE_MAX_ATTEMPTS',
  parseNumber,
  3,
)
export const QUEUE_BACKOFF_DELAY = getEnvVariable(
  'QUEUE_BACKOFF_DELAY',
  parseNumber,
  5000,
) // 5 seconds
export const QUEUE_COMPLETED_JOBS_COUNT = getEnvVariable(
  'QUEUE_COMPLETED_JOBS_COUNT',
  parseNumber,
  100,
)
export const QUEUE_COMPLETED_JOBS_AGE = getEnvVariable(
  'QUEUE_COMPLETED_JOBS_AGE',
  parseNumber,
  24 * 3600,
) // 24 hours
export const QUEUE_FAILED_JOBS_COUNT = getEnvVariable(
  'QUEUE_FAILED_JOBS_COUNT',
  parseNumber,
  500,
)
export const QUEUE_FAILED_JOBS_AGE = getEnvVariable(
  'QUEUE_FAILED_JOBS_AGE',
  parseNumber,
  7 * 24 * 3600,
) // 7 days
export const QUEUE_WORKER_CONCURRENCY = getEnvVariable(
  'QUEUE_WORKER_CONCURRENCY',
  parseNumber,
  1,
)
export const QUEUE_RATE_LIMIT_MAX = getEnvVariable(
  'QUEUE_RATE_LIMIT_MAX',
  parseNumber,
  10,
)
export const QUEUE_RATE_LIMIT_DURATION = getEnvVariable(
  'QUEUE_RATE_LIMIT_DURATION',
  parseNumber,
  60000,
) // 1 minute

// Queue Redis keys and TTLs
export const QUEUE_LAST_SYNC_KEY = getEnvVariable(
  'QUEUE_LAST_SYNC_KEY',
  String,
  'event-service:last-sync',
)
export const QUEUE_LAST_SYNC_TTL = getEnvVariable(
  'QUEUE_LAST_SYNC_TTL',
  parseNumber,
  86400,
) // 24 hours

// Queue configuration object
export const QUEUE_CONFIG = {
  NAME: 'event-sync',
  JOB_NAME: 'sync-provider-events',
  MAX_ATTEMPTS: QUEUE_MAX_ATTEMPTS,
  BACKOFF_DELAY: QUEUE_BACKOFF_DELAY,
  COMPLETED_JOBS: {
    COUNT: QUEUE_COMPLETED_JOBS_COUNT,
    AGE: QUEUE_COMPLETED_JOBS_AGE,
  },
  FAILED_JOBS: {
    COUNT: QUEUE_FAILED_JOBS_COUNT,
    AGE: QUEUE_FAILED_JOBS_AGE,
  },
  WORKER: {
    CONCURRENCY: QUEUE_WORKER_CONCURRENCY,
  },
  RATE_LIMIT: {
    MAX: QUEUE_RATE_LIMIT_MAX,
    DURATION: QUEUE_RATE_LIMIT_DURATION,
  },
} as const
