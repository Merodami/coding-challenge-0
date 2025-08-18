import { EventSortBy, EventStatus, SellMode } from '@fever/types'
import { z } from 'zod'

import { createZodEnum } from '../../../common/utils/zodEnum.js'
import {
  EventId,
  Latitude,
  Longitude,
  Money,
  URL,
} from '../../shared/branded.js'
import { DateRangeParams, SearchParams } from '../../shared/pagination.js'
import { DateTimeString } from '../../shared/primitives.js'
import { paginatedResponse } from '../../shared/responses.js'
import { EventSortBySchema } from '../common/enums.js'

/**
 * Public event API schemas
 */

// ============= Event Response Schemas =============

/**
 * Event zone response (raw Zod)
 */
export const EventZoneResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  capacity: z.number().int().nonnegative().optional(),
  price: Money,
  numbered: z.boolean(),
})

/**
 * Event zone response (OpenAPI documented)
 */
export const EventZoneResponseSchema = EventZoneResponse.openapi(
  'EventZoneResponse',
  {
    description: 'Event zone information',
  },
)

export type EventZoneResponse = z.infer<typeof EventZoneResponse>

/**
 * Event session response (raw Zod)
 */
export const EventSessionResponse = z.object({
  id: z.string().uuid(),
  startsAt: DateTimeString,
  endsAt: DateTimeString,
  sellFrom: DateTimeString,
  sellTo: DateTimeString,
  soldOut: z.boolean(),
})

/**
 * Event session response (OpenAPI documented)
 */
export const EventSessionResponseSchema = EventSessionResponse.openapi(
  'EventSessionResponse',
  {
    description: 'Event session information',
  },
)

export type EventSessionResponse = z.infer<typeof EventSessionResponse>

/**
 * Event response (raw Zod)
 */
export const EventResponse = z.object({
  id: EventId,
  externalId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: URL.optional(),
  place: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: Latitude.optional(),
  longitude: Longitude.optional(),
  sellMode: createZodEnum(SellMode),
  status: createZodEnum(EventStatus),
  minPrice: Money.optional(),
  maxPrice: Money.optional(),
  startDate: DateTimeString,
  endDate: DateTimeString,
  sessions: z.array(EventSessionResponse).optional(),
  zones: z.array(EventZoneResponse).optional(),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
})

/**
 * Event response (OpenAPI documented)
 */
export const EventResponseSchema = EventResponse.openapi('EventResponse', {
  description: 'Event information',
})

export type EventResponse = z.infer<typeof EventResponse>

// ============= Query Parameters =============

/**
 * Event search query parameters (raw Zod)
 */
export const EventSearchParams = SearchParams.merge(DateRangeParams).extend({
  city: z.string().optional().describe('Filter by city'),
  country: z.string().optional().describe('Filter by country'),
  status: createZodEnum(EventStatus).optional().describe('Filter by status'),
  sellMode: createZodEnum(SellMode).optional().describe('Filter by sell mode'),
  minPrice: z.coerce
    .number()
    .nonnegative()
    .optional()
    .describe('Minimum price'),
  maxPrice: z.coerce
    .number()
    .nonnegative()
    .optional()
    .describe('Maximum price'),
  sortBy: EventSortBySchema.default(EventSortBy.STARTS_AT),
  include: z
    .string()
    .optional()
    .describe('Comma-separated relations: sessions,zones'),
})

/**
 * Event search query parameters (OpenAPI documented)
 */
export const EventSearchParamsSchema = EventSearchParams.openapi(
  'EventSearchParams',
  {
    description: 'Event search parameters',
  },
)

export type EventSearchParams = z.infer<typeof EventSearchParams>

// ============= List Response =============

/**
 * Event list response
 */
export const EventListResponse = paginatedResponse(EventResponse, {
  description: 'Paginated list of events',
})

export type EventListResponse = z.infer<typeof EventListResponse>
