/**
 * Plan Service Implementation for Worker
 * Business logic for syncing events from provider
 */

import {
  CIRCUIT_BREAKER_ERROR_THRESHOLD,
  CIRCUIT_BREAKER_RESET_TIMEOUT,
  CIRCUIT_BREAKER_TIMEOUT,
  CIRCUIT_BREAKER_VOLUME_THRESHOLD,
} from '@fever/environment'
import type { ICacheService } from '@fever/redis'
import { createCircuitBreaker, ErrorFactory, logger } from '@fever/shared'

import { ProviderClient } from '../providers/http/ProviderClient.js'
import { PlanTransformer } from '../providers/transformers/PlanTransformer.js'
import { XMLParser } from '../providers/xml/XMLParser.js'
import { PlanRepository } from '../repositories/PlanRepository.js'
import type { BasePlanDomain } from '../types/domain.js'

export class PlanService {
  private providerCircuitBreaker: any
  private readonly planRepository: PlanRepository
  private readonly planTransformer: PlanTransformer
  private readonly xmlParser: XMLParser
  private readonly providerClient: ProviderClient

  constructor(
    planRepository: PlanRepository,
    providerClient: ProviderClient,
    xmlParser: XMLParser,
    planTransformer: PlanTransformer,
    private readonly cacheService: ICacheService,
  ) {
    this.planRepository = planRepository
    this.planTransformer = planTransformer
    this.xmlParser = xmlParser
    this.providerClient = providerClient

    // Setup circuit breaker for provider calls
    this.providerCircuitBreaker = createCircuitBreaker(
      this.fetchFromProvider.bind(this),
      {
        timeout: CIRCUIT_BREAKER_TIMEOUT,
        errorThresholdPercentage: CIRCUIT_BREAKER_ERROR_THRESHOLD,
        resetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
        volumeThreshold: CIRCUIT_BREAKER_VOLUME_THRESHOLD,
        name: 'provider-api-breaker',
      },
    )

    // Set up circuit breaker event listeners
    this.providerCircuitBreaker.on('open', () => {
      logger.warn('Provider circuit breaker opened - provider unavailable')
    })

    this.providerCircuitBreaker.on('halfOpen', () => {
      logger.info('Provider circuit breaker half-open, testing connection...')
    })
  }

  /**
   * Sync events from external provider
   * This is the main worker task
   */
  async syncEventsFromProvider(): Promise<{
    eventsProcessed: number
    success: boolean
    errorMessage?: string
  }> {
    const startTime = Date.now()

    try {
      logger.info('Starting provider sync')

      // Fetch from provider with circuit breaker
      let basePlans: BasePlanDomain[] = []

      try {
        logger.info('Calling provider circuit breaker')
        basePlans = await this.providerCircuitBreaker.fire()
        logger.info(`Circuit breaker returned ${basePlans.length} base plans`)
      } catch (error) {
        const appError = ErrorFactory.fromError(error)

        logger.error(
          {
            err: appError,
            circuitState: this.providerCircuitBreaker.toJSON().state,
          },
          'Provider sync failed - circuit breaker triggered',
        )

        // Return success even if provider fails (resilience)
        return {
          eventsProcessed: 0,
          success: true,
          errorMessage: 'Provider unavailable, will retry later',
        }
      }

      // Upsert plans to database
      logger.info(`Upserting ${basePlans.length} base plans to database`)
      if (basePlans.length === 0) {
        logger.warn(
          'No base plans to upsert - check XML parsing and transformation',
        )
      }
      await this.planRepository.upsertBasePlans(basePlans)

      // Mark missing plans as deleted
      const basePlanIds = basePlans.map((bp) => bp.basePlanId)

      logger.info(
        `Marking missing plans as deleted, keeping: ${basePlanIds.join(', ')}`,
      )

      const deletedCount =
        await this.planRepository.markMissingPlansAsDeleted(basePlanIds)

      // Clear search cache to force refresh on next API search
      await this.clearSearchCache()

      logger.info(
        {
          eventsProcessed: basePlans.length,
          eventsDeleted: deletedCount,
          syncTime: Date.now() - startTime,
        },
        'Provider sync completed',
      )

      return {
        eventsProcessed: basePlans.length,
        success: true,
      }
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error(
        { err: appError, syncTime: Date.now() - startTime },
        'Provider sync failed',
      )

      return {
        eventsProcessed: 0,
        success: false,
        errorMessage: appError.message,
      }
    }
  }

  /**
   * Fetch events from provider
   * Called by circuit breaker
   */
  private async fetchFromProvider(): Promise<BasePlanDomain[]> {
    const startTime = Date.now()

    try {
      // Fetch XML from provider
      const xmlData = await this.providerClient.fetchEvents()
      // Parse XML
      const parsedData = await this.xmlParser.parse(xmlData)

      // Transform to domain models
      const basePlans = this.planTransformer.transform(parsedData)

      logger.info(
        { eventCount: basePlans.length, responseTime: Date.now() - startTime },
        'Successfully fetched events from provider',
      )

      return basePlans
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error(
        { err: appError, responseTime: Date.now() - startTime },
        'Failed to fetch from provider',
      )
      throw appError
    }
  }

  /**
   * Clear search cache entries
   * This notifies the API service to refresh its cache
   */
  private async clearSearchCache(): Promise<void> {
    try {
      // Clear all event search cache keys
      const deletedCount = await this.cacheService.delPattern('event:search:*')

      logger.info({ deletedCount }, 'Search cache cleared')
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error({ err: appError }, 'Failed to clear search cache')
      // Don't throw - cache clearing is non-critical
    }
  }

  /**
   * Clean up old events
   */
  async cleanupOldEvents(daysToKeep: number): Promise<number> {
    try {
      const cutoffDate = new Date()

      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const deletedCount = await this.planRepository.deleteOldPlans(cutoffDate)

      logger.info(
        { deletedCount, cutoffDate: cutoffDate.toISOString() },
        'Old events cleaned up',
      )

      return deletedCount
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error({ err: appError }, 'Failed to cleanup old events')
      throw appError
    }
  }
}
