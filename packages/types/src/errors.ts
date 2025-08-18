/**
 * Error-related types and enums
 */

/**
 * Error severity levels for classification and monitoring
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error domains for categorizing the source/context of errors
 */
export enum ErrorDomain {
  DOMAIN = 'domain', // Business logic / domain rules errors
  APPLICATION = 'application', // General application errors
  INFRASTRUCTURE = 'infrastructure', // Database, external services, etc.
  SECURITY = 'security', // Authentication, authorization errors
  VALIDATION = 'validation', // Input validation errors
  EXTERNAL = 'external', // Errors from external services/APIs
  UNKNOWN = 'unknown', // Uncategorized errors
}

/**
 * Error context with rich metadata for better debugging and logging
 */
export interface ErrorContext {
  domain: ErrorDomain
  severity: ErrorSeverity
  code: string
  httpStatus?: number
  timestamp: string
  correlationId?: string
  transactionId?: string
  source?: string
  stackId?: string
  userId?: string
  clientInfo?: {
    ip?: string
    userAgent?: string
  }
  metadata?: Record<string, any>
  suggestion?: string
  supportReferenceCode?: string
  retryable?: boolean
}

/**
 * Type for client-safe error response
 */
export interface ErrorResponse {
  error: {
    code: string
    type: string
    message: string
    domain: ErrorDomain
    timestamp: string
    suggestion?: string
    referenceCode?: string
    stack?: string
    [key: string]: any
  }
}
