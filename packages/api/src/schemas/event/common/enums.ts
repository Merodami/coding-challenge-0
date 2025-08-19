import { EventSortBy as EventSortByEnum } from '@fever/types'
import { z } from 'zod'

import { createSortFieldMapper } from '../../../common/utils/sorting.js'
import { createZodEnum } from '../../../common/utils/zodEnum.js'

/**
 * Event-specific enum schemas
 */

// ============= Event Enums =============

/**
 * Event sort fields - shared across public and admin APIs
 */
export const EventSortBySchema = createZodEnum(EventSortByEnum).describe(
  'Field to sort events by',
)

export type EventSortBy = z.infer<typeof EventSortBySchema>

/**
 * Event sort field mapper
 * Maps API sort fields to database column names
 */
export const eventSortFieldMapper = createSortFieldMapper(EventSortBySchema, {
  title: 'title',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})

// Event relations that can be included
export const EVENT_RELATIONS = ['sessions', 'zones'] as const

export type EventRelations = (typeof EVENT_RELATIONS)[number]
