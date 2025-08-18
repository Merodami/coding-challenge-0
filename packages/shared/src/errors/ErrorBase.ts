import {
  ErrorContext,
  ErrorDomain,
  ErrorResponse,
  ErrorSeverity,
} from '@fever/types'

/**
 * Base error class with rich context support
 */
export class BaseError extends Error {
  public readonly context: ErrorContext

  constructor(
    message: string,
    context: Partial<ErrorContext> & { code: string; domain: ErrorDomain },
  ) {
    super(message)

    this.name = this.constructor.name

    // Set default context values if not provided
    this.context = {
      severity: ErrorSeverity.ERROR,
      timestamp: new Date().toISOString(),
      ...context,
    } as ErrorContext

    // Ensure stack trace is captured properly
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Get HTTP status code for the error
   */
  public getHttpStatus(): number {
    return this.context.httpStatus || 500
  }

  /**
   * Get error code
   */
  public getCode(): string {
    return this.context.code
  }

  /**
   * Get error code (alias for backwards compatibility)
   */
  public get code(): string {
    return this.context.code
  }

  /**
   * Get error severity
   */
  public getSeverity(): ErrorSeverity {
    return this.context.severity
  }

  /**
   * Convert to client-safe response format
   */
  public toResponse(includeStack = false): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: this.context.code,
        type: this.name,
        message: this.message,
        domain: this.context.domain,
        timestamp: this.context.timestamp,
      },
    }

    if (this.context.suggestion) {
      response.error.suggestion = this.context.suggestion
    }

    if (this.context.supportReferenceCode) {
      response.error.referenceCode = this.context.supportReferenceCode
    }

    if (includeStack && this.stack) {
      response.error.stack = this.stack
    }

    return response
  }

  /**
   * Add metadata to error context
   */
  public addMetadata(metadata: Record<string, unknown>): this {
    this.context.metadata = {
      ...this.context.metadata,
      ...metadata,
    }

    return this
  }

  /**
   * Set correlation ID for distributed tracing
   */
  public setCorrelationId(correlationId: string): this {
    this.context.correlationId = correlationId

    return this
  }
}
