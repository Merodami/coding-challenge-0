import { REDIS_CONFIG } from '@fever/environment'

import type { RedisConfig } from '../../domain/types/cache.js'

/**
 * Redis Configuration Service
 *
 * Singleton service that manages Redis configuration settings.
 * Provides centralized configuration management for Redis connections.
 */
export class RedisConfigService {
  private static instance: RedisConfigService
  private config: RedisConfig

  private constructor() {
    this.config = this.createDefaultConfig()
  }

  /**
   * Creates the default Redis configuration from environment
   */
  private createDefaultConfig(): RedisConfig {
    return {
      host: REDIS_CONFIG.HOST,
      port: REDIS_CONFIG.PORT,
      defaultTTL: REDIS_CONFIG.DEFAULT_TTL,
      retryDelay: REDIS_CONFIG.RETRY_DELAY,
      maxRetryDelay: REDIS_CONFIG.MAX_RETRY_DELAY,
      scanCount: REDIS_CONFIG.SCAN_COUNT,
    }
  }

  /**
   * Gets the singleton instance of RedisConfigService
   */
  public static getInstance(): RedisConfigService {
    if (!RedisConfigService.instance) {
      RedisConfigService.instance = new RedisConfigService()
    }

    return RedisConfigService.instance
  }

  /**
   * Gets the current Redis configuration
   */
  public getConfig(): RedisConfig {
    return this.config
  }

  /**
   * Updates the Redis configuration
   * @param config - Partial configuration to update
   */
  public updateConfig(config: Partial<RedisConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
  }

  /**
   * Resets the configuration to default values
   */
  public resetConfig(): void {
    this.config = this.createDefaultConfig()
  }
}
