/**
 * Error codes for standardized error identification across the Event Service
 */
import { get } from 'lodash-es'

/**
 * General error codes
 */
export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',

  // Infrastructure errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Domain errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Event specific errors
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  SYNC_FAILED = 'SYNC_FAILED',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  EVENT_ALREADY_EXISTS = 'EVENT_ALREADY_EXISTS',
  INVALID_EVENT_DATA = 'INVALID_EVENT_DATA',

  // API errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  MISSING_API_KEY = 'MISSING_API_KEY',

  // Data parsing errors
  XML_PARSE_ERROR = 'XML_PARSE_ERROR',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  INVALID_FORMAT = 'INVALID_FORMAT',
}

/**
 * Maps error codes to HTTP status codes
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  // 400 Bad Request
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.INVALID_DATE_RANGE]: 400,
  [ErrorCode.INVALID_EVENT_DATA]: 400,
  [ErrorCode.XML_PARSE_ERROR]: 400,
  [ErrorCode.JSON_PARSE_ERROR]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,

  // 401 Unauthorized
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_API_KEY]: 401,
  [ErrorCode.MISSING_API_KEY]: 401,

  // 403 Forbidden
  [ErrorCode.FORBIDDEN]: 403,

  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.EVENT_NOT_FOUND]: 404,

  // 409 Conflict
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.EVENT_ALREADY_EXISTS]: 409,
  [ErrorCode.UNIQUE_CONSTRAINT_VIOLATION]: 409,

  // 422 Unprocessable Entity
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.INVALID_STATE_TRANSITION]: 422,

  // 429 Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  // 500 Internal Server Error
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CACHE_ERROR]: 500,

  // 502 Bad Gateway
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,

  // 503 Service Unavailable
  [ErrorCode.PROVIDER_UNAVAILABLE]: 503,
  [ErrorCode.CONNECTION_ERROR]: 503,

  // 504 Gateway Timeout
  [ErrorCode.TIMEOUT_ERROR]: 504,

  // Sync errors map to 500
  [ErrorCode.SYNC_FAILED]: 500,
}

/**
 * Get HTTP status code for an error code
 */
export function getHttpStatusForErrorCode(code: ErrorCode): number {
  return get(ErrorCodeToHttpStatus, code, 500)
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryableErrors = [
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.CONNECTION_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.SYNC_FAILED,
  ]

  return retryableErrors.includes(code)
}
