import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCode,
  type PaginationMetadata,
} from '@fever/types'
import { z } from 'zod'

import { PaginationParams } from '../../shared/pagination.js'
import { PaginationMetadata as PaginationMetadataSchema } from '../../shared/responses.js'

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z)

/**
 * Event search API schemas
 * These schemas define the contract for the provider event search endpoint
 */

// ============= Event Summary Schema =============

/**
 * Event summary for search results (raw Zod)
 * Represents a simplified view of an event with date/time fields
 */
export const EventSummary = z.object({
  id: z.string().uuid().describe('Identifier for the plan (UUID)'),
  title: z.string().describe('Title of the plan'),
  start_date: z
    .string()
    .date()
    .describe('Date when the event starts in local time'),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .nullable()
    .describe('Time when the event starts in local time'),
  end_date: z
    .string()
    .date()
    .nullable()
    .describe('Date when the event ends in local time'),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .nullable()
    .describe('Time when the event ends in local time'),
  min_price: z
    .number()
    .nullable()
    .describe('Min price from all the available tickets'),
  max_price: z
    .number()
    .nullable()
    .describe('Max price from all the available tickets'),
})

/**
 * Event summary for search results (OpenAPI documented)
 */
export const EventSummarySchema = EventSummary.openapi('EventSummary', {
  description: 'Event summary information for search results',
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Concert in the Park',
    start_date: '2024-06-30',
    start_time: '22:38:19',
    end_date: '2024-06-30',
    end_time: '14:45:15',
    min_price: 20.0,
    max_price: 50.0,
  },
})

export type EventSummary = z.infer<typeof EventSummary>

// ============= Event List Schema =============

/**
 * Event list container (raw Zod)
 * Includes pagination metadata
 */
export const EventList = z.object({
  events: z
    .array(EventSummary)
    .describe('List of events matching search criteria'),
  pagination: PaginationMetadataSchema.describe('Pagination metadata'),
})

/**
 * Event list container (OpenAPI documented)
 */
export const EventListSchema = EventList.openapi('EventList', {
  description: 'Container for event search results with pagination',
})

export type EventList = z.infer<typeof EventList>

// ============= Search Query Parameters =============

/**
 * Event search query parameters (raw Zod)
 * Extends PaginationParams to include page and limit
 */
export const EventSearchQuery = PaginationParams.extend({
  starts_at: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Return events starting after this date (ISO 8601)'),
  ends_at: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Return events ending before this date (ISO 8601)'),
})

/**
 * Event search query parameters (OpenAPI documented)
 */
export const EventSearchQuerySchema = EventSearchQuery.openapi(
  'EventSearchQuery',
  {
    description: 'Query parameters for event search',
    example: {
      starts_at: '2017-07-21T17:32:28Z',
      ends_at: '2021-07-21T17:32:28Z',
    },
  },
)

export type EventSearchQuery = z.infer<typeof EventSearchQuery>

// ============= API Response Schemas =============

/**
 * Event search success response schema (raw Zod)
 */
export const SearchSuccessResponse = z.object({
  data: EventList,
  error: z.null().describe('Error object, null when successful'),
})

/**
 * Event search success response schema (OpenAPI documented)
 */
export const SearchSuccessResponseSchema = SearchSuccessResponse.openapi(
  'SearchSuccessResponse',
  {
    description: 'Successful event search response',
    example: {
      data: {
        events: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Concert in the Park',
            start_date: '2024-06-30',
            start_time: '22:38:19',
            end_date: '2024-06-30',
            end_time: '14:45:15',
            min_price: 20.0,
            max_price: 50.0,
          },
        ],
      },
      error: null,
    },
  },
)

/**
 * Event search error response schema (raw Zod)
 */
export const SearchErrorResponse = z.object({
  data: z.null().describe('Data object, null when error occurs'),
  error: z.object({
    code: z.string().describe('Error code'),
    message: z.string().describe('Detail of the error'),
  }),
})

/**
 * Event search error response schema (OpenAPI documented)
 */
export const SearchErrorResponseSchema = SearchErrorResponse.openapi(
  'SearchErrorResponse',
  {
    description: 'Event search error response',
    example: {
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid date format provided',
      },
    },
  },
)

export type SearchSuccessResponse = z.infer<typeof SearchSuccessResponse>
export type SearchErrorResponse = z.infer<typeof SearchErrorResponse>

// Combined search response type
export type SearchResponse = SearchSuccessResponse | SearchErrorResponse

// ============= Response Factory Functions =============

/**
 * Creates a successful search response with pagination
 */
export function createSearchSuccessResponse(
  events: EventSummary[],
  pagination: PaginationMetadata,
): SearchSuccessResponse {
  return createSuccessResponse({ events, pagination })
}

/**
 * Creates an error response for search
 */
export function createSearchErrorResponse(
  code: ErrorCode | string,
  message: string,
): SearchErrorResponse {
  return createErrorResponse(code, message)
}

// ============= Date/Time Utilities =============

/**
 * Formats a Date object into separate date and time strings
 */
export function formatDateTime(date: Date): {
  date: string
  time: string | null
} {
  if (!date || isNaN(date.getTime())) {
    return { date: '', time: null }
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  }
}

/**
 * Parses an ISO 8601 datetime string to a Date object
 */
export function parseISODateTime(
  dateTimeStr: string | undefined,
): Date | undefined {
  if (!dateTimeStr) return undefined

  try {
    const date = new Date(dateTimeStr)

    return isNaN(date.getTime()) ? undefined : date
  } catch {
    return undefined
  }
}
