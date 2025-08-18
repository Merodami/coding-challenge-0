import { z } from 'zod'

/**
 * Branded types for type safety and domain modeling
 * Using Zod's brand feature to create nominal types
 */

// Helper to create branded types
export const brand = <T extends z.ZodTypeAny, B extends string>(schema: T) =>
  schema.brand<B>()

// ============= ID Types =============

/**
 * Event ID - Branded UUID for event identification
 */
export const EventId = z
  .string()
  .uuid({ message: 'Invalid event ID format' })
  .brand('EventId')
export type EventId = z.infer<typeof EventId>

/**
 * Session ID - Branded UUID for event session identification
 */
export const SessionId = z
  .string()
  .uuid({ message: 'Invalid session ID format' })
  .brand('SessionId')
export type SessionId = z.infer<typeof SessionId>

/**
 * Zone ID - Branded UUID for event zone identification
 */
export const ZoneId = z
  .string()
  .uuid({ message: 'Invalid zone ID format' })
  .brand('ZoneId')
export type ZoneId = z.infer<typeof ZoneId>

/**
 * Provider Event ID - External provider's event identifier
 */
export const ProviderEventId = z
  .string()
  .min(1, { message: 'Provider event ID cannot be empty' })
  .brand('ProviderEventId')
export type ProviderEventId = z.infer<typeof ProviderEventId>

// ============= Value Objects =============

/**
 * Money - Amount in cents (always positive integer)
 */
export const Money = z
  .number()
  .int({ message: 'Amount must be a whole number' })
  .nonnegative({ message: 'Amount cannot be negative' })
  .brand('Money')
export type Money = z.infer<typeof Money>

/**
 * Percentage - Value between 0 and 100
 */
export const Percentage = z
  .number()
  .min(0, { message: 'Percentage cannot be less than 0' })
  .max(100, { message: 'Percentage cannot be more than 100' })
  .brand('Percentage')
export type Percentage = z.infer<typeof Percentage>

/**
 * Latitude - Geographic latitude
 */
export const Latitude = z
  .number()
  .min(-90, { message: 'Latitude must be between -90 and 90' })
  .max(90, { message: 'Latitude must be between -90 and 90' })
  .brand('Latitude')
export type Latitude = z.infer<typeof Latitude>

/**
 * Longitude - Geographic longitude
 */
export const Longitude = z
  .number()
  .min(-180, { message: 'Longitude must be between -180 and 180' })
  .max(180, { message: 'Longitude must be between -180 and 180' })
  .brand('Longitude')
export type Longitude = z.infer<typeof Longitude>

/**
 * URL - Branded URL with validation
 */
export const URL = z
  .string()
  .url({ message: 'Invalid URL format' })
  .brand('URL')
export type URL = z.infer<typeof URL>

/**
 * API Key - Branded API key
 */
export const APIKey = z
  .string()
  .min(32, { message: 'API key must be at least 32 characters' })
  .brand('APIKey')
export type APIKey = z.infer<typeof APIKey>

/**
 * Correlation ID - For request tracing
 */
export const CorrelationId = z
  .string()
  .regex(/^req_[a-zA-Z0-9]{16}$/, { message: 'Invalid correlation ID format' })
  .brand('CorrelationId')
export type CorrelationId = z.infer<typeof CorrelationId>

// ============= Helper Functions =============

/**
 * Create a new branded ID type
 */
export function createIdType<B extends string>(brandName: B) {
  return z
    .string()
    .uuid({ message: `Invalid ${brandName} format` })
    .brand(brandName)
}

/**
 * Create a new branded string type with constraints
 */
export function createStringType<B extends string>(
  brandName: B,
  options?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    transform?: (val: string) => string
  },
) {
  let schema = z.string()

  if (options?.minLength) {
    schema = schema.min(options.minLength)
  }
  if (options?.maxLength) {
    schema = schema.max(options.maxLength)
  }
  if (options?.pattern) {
    schema = schema.regex(options.pattern)
  }
  if (options?.transform) {
    schema = schema.transform(options.transform) as any
  }

  return schema.brand(brandName)
}
