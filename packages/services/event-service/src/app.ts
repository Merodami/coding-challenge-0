import { EVENT_SERVICE_PORT } from '@fever/environment'
import { startServer } from '@fever/http'
import { type ICacheService, initializeCache } from '@fever/redis'
import { logger } from '@fever/shared'
import { PrismaClient } from '@prisma/client'

import { createEventServer, type ServerConfig } from './server.js'

async function initializeDatabase(): Promise<PrismaClient> {
  const prisma = new PrismaClient()

  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('Successfully connected to PostgreSQL database')

    return prisma
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database')
    throw error
  }
}

export async function startEventService(): Promise<void> {
  let prisma: PrismaClient | undefined
  let cacheService: ICacheService | undefined

  try {
    // Initialize dependencies
    prisma = await initializeDatabase()
    cacheService = await initializeCache()

    const { app } = await createEventServer({
      prisma,
      cacheService,
    })

    // Start the server with shutdown handlers
    await startServer(app, EVENT_SERVICE_PORT, {
      onShutdown: async () => {
        logger.info('Shutting down Event service...')
        await prisma?.$disconnect()
        await cacheService?.disconnect()
      },
    })
  } catch (error) {
    logger.error('Failed to start event service')

    // Cleanup on startup failure
    await prisma?.$disconnect()
    await cacheService?.disconnect()

    throw error
  }
}

// Export function for testing
export async function createEventServiceApp(config: ServerConfig) {
  const { prisma, cacheService } = config

  const { app } = await createEventServer({
    prisma,
    cacheService,
  })

  return app
}

// Auto-start when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startEventService()
    .then(() => {
      logger.info('Event Service started successfully')
    })
    .catch((error) => {
      logger.error('Failed to start Event Service:', error)
      process.exit(1)
    })
}
