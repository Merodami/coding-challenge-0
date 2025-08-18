import { HttpMethod } from '@fever/types'

/**
 * Idempotency configuration for request deduplication
 */
export interface IdempotencyConfig {
  /**
   * Enable idempotency middleware
   */
  enabled: boolean

  /**
   * Default TTL for idempotency keys in seconds
   * @default 86400 (24 hours)
   */
  defaultTTL?: number

  /**
   * HTTP methods to apply idempotency to
   * @default ['POST', 'PUT', 'PATCH']
   */
  methods?: HttpMethod[]

  /**
   * Routes to exclude from idempotency
   * @default ['/health', '/metrics']
   */
  excludeRoutes?: string[]

  /**
   * Header name for idempotency key
   * @default 'idempotency-key'
   */
  headerName?: string

  /**
   * Prefix for cache keys
   * @default 'idempotency'
   */
  keyPrefix?: string
}

export interface IdempotencyContext {
  key: string
  cached: boolean
  timestamp: number
}

export interface IdempotentResponse {
  statusCode: number
  headers: Record<string, string>
  body: any
}
