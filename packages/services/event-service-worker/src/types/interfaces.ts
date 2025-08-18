/**
 * Service and Repository Interfaces for Worker
 * Clean contracts for the sync worker service
 */

import type {
  BasePlanDomain,
  LastSyncInfoDomain,
  QueueStatsDomain,
  SyncJobOptionsDomain,
  SyncResultDomain,
} from './domain.js'

// ============= Plan Service Interface =============

export interface IPlanService {
  /**
   * Sync plans from external provider
   * Used by background queue worker
   */
  syncEventsFromProvider(): Promise<{
    eventsProcessed: number
    success: boolean
    errorMessage?: string
  }>

  /**
   * Clean up old events
   */
  cleanupOldEvents(daysToKeep: number): Promise<number>
}

// ============= Plan Repository Interface =============

export interface IPlanRepository {
  /**
   * Upsert base plans from provider sync
   */
  upsertBasePlans(basePlans: BasePlanDomain[]): Promise<void>

  /**
   * Mark plans as deleted if they're not in the latest sync
   */
  markMissingPlansAsDeleted(currentBasePlanIds: string[]): Promise<number>

  /**
   * Delete old plans for cleanup
   */
  deleteOldPlans(beforeDate: Date): Promise<number>
}

// ============= Provider Service Interface =============

export interface IProviderService {
  /**
   * Fetch and parse XML from provider
   */
  fetchEvents(): Promise<string>

  /**
   * Check if provider is available
   */
  checkHealth(): Promise<boolean>
}

// ============= Queue Service Interface =============

export interface IQueueService {
  /**
   * Schedule a sync job with options
   */
  scheduleSync(options?: SyncJobOptionsDomain): Promise<string>

  /**
   * Setup periodic sync for development mode
   */
  setupDevelopmentSync(intervalMs: number): Promise<void>

  /**
   * Get current queue statistics
   */
  getStats(): Promise<QueueStatsDomain>

  /**
   * Get last sync information from cache
   */
  getLastSyncInfo(): Promise<LastSyncInfoDomain | null>

  /**
   * Store sync result information
   */
  storeSyncResult(result: SyncResultDomain): Promise<void>

  /**
   * Clear all jobs from the queue
   * Useful for maintenance and cleanup operations
   */
  clearAllJobs(): Promise<void>

  /**
   * Clean up queue resources
   */
  cleanup(): Promise<void>
}

// ============= Sync Worker Interface =============

export interface ISyncWorkerService {
  /**
   * Process sync jobs from the queue
   */
  processSyncJob(): Promise<SyncResultDomain>

  /**
   * Start the worker
   */
  start(): Promise<void>

  /**
   * Stop the worker gracefully
   */
  stop(): Promise<void>
}
