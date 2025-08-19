import type { ICacheService } from '@fever/redis'

import { HealthCheckConfig } from './healthCheck.js'
import { IdempotencyConfig } from './idempotency.js'

export interface ServerOptions {
  serviceName: string
  port: number
  rateLimit?: {
    max: number
    timeWindow: string
  }
  healthChecks?: HealthCheckConfig[]
  cacheService?: ICacheService
  /**
   * Skip automatic auth plugin registration
   * Useful when services need to register auth manually with custom configuration
   */
  skipAuthRegistration?: boolean
  /**
   * Authentication configuration options
   */
  authOptions?: {
    /**
     * Additional paths to exclude from authentication
     * Default paths like /health are always excluded
     */
    excludePaths?: string[]
  }
  /**
   * Idempotency configuration options
   */
  idempotencyOptions?: Partial<IdempotencyConfig>
}
