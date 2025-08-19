import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z)

/**
 * Common primitive schemas with Zod
 * Includes transforms, refinements, and custom error messages
 */

// ============= Basic Types =============

/**
 * UUID v4 - Generic UUID without branding (raw Zod)
 */
export const UUID = z
  .string()
  .uuid({ message: 'Must be a valid UUID' })
  .describe('Universally Unique Identifier')

/**
 * UUID v4 - OpenAPI documented
 */
export const UUIDSchema = UUID.openapi('UUID', {
  description: 'Universally Unique Identifier (v4)',
  example: '123e4567-e89b-12d3-a456-426614174000',
})

/**
 * DateTime - ISO 8601 string that can be parsed to Date (raw Zod)
 * Used for request inputs where we want Date objects
 */
export const DateTime = z
  .string()
  .datetime({ offset: true, message: 'Must be a valid ISO 8601 datetime' })
  .transform((str) => new Date(str))
  .describe('ISO 8601 datetime with timezone')

/**
 * DateTime - OpenAPI documented
 */
export const DateTimeSchema = DateTime.openapi('DateTime', {
  description: 'ISO 8601 datetime with timezone',
  example: new Date('2024-01-01T12:00:00Z'),
})

/**
 * DateTimeString - ISO 8601 string without transformation (raw Zod)
 * Used for API responses to maintain string format
 */
export const DateTimeString = z
  .string()
  .datetime({ offset: true, message: 'Must be a valid ISO 8601 datetime' })
  .describe('ISO 8601 datetime string with timezone')

/**
 * DateTimeString - OpenAPI documented
 */
export const DateTimeStringSchema = DateTimeString.openapi('DateTimeString', {
  description: 'ISO 8601 datetime string with timezone',
  example: '2024-01-01T12:00:00Z',
})

/**
 * DateOnly - Date in YYYY-MM-DD format (raw Zod)
 */
export const DateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be in YYYY-MM-DD format' })
  .refine(
    (date) => {
      const parsed = new Date(date)

      return !isNaN(parsed.getTime())
    },
    { message: 'Must be a valid date' },
  )
  .transform((str) => new Date(str))
  .describe('Date in YYYY-MM-DD format')

/**
 * DateOnly - OpenAPI documented
 */
export const DateOnlySchema = DateOnly.openapi('DateOnly', {
  description: 'Date in YYYY-MM-DD format',
  example: new Date('2024-01-01'),
})

/**
 * DateOnlyString - Date in YYYY-MM-DD format (no transformation) (raw Zod)
 */
export const DateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be in YYYY-MM-DD format' })
  .refine(
    (date) => {
      const parsed = new Date(date)

      return !isNaN(parsed.getTime())
    },
    { message: 'Must be a valid date' },
  )
  .describe('Date string in YYYY-MM-DD format')

/**
 * DateOnlyString - OpenAPI documented
 */
export const DateOnlyStringSchema = DateOnlyString.openapi('DateOnlyString', {
  description: 'Date string in YYYY-MM-DD format',
  example: '2024-01-01',
})

// ============= Numeric Types =============

/**
 * Positive Integer
 */
export const PositiveInt = z
  .number()
  .int('Must be an integer')
  .positive('Must be positive')

/**
 * Non-negative Integer
 */
export const NonNegativeInt = z
  .number()
  .int('Must be an integer')
  .nonnegative('Cannot be negative')

// ============= Pagination Types =============

/**
 * Page Number - 1-indexed
 */
export const PageNumber = z
  .number()
  .int()
  .min(1, 'Page number must be at least 1')
  .default(1)
  .describe('Page number (1-indexed)')

/**
 * Page Size
 */
export const PageSize = z
  .number()
  .int()
  .min(1, 'Page size must be at least 1')
  .max(100, 'Page size cannot exceed 100')
  .default(20)
  .describe('Number of items per page')

// ============= Utility Functions =============

/**
 * Create optional with null coercion
 */
export function nullable<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable().optional()
}

/**
 * Create a string enum with better error messages
 */
export function stringEnum<T extends readonly [string, ...string[]]>(
  values: T,
  options?: {
    message?: string
    description?: string
  },
) {
  const enumSchema = z.enum(values)

  if (options?.message) {
    return enumSchema
      .refine((val) => values.includes(val as T[number]), {
        message: options.message,
      })
      .describe(options?.description || '')
  }

  return enumSchema.describe(options?.description || '')
}

/**
 * Trimmed string with length constraints
 */
export function trimmedString(options?: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}) {
  let schema: any = z.string().transform((str) => str.trim())

  if (options?.minLength) {
    schema = schema.pipe(z.string().min(options.minLength))
  }
  if (options?.maxLength) {
    schema = schema.pipe(z.string().max(options.maxLength))
  }
  if (options?.pattern) {
    schema = schema.pipe(z.string().regex(options.pattern))
  }

  return schema
}
