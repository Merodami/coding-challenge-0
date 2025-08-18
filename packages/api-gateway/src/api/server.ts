// Load environment variables first
import '@fever/environment'

import {
  API_GATEWAY_PORT,
  API_PREFIX,
  CACHE_DISABLED,
  NODE_ENV,
} from '@fever/environment'
import { createExpressServer, startServer } from '@fever/http'
import { initializeCache } from '@fever/redis'
import { logger } from '@fever/shared'
import type { Application, Express } from 'express'

import { loadConfig } from '../config/gateway.js'
import { handleHealthCheck } from '../health/healthCheckHandler.js'
import { setupEmbeddedServices } from './routes/setupEmbeddedServices.js'
import { setupProxyRoutes } from './routes/setupProxyRoutes.js'

// Determine if running in development environment
const isLocalDev = NODE_ENV === 'development'

/**
 * Start the API Gateway server
 */
async function startGateway(): Promise<Express> {
  const config = loadConfig()

  // Create server with standard configuration
  const port = API_GATEWAY_PORT || 8000

  // Create Express server with standard configuration
  const app = await createExpressServer({
    serviceName: 'api-gateway',
    port,
    healthChecks: [], // We'll handle health checks manually
    rateLimit: config.rateLimit
      ? {
          max: config.rateLimit.max,
          timeWindow: `${config.rateLimit.windowMs}ms`,
        }
      : undefined,
  })

  // Register custom health check handler BEFORE other routes
  app.get('/health', handleHealthCheck)
  app.get(`${API_PREFIX}/health`, handleHealthCheck)
  logger.info('Health check handlers registered')

  // Configure custom request logging
  if (isLocalDev) {
    app.use((req, _res, next) => {
      logger.info(
        {
          req: {
            method: req.method,
            url: req.url,
            path: req.path,
            originalUrl: req.originalUrl,
            hostname: req.hostname,
            remoteAddress: req.ip || req.socket?.remoteAddress || 'unknown',
          },
        },
        'incoming request',
      )
      next()
    })
  }

  // Initialize cache for session management
  try {
    if (!CACHE_DISABLED) {
      await initializeCache()
      if (isLocalDev) {
        logger.info('Cache connected for session management')
      }
    } else {
      if (isLocalDev) {
        logger.warn('Cache disabled - using in-memory fallback')
      }
    }
  } catch {
    if (isLocalDev) {
      logger.warn('Cache connection failed - using in-memory fallback')
    }
  }

  // Handle favicon.ico requests to prevent 404 errors
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end()
  })

  // Set up proxy routes to services
  setupProxyRoutes(app)
  logger.info('API Gateway configured with proxy routes')

  // Root redirect to health
  app.get('/', (_req, res) => {
    res.redirect('/health')
  })

  // Start the server following .project pattern
  await startServer(app, port, {
    onShutdown: async () => {
      logger.info('Shutting down API Gateway...')
      // Cache cleanup handled by shared infrastructure
    },
  })

  return app
}

// Auto-start in development mode
if (isLocalDev) {
  try {
    await startGateway()
  } catch {
    logger.error('Failed to start API Gateway')
    process.exit(1)
  }
}

/**
 * Create API Gateway with embedded services (for monolith deployments)
 * This is the industry-standard pattern for serverless/edge deployments
 */
export async function createGatewayWithServices(
  services: Map<string, Application>,
): Promise<Express> {
  // Create the gateway app with all standard features
  const app = await startGateway()

  // Mount services directly instead of proxying
  await setupEmbeddedServices(app, services)

  logger.info('API Gateway created with embedded services')

  return app
}

export { startGateway }
