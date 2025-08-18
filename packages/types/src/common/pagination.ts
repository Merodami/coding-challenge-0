/**
 * Pagination types and interfaces
 * Shared across all services for consistent pagination
 */

import type { SortDirection } from '../const.js'

/**
 * Pagination metadata for API responses
 */
export interface PaginationMetadata {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Generic paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMetadata
}

/**
 * Standard pagination query parameters
 */
export interface PaginatedQuery {
  page?: number
  limit?: number
}

/**
 * Search parameters with sorting
 */
export interface SearchParams extends PaginatedQuery {
  sortBy?: string
  sortOrder?: (typeof SortDirection)[keyof typeof SortDirection]
}

/**
 * Date range parameters for filtering
 */
export interface DateRangeParams {
  startsAt?: string // ISO 8601 datetime
  endsAt?: string // ISO 8601 datetime
}

/**
 * Search parameters with date range filtering
 */
export interface SearchParamsWithDateRange
  extends SearchParams,
    DateRangeParams {}

/**
 * Full-text search parameters
 */
export interface TextSearchParams extends SearchParams {
  search?: string
  searchFields?: string[]
}
