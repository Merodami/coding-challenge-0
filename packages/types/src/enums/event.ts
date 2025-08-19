/**
 * Event-related enums for the Fever Event Service
 */

/**
 * Sell mode for events
 * Matches the provider's sell_mode field
 */
export const SellMode = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BOTH: 'both',
} as const

/**
 * Type definition for sell mode - use this for type annotations
 */
export type SellModeType = (typeof SellMode)[keyof typeof SellMode]

/**
 * Event status for tracking event lifecycle
 */
export const EventStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
} as const

/**
 * Type definition for event status - use this for type annotations
 */
export type EventStatusType = (typeof EventStatus)[keyof typeof EventStatus]

/**
 * Sort fields for event queries
 */
export const EventSortBy = {
  TITLE: 'title',
  STARTS_AT: 'startsAt',
  ENDS_AT: 'endsAt',
  MIN_PRICE: 'minPrice',
  MAX_PRICE: 'maxPrice',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const

/**
 * Type definition for event sort by - use this for type annotations
 */
export type EventSortByType = (typeof EventSortBy)[keyof typeof EventSortBy]

/**
 * Event provider source
 */
export const EventProvider = {
  FEVER: 'fever',
  EXTERNAL: 'external',
} as const

/**
 * Type definition for event provider - use this for type annotations
 */
export type EventProviderType =
  (typeof EventProvider)[keyof typeof EventProvider]
