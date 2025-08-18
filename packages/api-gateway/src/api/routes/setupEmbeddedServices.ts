import { SERVICE_API_KEY } from '@fever/environment'
import { logger } from '@fever/shared'
import type { Application, NextFunction, Request, Response } from 'express'

/**
 * Service route mapping for embedded mode
 * Maps API paths to service mount points
 */
const SERVICE_ROUTES = [
  { prefix: '/api/v1/search', service: 'event', mount: '/search' },
]

/**
 * Sets up embedded services by mounting Express apps directly
 * This avoids the network overhead of proxying in monolith deployments
 */
export async function setupEmbeddedServices(
  app: Application,
  services: Map<string, Application>,
): Promise<void> {
  logger.info('Setting up embedded services')

  // Create a middleware that adds service context headers
  const addServiceContext = (serviceName: string) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      // Add internal API key for service auth
      req.headers['x-api-key'] = SERVICE_API_KEY

      // Add service identification
      req.headers['x-service-name'] = serviceName
      req.headers['x-gateway-mode'] = 'embedded'

      // Log the request
      logger.debug(
        {
          service: serviceName,
          method: req.method,
          path: req.path,
          originalUrl: req.originalUrl,
        },
        'Routing to embedded service',
      )

      next()
    }
  }

  // Mount each service at its API path
  for (const route of SERVICE_ROUTES) {
    const serviceApp = services.get(route.service)

    if (serviceApp) {
      // Create a sub-router for path rewriting
      app.use(
        route.prefix,
        (req: Request, res: Response, next: NextFunction) => {
          // Add service context
          addServiceContext(route.service)(req, res, () => {
            // Rewrite the URL to match service expectations
            // Services expect their base path (e.g., /events) in the URL
            const newPath = route.mount + req.path

            req.url = newPath

            // Mount the service app
            serviceApp(req, res, next)
          })
        },
      )

      logger.info(
        `Mounted embedded service: ${route.service} at ${route.prefix}`,
      )
    } else {
      logger.warn(`Service not found for embedded mounting: ${route.service}`)
    }
  }

  // Add a catch-all handler for unmatched API routes
  app.use('/api/v1/*', (req: Request, res: Response) => {
    logger.warn(
      {
        path: req.path,
        method: req.method,
      },
      'No service found for API route',
    )

    res.status(404).json({
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: 'The requested service endpoint does not exist',
      },
    })
  })

  logger.info('Embedded services setup complete')
}
