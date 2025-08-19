export { setupServiceHealthCheck } from './application/api/healthCheck.js'
export { createExpressServer, startServer } from './application/api/server.js'
export type { HealthCheckConfig } from './domain/types/healthCheck.js'
export type {
  IdempotencyConfig,
  IdempotencyContext,
  IdempotentResponse,
} from './domain/types/idempotency.js'
export type { ServerOptions } from './domain/types/server.js'

// Express middleware exports
export {
  optionalApiKey,
  requireApiKey,
  validateApiKey,
} from './infrastructure/express/middleware/apiKeyAuth.js'
export { errorMiddleware } from './infrastructure/express/middleware/errorHandler.js'
export {
  idempotencyMiddleware,
  idempotencyPlugin,
} from './infrastructure/express/middleware/idempotency.js'
export {
  requireServiceApiKey,
  validateServiceApiKey,
} from './infrastructure/express/middleware/serviceAuth.js'
export {
  validateBody,
  validateParams,
  validateQuery,
} from './infrastructure/express/middleware/validation.js'

// Utility exports
export * from './utils/index.js'
