/**
 * Health check related enums
 */

/**
 * Health status values
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}

/**
 * Type definition for health status
 */
export type HealthStatusType = `${HealthStatus}`

/**
 * Health check component types
 */
export enum HealthComponent {
  DATABASE = 'database',
  REDIS = 'redis',
  PROVIDER = 'provider',
  API = 'api',
  SYNC = 'sync',
}

/**
 * Type definition for health component
 */
export type HealthComponentType = `${HealthComponent}`

/**
 * Health check failure reasons
 */
export enum HealthFailureReason {
  CONNECTION_FAILED = 'connection_failed',
  TIMEOUT = 'timeout',
  AUTHENTICATION_FAILED = 'authentication_failed',
  CONFIGURATION_ERROR = 'configuration_error',
  UNKNOWN = 'unknown',
}

/**
 * Type definition for health failure reason
 */
export type HealthFailureReasonType = `${HealthFailureReason}`
