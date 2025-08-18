/**
 * Plan Service Implementation
 * Business logic for plan/event search with caching
 */

import {
  createSearchErrorResponse,
  createSearchSuccessResponse,
  type EventSearchQuery,
  parseISODateTime,
  type SearchErrorResponse,
  type SearchSuccessResponse,
} from '@fever/api'
import {
  PAGINATION_DEFAULT_LIMIT,
  REDIS_EVENT_CACHE_TTL,
} from '@fever/environment'
import type { ICacheService } from '@fever/redis'
import { ErrorFactory, logger } from '@fever/shared'

import { PlanRepository } from '../repositories/PlanRepository.js'

export class PlanService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly cacheService: ICacheService,
  ) {}

  /**
   * Search for events based on date range
   * Returns response matching Swagger specification exactly
   */
  async searchEvents(
    query: EventSearchQuery,
  ): Promise<SearchSuccessResponse | SearchErrorResponse> {
    const startTime = Date.now()

    try {
      // Parse and validate date parameters
      const startsAt = parseISODateTime(query.starts_at)
      const endsAt = parseISODateTime(query.ends_at)

      // Validate date range
      if (startsAt && endsAt && startsAt > endsAt) {
        return createSearchErrorResponse(
          'INVALID_DATE_RANGE',
          'Start date must be before end date',
        )
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(query)

      // Try to get from cache first (FAST PATH - guaranteed <300ms)
      const cached = await this.getCachedResponse(cacheKey)

      if (cached) {
        logger.debug(
          { cacheKey, responseTime: Date.now() - startTime },
          'Cache hit for event search',
        )

        return cached
      }

      logger.debug({ cacheKey }, 'Cache miss for event search')

      // Query from database with pagination
      const result = await this.planRepository.searchEvents({
        startsAt,
        endsAt,
        page: query.page,
        limit: query.limit,
      })

      // Create response matching Swagger spec with pagination
      const response = createSearchSuccessResponse(
        result.data,
        result.pagination,
      )

      // Cache the response
      await this.cacheResponse(cacheKey, response)

      logger.info(
        {
          responseTime: Date.now() - startTime,
          resultCount: result.data.length,
          page: result.pagination.page,
          totalResults: result.pagination.total,
          fromCache: false,
        },
        'Event search completed',
      )

      return response
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error(
        { err: appError, query, responseTime: Date.now() - startTime },
        'Event search failed',
      )

      return createSearchErrorResponse(
        'INTERNAL_ERROR',
        'An error occurred while searching for events',
      )
    }
  }

  /**
   * Generate cache key for search query including pagination
   */
  private generateCacheKey(query: EventSearchQuery): string {
    const parts = [
      'event:search',
      query.starts_at || 'null',
      query.ends_at || 'null',
      String(query.page || 1),
      String(query.limit || PAGINATION_DEFAULT_LIMIT),
    ]

    return parts.join(':')
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(
    key: string,
  ): Promise<SearchSuccessResponse | null> {
    try {
      const cached = await this.cacheService.get<SearchSuccessResponse>(key)

      return cached
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.warn({ err: appError, key }, 'Failed to get cached response')

      return null
    }
  }

  /**
   * Cache response
   */
  private async cacheResponse(
    key: string,
    response: SearchSuccessResponse,
  ): Promise<void> {
    try {
      await this.cacheService.set(key, response, REDIS_EVENT_CACHE_TTL)
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.warn({ err: appError, key }, 'Failed to cache response')
    }
  }
}
