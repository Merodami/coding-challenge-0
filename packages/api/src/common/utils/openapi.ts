import { z } from 'zod'

/**
 * OpenAPI utilities for schema generation
 */

/**
 * Helper to add OpenAPI metadata to a schema
 */
export function openapi<T extends z.ZodTypeAny>(
  schema: T,
  metadata?: {
    description?: string
    example?: z.infer<T>
    deprecated?: boolean
    format?: string
    [key: string]: any
  },
): T {
  if (metadata && 'openapi' in schema) {
    return schema.openapi(metadata) as T
  }

  return schema
}
