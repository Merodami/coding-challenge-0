import { EVENT_SERVICE_HOST, EVENT_SERVICE_PORT } from '@fever/environment'
import { logger } from '@fever/shared'
import type { Express } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

/**
 * Service configuration for the Event Service
 * Following the exact pattern from .project
 */
const EVENT_SERVICE_ROUTES = [
  {
    name: 'search',
    prefix: '/api/v1/search',
    upstream: `http://${EVENT_SERVICE_HOST}:${EVENT_SERVICE_PORT}`,
  },
]

/**
 * Set up proxy routes to backend services
 * Following the exact pattern from .project/packages/api-gateway
 */
export function setupProxyRoutes(app: Express): void {
  try {
    // Set up proxy for each service route
    for (const service of EVENT_SERVICE_ROUTES) {
      const proxyMiddleware = createProxyMiddleware({
        target: service.upstream,
        changeOrigin: true,
        pathRewrite: (path) => {
          // When Express mounts on /api/v1/search, it strips that prefix
          // So we receive the query params and need to add /search back
          return `/${service.name}${path}`
        },
        selfHandleResponse: false,
        on: {
          error: (err, req, res) => {
            logger.error(`Proxy error for ${service.name}:`, err)
            // Type guard to check if res is an Express response
            if (res && 'headersSent' in res && 'status' in res) {
              if (!res.headersSent) {
                ;(res as any).status(502).json({
                  error: 'Bad Gateway',
                  message: `Unable to reach ${service.name} service`,
                })
              }
            }
          },
          proxyReq: (proxyReq, req) => {
            // Add API key header if present
            const expressReq = req as any

            if (expressReq.headers['x-api-key']) {
              proxyReq.setHeader('x-api-key', expressReq.headers['x-api-key'])
            }

            // If body was parsed by Express, we need to re-stream it
            if (expressReq.body !== undefined) {
              const bodyData = JSON.stringify(expressReq.body)

              // Update headers
              proxyReq.setHeader('Content-Type', 'application/json')
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))

              // Write the body
              proxyReq.write(bodyData)
              proxyReq.end()
            }
          },
        },
        logger: logger,
      })

      // Apply proxy middleware to the service prefix
      app.use(service.prefix, proxyMiddleware)

      logger.info(`Proxy ${service.prefix} → ${service.upstream}`)
    }
  } catch (error) {
    logger.error('Failed to setup proxy routes:', error)
    throw error // Re-throw to ensure the server knows setup failed
  }
}
