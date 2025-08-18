import type { ZodRegistry } from '../../common/registry/base.js'
import * as eventEnumSchemas from '../../schemas/event/common/enums.js'
import * as eventParameterSchemas from '../../schemas/event/common/parameters.js'
import * as eventSchemas from '../../schemas/event/public/event.js'
import * as eventSearchSchemas from '../../schemas/event/public/search.js'
import { ErrorResponse } from '../../schemas/shared/errors.js'
import { PaginationMetadata } from '../../schemas/shared/responses.js'

/**
 * Register all public API schemas and routes
 */
export function registerPublicAPI(registry: ZodRegistry): void {
  // ============= Common Schemas =============
  // Register pagination metadata
  registry.registerSchema('PaginationMetadata', PaginationMetadata)

  // Register error response
  registry.registerSchema('ErrorResponse', ErrorResponse)

  // ============= Event Schemas =============
  // Register enum schemas
  registry.registerSchema('EventSortBy', eventEnumSchemas.EventSortBySchema)

  // Register parameter schemas
  registry.registerSchema('EventId', eventParameterSchemas.EventIdParam)

  // Register event response schemas
  registry.registerSchema('EventZoneResponse', eventSchemas.EventZoneResponse)
  registry.registerSchema(
    'EventSessionResponse',
    eventSchemas.EventSessionResponse,
  )
  registry.registerSchema('EventResponse', eventSchemas.EventResponse)
  registry.registerSchema('EventSearchParams', eventSchemas.EventSearchParams)
  registry.registerSchema('EventListResponse', eventSchemas.EventListResponse)

  // Register search schemas
  registry.registerSchema('EventSummary', eventSearchSchemas.EventSummarySchema)
  registry.registerSchema('EventList', eventSearchSchemas.EventListSchema)
  registry.registerSchema(
    'EventSearchQuery',
    eventSearchSchemas.EventSearchQuerySchema,
  )

  // Register search response schemas
  registry.registerSchema(
    'SearchSuccessResponse',
    eventSearchSchemas.SearchSuccessResponseSchema,
  )
  registry.registerSchema(
    'SearchErrorResponse',
    eventSearchSchemas.SearchErrorResponseSchema,
  )

  // ============= Routes =============
  // Register search route (as per API specification)
  registry.registerRoute({
    method: 'get',
    path: '/search',
    summary: 'Lists the available events on a time range',
    description: 'Return events within the specified time range',
    tags: ['Events'],
    request: {
      query: eventSearchSchemas.EventSearchQuerySchema,
    },
    responses: {
      200: {
        description: 'List of events within the specified time range',
        content: {
          'application/json': {
            schema: eventSearchSchemas.SearchSuccessResponseSchema,
          },
        },
      },
      400: {
        description:
          'The request was not correctly formed (missing required parameters, wrong types...)',
        content: {
          'application/json': {
            schema: eventSearchSchemas.SearchErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Generic error',
        content: {
          'application/json': {
            schema: eventSearchSchemas.SearchErrorResponseSchema,
          },
        },
      },
    },
  })
}
