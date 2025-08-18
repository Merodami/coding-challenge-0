import { z } from 'zod'

import { DateTime, UUID } from './primitives.js'

/**
 * Common error response schemas
 */

// ============= Error Response =============

/**
 * Standard error response (raw Zod)
 * Base schema that can be extended
 */
export const ErrorResponse = z.object({
  statusCode: z.number().int().min(100).max(599),
  error: z.string(),
  message: z.string(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
    )
    .optional(),
  correlationId: UUID.optional().describe('Request correlation ID'),
  timestamp: DateTime.optional(),
})

/**
 * Standard error response (OpenAPI documented)
 * This will generate $ref when used in OpenAPI schemas
 */
export const ErrorResponseSchema = ErrorResponse.openapi('ErrorResponse', {
  description: 'Standard error response',
})

export type ErrorResponse = z.infer<typeof ErrorResponse>

// ============= Validation Error =============

/**
 * Validation error response (400) - raw Zod
 */
export const ValidationErrorResponse = ErrorResponse.extend({
  statusCode: z.literal(400),
  error: z.literal('Bad Request'),
})

/**
 * Validation error response (400) - OpenAPI documented
 */
export const ValidationErrorResponseSchema = ValidationErrorResponse.openapi(
  'ValidationErrorResponse',
  {
    description: 'Validation error response',
  },
)

export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponse>

// ============= Authentication Errors =============

/**
 * Unauthorized error response (401) - raw Zod
 */
export const UnauthorizedResponse = ErrorResponse.extend({
  statusCode: z.literal(401),
  error: z.literal('Unauthorized'),
})

/**
 * Unauthorized error response (401) - OpenAPI documented
 */
export const UnauthorizedResponseSchema = UnauthorizedResponse.openapi(
  'UnauthorizedResponse',
  {
    description: 'Authentication required',
  },
)

export type UnauthorizedResponse = z.infer<typeof UnauthorizedResponse>

/**
 * Forbidden error response (403) - raw Zod
 */
export const ForbiddenResponse = ErrorResponse.extend({
  statusCode: z.literal(403),
  error: z.literal('Forbidden'),
})

/**
 * Forbidden error response (403) - OpenAPI documented
 */
export const ForbiddenResponseSchema = ForbiddenResponse.openapi(
  'ForbiddenResponse',
  {
    description: 'Insufficient permissions',
  },
)

export type ForbiddenResponse = z.infer<typeof ForbiddenResponse>

// ============= Resource Errors =============

/**
 * Not found error response (404) - raw Zod
 */
export const NotFoundResponse = ErrorResponse.extend({
  statusCode: z.literal(404),
  error: z.literal('Not Found'),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
})

/**
 * Not found error response (404) - OpenAPI documented
 */
export const NotFoundResponseSchema = NotFoundResponse.openapi(
  'NotFoundResponse',
  {
    description: 'Resource not found',
  },
)

export type NotFoundResponse = z.infer<typeof NotFoundResponse>

/**
 * Conflict error response (409) - raw Zod
 */
export const ConflictResponse = ErrorResponse.extend({
  statusCode: z.literal(409),
  error: z.literal('Conflict'),
  conflictingField: z.string().optional(),
  existingValue: z.any().optional(),
})

/**
 * Conflict error response (409) - OpenAPI documented
 */
export const ConflictResponseSchema = ConflictResponse.openapi(
  'ConflictResponse',
  {
    description: 'Resource conflict',
  },
)

export type ConflictResponse = z.infer<typeof ConflictResponse>

// ============= Server Errors =============

/**
 * Internal server error response (500) - raw Zod
 */
export const InternalServerErrorResponse = ErrorResponse.extend({
  statusCode: z.literal(500),
  error: z.literal('Internal Server Error'),
})

/**
 * Internal server error response (500) - OpenAPI documented
 */
export const InternalServerErrorResponseSchema =
  InternalServerErrorResponse.openapi('InternalServerErrorResponse', {
    description: 'Internal server error',
  })

export type InternalServerErrorResponse = z.infer<
  typeof InternalServerErrorResponse
>

/**
 * Service unavailable error response (503) - raw Zod
 */
export const ServiceUnavailableResponse = ErrorResponse.extend({
  statusCode: z.literal(503),
  error: z.literal('Service Unavailable'),
  retryAfter: z.number().int().positive().optional(),
})

/**
 * Service unavailable error response (503) - OpenAPI documented
 */
export const ServiceUnavailableResponseSchema =
  ServiceUnavailableResponse.openapi('ServiceUnavailableResponse', {
    description: 'Service temporarily unavailable',
  })

export type ServiceUnavailableResponse = z.infer<
  typeof ServiceUnavailableResponse
>
