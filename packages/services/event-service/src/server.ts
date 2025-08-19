import { EVENT_SERVICE_PORT } from '@fever/environment'
import { createExpressServer, errorMiddleware } from '@fever/http'
import type { ICacheService } from '@fever/redis'
import { logger } from '@fever/shared'
import { HttpMethod } from '@fever/types'
import type { PrismaClient } from '@prisma/client'

import { InternalController } from './controllers/InternalController.js'
import { SearchController } from './controllers/SearchController.js'
import { PlanRepository } from './repositories/PlanRepository.js'
import { createInternalRoutes } from './routes/InternalRoutes.js'
import { createSearchRoutes } from './routes/SearchRoutes.js'
import { InternalService } from './services/InternalService.js'
import { PlanService } from './services/PlanService.js'

export interface ServerConfig {
  prisma: PrismaClient
  cacheService: ICacheService
}

export async function createEventServer(config: ServerConfig) {
  const { prisma, cacheService } = config

  // Create Express app with standard configuration
  const app = await createExpressServer({
    serviceName: 'event',
    port: EVENT_SERVICE_PORT,
    cacheService,
    healthChecks: [
      {
        name: 'postgres',
        check: async () => {
          try {
            await prisma.$queryRaw`SELECT 1`

            return true
          } catch {
            return false
          }
        },
      },
      {
        name: 'cache',
        check: async () => {
          try {
            if (typeof cacheService.checkHealth === 'function') {
              const health = await cacheService.checkHealth()

              return health.status === 'healthy' || health.status === 'degraded'
            }
            await cacheService.set('health_check', 'ok', 5)

            const result = await cacheService.get('health_check')

            return result === 'ok'
          } catch (error) {
            logger.error({ error }, 'Cache health check failed')

            return false
          }
        },
      },
    ],
    idempotencyOptions: {
      enabled: true,
      defaultTTL: 86400, // 24 hours
      methods: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH],
      excludeRoutes: ['/health', '/metrics'],
    },
    authOptions: {
      excludePaths: [
        '/health',
        '/metrics',
        '/internal/*', // Internal service-to-service communication
      ],
    },
  })

  // Initialize repositories
  const planRepository = new PlanRepository(prisma)

  // Initialize services
  const planService = new PlanService(planRepository, cacheService)
  const internalService = new InternalService(cacheService)

  // Initialize controllers
  const searchController = new SearchController(planService)
  const internalController = new InternalController(internalService)

  // Register routes
  const searchRouter = createSearchRoutes(searchController)
  const internalRouter = createInternalRoutes(internalController)

  // Mount routes
  app.use(searchRouter)
  app.use(internalRouter)

  // Add error middleware as last middleware
  app.use(errorMiddleware(app.locals['errorMiddlewareConfig'] || {}))

  logger.info(
    { port: EVENT_SERVICE_PORT },
    'Event search service initialized successfully',
  )

  return { app }
}
