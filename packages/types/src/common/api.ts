/**
 * API Response Types
 *
 * Single source of truth for API responses matching swagger-spec.json:
 * - Success: { data: T, error: null }
 * - Error: { data: null, error: { code, message } }
 */

import type { ErrorCode } from '../errorCodes.js'

/**
 * API error structure (matches Swagger spec)
 */
export interface ApiError {
  code: string // Uses ErrorCode enum values from errorCodes.ts
  message: string
}

/**
 * Standard API response wrapper (matches Swagger spec)
 */
export interface ApiResponse<T = any> {
  data: T | null
  error: ApiError | null
}

/**
 * Success response type
 */
export type ApiSuccessResponse<T> = {
  data: T
  error: null
}

/**
 * Error response type
 */
export type ApiErrorResponse = {
  data: null
  error: ApiError
}

/**
 * Creates a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    data,
    error: null,
  }
}

/**
 * Creates an error response
 */
export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
): ApiErrorResponse {
  return {
    data: null,
    error: { code, message },
  }
}
