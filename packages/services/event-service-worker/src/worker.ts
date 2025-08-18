/**
 * Event Service Worker
 * Background worker for syncing events from external provider
 */

import { PROVIDER_SYNC_INTERVAL } from '@fever/environment'
import { initializeCache } from '@fever/redis'
import { logger } from '@fever/shared'
import { PrismaClient } from '@prisma/client'

import { ProviderClient } from './providers/http/ProviderClient.js'
import { PlanTransformer } from './providers/transformers/PlanTransformer.js'
import { XMLParser } from './providers/xml/XMLParser.js'
import { PlanRepository } from './repositories/PlanRepository.js'
import { PlanService } from './services/PlanService.js'
import { QueueService } from './services/QueueService.js'
import { SyncWorkerService } from './services/SyncWorkerService.js'

export async function startWorker() {
  try {
    logger.info('Starting Event Service Worker...')

    // Initialize database
    const prisma = new PrismaClient()

    await prisma.$connect()
    logger.info('Database connected')

    // Initialize cache
    const cacheService = await initializeCache()

    logger.info('Cache service initialized')

    // Initialize repositories
    const planRepository = new PlanRepository(prisma)

    // Initialize provider components
    const providerClient = new ProviderClient()
    const xmlParser = new XMLParser()
    const planTransformer = new PlanTransformer()

    // Initialize services
    const planService = new PlanService(
      planRepository,
      providerClient,
      xmlParser,
      planTransformer,
      cacheService,
    )

    const queueService = new QueueService(cacheService)
    const syncWorkerService = new SyncWorkerService(
      planService,
      cacheService,
      queueService,
    )

    // Start the worker
    await syncWorkerService.start()
    logger.info('Sync worker started')

    // Set up periodic sync for development/local environment
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'local'
    ) {
      const syncInterval = PROVIDER_SYNC_INTERVAL || 60000 // Default to 1 minute

      await queueService.setupDevelopmentSync(syncInterval)
      logger.info(`Development sync scheduled every ${syncInterval}ms`)
    }

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`)

      try {
        // Stop the worker
        await syncWorkerService.stop()
        logger.info('Worker stopped')

        // Clean up queue
        await queueService.cleanup()
        logger.info('Queue cleaned up')

        // Disconnect database
        await prisma.$disconnect()
        logger.info('Database disconnected')

        // Disconnect cache
        await cacheService.disconnect()
        logger.info('Cache disconnected')

        process.exit(0)
      } catch (error) {
        logger.error('Error during shutdown:', error)
        process.exit(1)
      }
    }

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGHUP', () => shutdown('SIGHUP'))

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error)
      shutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason)
      shutdown('unhandledRejection')
    })

    logger.info('Event Service Worker started successfully')
  } catch (error) {
    logger.error('Failed to start worker:', error)
    process.exit(1)
  }
}
