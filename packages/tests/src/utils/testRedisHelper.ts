/**
 * Redis Test Container Helper
 *
 * Provides a consistent way to set up Redis test containers for integration tests
 */

import { DEBUG, TEST_VERBOSE } from '@fever/environment'
import { RedisService } from '@fever/redis'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

export interface TestRedisConfig {
  /**
   * Timeout for container startup in milliseconds (defaults to 60000)
   */
  startupTimeout?: number
}

export interface TestRedisResult {
  container: StartedTestContainer
  redisService: RedisService
  host: string
  port: number
}

/**
 * Creates and starts a Redis test container
 */
export async function createTestRedis(
  config: TestRedisConfig = {},
): Promise<TestRedisResult> {
  const { startupTimeout = 60000 } = config

  if (DEBUG || TEST_VERBOSE) {
    console.log('Starting Redis test container...')
  }

  // Start Redis container using redis:8-alpine to match our docker-compose.local.yml
  const container = await new GenericContainer('redis:8-alpine')
    .withExposedPorts(6379)
    .withStartupTimeout(startupTimeout)
    .start()

  const host = container.getHost()
  const port = container.getMappedPort(6379)

  if (DEBUG || TEST_VERBOSE) {
    console.log(`Redis container started at ${host}:${port}`)
  }

  // Set environment variables for RedisService and BullMQ
  process.env.REDIS_HOST = host
  process.env.REDIS_PORT = String(port)
  process.env.REDIS_PASSWORD = ''

  // Create and connect RedisService with explicit configuration
  const redisService = new RedisService({
    host,
    port,
    password: '',
  })

  await redisService.connect()

  if (DEBUG || TEST_VERBOSE) {
    console.log('Redis service connected')
  }

  // Verify Redis is working
  await redisService.set('test:connection', 'ok', 1)

  const value = await redisService.get('test:connection')

  if (value !== 'ok') {
    throw new Error('Redis connection test failed')
  }

  if (DEBUG || TEST_VERBOSE) {
    console.log('Redis connection verified')
  }

  return {
    container,
    redisService,
    host,
    port,
  }
}

function logVerbose(message: string): void {
  if (DEBUG || TEST_VERBOSE) {
    console.log(message)
  }
}

async function disconnectRedisService(
  redisService: RedisService,
): Promise<void> {
  try {
    await redisService.disconnect()
    logVerbose('Redis service disconnected')
  } catch (error) {
    logVerbose(`Error disconnecting Redis: ${error}`)
  }
}

async function stopRedisContainer(
  container: StartedTestContainer,
): Promise<void> {
  try {
    await container.stop()
    logVerbose('Redis container stopped')
  } catch (error) {
    logVerbose(`Error stopping Redis container: ${error}`)
  }
}

/**
 * Cleans up test Redis resources
 */
export async function cleanupTestRedis(
  result: TestRedisResult | undefined,
): Promise<void> {
  logVerbose('Cleaning up test Redis resources...')

  if (!result) {
    logVerbose('No test Redis result to cleanup')

    return
  }

  const { redisService, container } = result

  if (redisService) {
    await disconnectRedisService(redisService)
  }

  if (container) {
    await stopRedisContainer(container)
  }

  logVerbose('Redis cleanup complete')
}
