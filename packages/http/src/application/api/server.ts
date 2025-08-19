import {
  NODE_ENV,
  RATE_LIMIT_ENABLE,
  RATE_LIMIT_MAX,
  SERVICE_HOST,
} from '@fever/environment'
import { logger } from '@fever/shared'
import compression from 'compression'
import cors from 'cors'
import express, { Express } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import ms from 'ms'

import { ServerOptions } from '../../domain/types/server.js'
import { idempotencyMiddleware } from '../../infrastructure/express/middleware/idempotency.js'
import { setupServiceHealthCheck } from './healthCheck.js'

/**
 * Creates and configures an Express server with standard middleware and configuration.
 *
 * @param options - Server configuration options
 * @returns Configured Express instance
 */
export async function createExpressServer(
  options: ServerOptions,
): Promise<Express> {
  // Initialize the Express application
  const app = express()

  // Store service name for logging
  app.locals['serviceName'] = options.serviceName

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', true)

  // Modern industry standard: Conditional body parsing to support webhooks
  app.use((req, res, next) => {
    // Skip JSON parsing for webhook routes (they need raw body for signature verification)
    if (req.path.includes('/webhooks/') || req.path.includes('/webhook/')) {
      return next()
    }

    express.json()(req, res, next)
  })

  app.use((req, res, next) => {
    // Skip URL-encoded parsing for webhook routes
    if (req.path.includes('/webhooks/') || req.path.includes('/webhook/')) {
      return next()
    }

    express.urlencoded({ extended: true })(req, res, next)
  })

  // Add compression
  app.use(compression())

  // Add cache service to the app instance if provided
  if (options.cacheService) {
    app.locals['cacheService'] = options.cacheService
  }

  // Apply security headers
  app.use(
    helmet({
      contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    }),
  )

  // Enable CORS
  app.use(
    cors({
      exposedHeaders: ['Date', 'Content-Disposition'],
    }),
  )

  // Apply rate limiting if enabled
  if (RATE_LIMIT_ENABLE) {
    const limiter = rateLimit({
      windowMs: options.rateLimit?.timeWindow
        ? ms(options.rateLimit.timeWindow as ms.StringValue)
        : ms('1m' as ms.StringValue),
      max: options.rateLimit?.max || RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      // Custom key generator for use behind proxies (required when trust proxy is true)
      keyGenerator: (req) => {
        // Use x-forwarded-for header if available (set by proxies like Vercel)
        // Fall back to socket address if not behind proxy
        return (
          req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          'unknown'
        )
      },
      // Skip successful requests from rate limiting
      skipSuccessfulRequests: false,
      // Skip failed requests from rate limiting
      skipFailedRequests: false,
    })

    app.use(limiter)
  }

  // Setup health check endpoints (only if health checks are provided)
  if (options.healthChecks && options.healthChecks.length > 0) {
    setupServiceHealthCheck(app, options.healthChecks, {
      serviceName: options.serviceName,
    })
  }

  // Register idempotency middleware (after auth but before routes)
  if (options.idempotencyOptions && options.cacheService) {
    app.use(
      idempotencyMiddleware({
        enabled: true, // Default to enabled if idempotencyOptions is provided
        ...options.idempotencyOptions,
        cacheService: options.cacheService,
        keyPrefix: options.idempotencyOptions.keyPrefix || options.serviceName,
      }),
    )
  }

  // Store error middleware configuration for later registration
  app.locals['errorMiddlewareConfig'] = {
    enableStackTrace: NODE_ENV !== 'production',
  }

  return app
}

/**
 * Starts the server with graceful shutdown handling (following .project pattern)
 *
 * @param app - Configured Express instance
 * @param port - Port to listen on
 * @param shutdownHandlers - Optional shutdown handlers
 */
export async function startServer(
  app: Express,
  port: number,
  shutdownHandlers?: {
    onShutdown?: () => Promise<void>
    onUnhandledRejection?: (reason: any) => void
  },
): Promise<void> {
  const server = app.listen(port, SERVICE_HOST, () => {
    const serviceName = app.locals['serviceName'] || 'Service'
    const blue = '\x1b[34m'
    const green = '\x1b[32m'
    const reset = '\x1b[0m'

    console.log(
      `${blue}[${serviceName}]${reset} ${green}✓${reset} Server started on port ${port}`,
    )

    logger.info(`App listening on ${SERVICE_HOST}:${port}`)
    logger.info(
      `Health check available at http://${SERVICE_HOST === '0.0.0.0' ? 'localhost' : SERVICE_HOST}:${port}/health`,
    )
  })

  server.on('error', (err) => {
    logger.error({ error: err }, 'Error starting server')
    process.exit(1)
  })

  // Set up graceful shutdown handlers if provided
  if (shutdownHandlers) {
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`)

      server.close(async () => {
        // Execute custom shutdown logic if provided
        if (shutdownHandlers.onShutdown) {
          await shutdownHandlers.onShutdown()
        }

        logger.info('Server gracefully shut down.')
        process.exit(0)
      })
    }

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Set up unhandled rejection handler
    if (shutdownHandlers.onUnhandledRejection) {
      process.on('unhandledRejection', shutdownHandlers.onUnhandledRejection)
    }
  }
}
