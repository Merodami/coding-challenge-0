import { NUMERIC_CONSTRAINTS, SortOrder } from '@fever/types'
import { z } from 'zod'

import { createZodEnum } from '../../common/utils/zodEnum.js'

/**
 * Common pagination schemas
 */

// ============= Pagination Parameters =============

/**
 * Common pagination query parameters (raw Zod)
 */
export const PaginationParams = z.object({
  page: z.coerce.number().int().positive().default(1).describe('Page number'),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(NUMERIC_CONSTRAINTS.PAGE_SIZE_MAX)
    .default(20)
    .describe('Items per page'),
})

/**
 * Common pagination query parameters (OpenAPI documented)
 */
export const PaginationParamsSchema = PaginationParams.openapi(
  'PaginationParams',
  {
    description: 'Common pagination query parameters',
  },
)

export type PaginationParams = z.infer<typeof PaginationParams>

// ============= Sort Parameters =============

/**
 * Common sort parameters (raw Zod)
 */
export const SortParams = z.object({
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: createZodEnum(SortOrder)
    .default(SortOrder.DESC)
    .describe('Sort order'),
})

/**
 * Common sort parameters (OpenAPI documented)
 */
export const SortParamsSchema = SortParams.openapi('SortParams', {
  description: 'Common sort parameters',
})

export type SortParams = z.infer<typeof SortParams>

// ============= Date Range Parameters =============

/**
 * Common date range parameters (raw Zod)
 */
export const DateRangeParams = z.object({
  fromDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Start date (ISO 8601)'),
  toDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('End date (ISO 8601)'),
})

/**
 * Common date range parameters (OpenAPI documented)
 */
export const DateRangeParamsSchema = DateRangeParams.openapi(
  'DateRangeParams',
  {
    description: 'Common date range parameters',
  },
)

export type DateRangeParams = z.infer<typeof DateRangeParams>

// ============= Search Parameters =============

/**
 * Common search parameters (raw Zod)
 */
export const SearchParams = PaginationParams.merge(SortParams).extend({
  search: z.string().optional().describe('Search query'),
})

/**
 * Common search parameters (OpenAPI documented)
 */
export const SearchParamsSchema = SearchParams.openapi('SearchParams', {
  description: 'Common search parameters',
})

export type SearchParams = z.infer<typeof SearchParams>
