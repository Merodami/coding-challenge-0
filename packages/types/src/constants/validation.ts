/**
 * Field length constraints and validation rules
 * These are business rules, not configuration
 */

/**
 * Field length constraints based on data model requirements
 */
export const FIELD_LENGTH = {
  // Event fields from provider XML structure
  EVENT_TITLE_MIN: 1,
  EVENT_TITLE_MAX: 500,
  EVENT_EXTERNAL_ID_MAX: 255,
  ORGANIZER_ID_MAX: 255,

  // Zone fields from provider XML structure
  ZONE_NAME_MAX: 255,
  ZONE_EXTERNAL_ID_MAX: 255,

  // Error fields
  ERROR_MESSAGE_MAX: 1000,
  ERROR_CODE_MAX: 100,

  // Identifiers
  UUID_LENGTH: 36,
  API_KEY_LENGTH: 32,
  CORRELATION_ID_LENGTH: 36,
} as const

/**
 * Numeric constraints - business rules for data validation
 */
export const NUMERIC_CONSTRAINTS = {
  // Price constraints from provider data
  PRICE_MIN: 0,
  PRICE_MAX: 999999.99,
  PRICE_DECIMAL_PLACES: 2,

  // Capacity constraints
  CAPACITY_MIN: 0,
  CAPACITY_MAX: 999999,

  // Pagination limits (business rules, not config)
  PAGE_MIN: 1,
  PAGE_SIZE_MIN: 1,
  PAGE_SIZE_MAX: 100,
} as const

/**
 * Date constraints - business rules
 */
export const DATE_CONSTRAINTS = {
  MIN_YEAR: 2020,
  MAX_YEAR: 2050,
  MAX_DATE_RANGE_DAYS: 365, // Maximum searchable range
} as const

/**
 * Regular expressions for format validation
 */
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  TIME_ONLY: /^\d{2}:\d{2}:\d{2}$/,
  API_KEY: /^[A-Za-z0-9]{32}$/,
  EXTERNAL_ID: /^[A-Za-z0-9_-]+$/,
} as const

// Type exports
export type FieldLength = typeof FIELD_LENGTH
export type NumericConstraints = typeof NUMERIC_CONSTRAINTS
export type DateConstraints = typeof DATE_CONSTRAINTS
export type ValidationPatterns = typeof VALIDATION_PATTERNS
