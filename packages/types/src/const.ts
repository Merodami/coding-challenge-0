/**
 * Constant values using const assertions
 * Simple constants without logic
 */

export const PaginationOrder = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const

export const SortDirection = {
  asc: 'asc',
  desc: 'desc',
} as const

export const DateFormat = {
  ISO_8601: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
} as const

export const Currency = {
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
} as const

export const Timezone = {
  UTC: 'UTC',
  EUROPE_MADRID: 'Europe/Madrid',
  EUROPE_LONDON: 'Europe/London',
  AMERICA_NEW_YORK: 'America/New_York',
} as const

export const DefaultValues = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  CACHE_TTL: 300, // 5 minutes in seconds
  SYNC_INTERVAL: 300000, // 5 minutes in milliseconds
} as const
