import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z)

/**
 * Common response schemas
 */

// ============= Pagination Metadata =============

/**
 * Pagination metadata (raw Zod)
 */
export const PaginationMetadata = z.object({
  page: z.number().int().positive().describe('Current page number'),
  limit: z.number().int().positive().describe('Items per page'),
  total: z.number().int().nonnegative().describe('Total number of items'),
  totalPages: z.number().int().nonnegative().describe('Total number of pages'),
  hasNext: z.boolean().describe('Whether there is a next page'),
  hasPrev: z.boolean().describe('Whether there is a previous page'),
})

/**
 * Pagination metadata (OpenAPI documented)
 */
export const PaginationMetadataSchema = PaginationMetadata.openapi(
  'PaginationMetadata',
  {
    description: 'Pagination metadata',
  },
)

export type PaginationMetadata = z.infer<typeof PaginationMetadata>

// ============= Paginated Response =============

/**
 * Create a paginated response schema
 */
export function paginatedResponse<T extends z.ZodTypeAny>(
  itemSchema: T,
  options?: {
    description?: string
  },
) {
  return z
    .object({
      data: z.array(itemSchema).describe('Page items'),
      pagination: PaginationMetadata,
    })
    .openapi({
      description: options?.description || 'Paginated response',
    })
}

// ============= Success Response =============

/**
 * Create a success response schema
 */
export function successResponse<T extends z.ZodTypeAny>(
  dataSchema: T,
  options?: {
    description?: string
  },
) {
  return z
    .object({
      success: z.literal(true),
      data: dataSchema,
    })
    .openapi({
      description: options?.description || 'Success response',
    })
}

// ============= Empty Response =============

/**
 * Empty response for DELETE operations
 */
export const EmptyResponse = z
  .object({
    success: z.literal(true),
  })
  .openapi('EmptyResponse', {
    description: 'Empty success response',
  })

export type EmptyResponse = z.infer<typeof EmptyResponse>
