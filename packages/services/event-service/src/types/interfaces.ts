/**
 * Service and Repository Interfaces
 * Clean contracts for the event search service
 */

import type {
  EventSearchQuery,
  SearchErrorResponse,
  SearchSuccessResponse,
} from '@fever/api'
import type { PaginatedResult } from '@fever/types'

import type { EventSummaryInternal } from '../mappers/EventMapper.js'

// ============= Plan Service Interface =============

export interface IPlanService {
  /**
   * Search for events based on date range
   * Returns response matching Swagger specification
   */
  searchEvents(
    query: EventSearchQuery,
  ): Promise<SearchSuccessResponse | SearchErrorResponse>
}

// ============= Plan Repository Interface =============

export interface IPlanRepository {
  /**
   * Search for events with pagination
   * Returns EventSummary format (flat structure)
   */
  searchEvents(params: {
    startsAt?: Date
    endsAt?: Date
    page?: number
    limit?: number
  }): Promise<PaginatedResult<EventSummaryInternal>>
}

// ============= Queue Domain Types =============

export interface QueueStatsDomain {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
}

export interface LastSyncInfoDomain {
  timestamp: string
  eventsProcessed: number
  duration: number
  success: boolean
}

export interface SyncJobOptionsDomain {
  delay?: number
  priority?: number
  force?: boolean
}

// ============= Internal Service Interface =============

export interface IInternalService {
  /**
   * Schedule a sync job with options
   */
  scheduleSync(options?: SyncJobOptionsDomain): Promise<string>

  /**
   * Get current queue statistics
   */
  getQueueStats(): Promise<QueueStatsDomain>

  /**
   * Get last sync information from cache
   */
  getLastSyncInfo(): Promise<LastSyncInfoDomain | null>
}
