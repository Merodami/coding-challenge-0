import { CACHE_TYPE } from '@fever/environment'

import type { ICacheService } from '../../domain/repositories/ICacheService.js'
import type { CacheConfig } from '../../domain/types/cache.js'
import { logger } from '../logger.js'
import { MemoryCacheService } from './memory.js'
import { RedisService } from './redis.js'

/**
 * Initialize cache service based on environment configuration
 *
 * This function creates and returns the appropriate cache service
 * based on the CACHE_TYPE environment variable.
 *
 * @param config - Optional configuration for the cache service
 * @returns A promise that resolves to an initialized cache service
 */
export async function initializeCache(
  config?: CacheConfig & { password?: string },
): Promise<ICacheService> {
  let cacheService: ICacheService

  const cacheType = config ? 'redis' : CACHE_TYPE

  switch (cacheType) {
    case 'redis':
      logger.info('Initializing Redis cache service')
      cacheService = new RedisService(config)
      break

    case 'memory':
      logger.info('Initializing memory cache service')
      cacheService = new MemoryCacheService(config?.defaultTTL)
      break

    default:
      logger.warn(
        `Unknown cache type "${cacheType}", falling back to memory cache`,
      )
      cacheService = new MemoryCacheService(config?.defaultTTL)
  }

  try {
    await cacheService.connect()
    logger.info(`Cache service initialized successfully (type: ${cacheType})`)
  } catch (error) {
    logger.error('Failed to initialize cache service', error)

    // Fallback to memory cache if Redis fails
    if (cacheType === 'redis') {
      logger.warn(
        'Falling back to memory cache due to Redis connection failure',
      )
      cacheService = new MemoryCacheService(config?.defaultTTL)
      await cacheService.connect()
    } else {
      throw error
    }
  }

  return cacheService
}

/**
 * Create a test cache service
 *
 * This function creates a memory cache service for testing purposes.
 * It ensures tests don't depend on external services like Redis.
 *
 * @param defaultTTL - Default time-to-live in seconds
 * @returns A memory cache service instance
 */
export function createTestCache(defaultTTL: number = 60): ICacheService {
  return new MemoryCacheService(defaultTTL)
}
