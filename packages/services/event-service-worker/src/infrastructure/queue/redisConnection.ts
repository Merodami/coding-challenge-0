/**
 * Redis Connection Utility for BullMQ
 * Shared configuration for queue and worker connections
 */

/**
 * Create Redis connection config for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 * Uses process.env directly for runtime flexibility (important for tests)
 */
export function createBullMQRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // BullMQ requires this to be null
  }
}
