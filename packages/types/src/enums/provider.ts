/**
 * Provider and synchronization related enums
 * Based on API requirements
 */

/**
 * Provider status for monitoring
 */
export enum ProviderStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
}

/**
 * Type definition for provider status
 */
export type ProviderStatusType = `${ProviderStatus}`

/**
 * Sync status for provider synchronization
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Type definition for sync status
 */
export type SyncStatusType = `${SyncStatus}`

/**
 * Sync trigger source
 */
export enum SyncTrigger {
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  STARTUP = 'startup',
}

/**
 * Type definition for sync trigger
 */
export type SyncTriggerType = `${SyncTrigger}`

/**
 * Provider response type
 */
export enum ProviderResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  EMPTY = 'empty',
}

/**
 * Type definition for provider response type
 */
export type ProviderResponseTypeType = `${ProviderResponseType}`
