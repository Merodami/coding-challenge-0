import { HealthStatus } from '@fever/types'

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /**
   * Name of the dependency or component being checked
   */
  name: string

  /**
   * Function that performs the health check
   * Should return true for healthy, false for unhealthy
   */
  check: () => Promise<boolean>

  /**
   * Optional timeout for the health check in milliseconds
   * @default 5000
   */
  timeout?: number

  /**
   * Whether this check is critical for service health
   * @default true
   */
  critical?: boolean
}

export interface HealthCheckResult {
  name: string
  status: HealthStatus
  duration: number
  error?: string
}

export interface HealthCheckResponse {
  status: HealthStatus
  timestamp: string
  service: string
  checks?: HealthCheckResult[]
  version?: string
  uptime?: number
}
