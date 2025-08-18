import {
  ErrorCode,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
} from '@fever/types'

import { BaseError } from './ErrorBase.js'

/**
 * Error thrown when a requested resource cannot be found
 */
export class ResourceNotFoundError extends BaseError {
  constructor(
    resourceType: string,
    resourceId: string,
    context: Partial<ErrorContext> = {},
  ) {
    super(`${resourceType} with ID '${resourceId}' not found`, {
      code: ErrorCode.NOT_FOUND,
      domain: ErrorDomain.DOMAIN,
      severity: ErrorSeverity.WARNING,
      httpStatus: 404,
      metadata: {
        resourceType,
        resourceId,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when a business rule is violated
 */
export class BusinessRuleViolationError extends BaseError {
  constructor(
    rule: string,
    details: string,
    context: Partial<ErrorContext> = {},
  ) {
    super(`Business rule violation: ${rule}. ${details}`, {
      code: ErrorCode.BUSINESS_RULE_VIOLATION,
      domain: ErrorDomain.DOMAIN,
      severity: ErrorSeverity.WARNING,
      httpStatus: 422,
      metadata: {
        rule,
        details,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueConstraintViolationError extends BaseError {
  constructor(
    entityName: string,
    field: string,
    value: string,
    context: Partial<ErrorContext> = {},
  ) {
    super(`${entityName} with ${field} '${value}' already exists`, {
      code: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
      domain: ErrorDomain.DOMAIN,
      severity: ErrorSeverity.WARNING,
      httpStatus: 409,
      metadata: {
        entityName,
        field,
        value,
      },
      ...context,
    })
  }
}

/**
 * Error thrown when an invalid state transition is attempted
 */
export class InvalidStateTransitionError extends BaseError {
  constructor(
    entity: string,
    fromState: string,
    toState: string,
    context: Partial<ErrorContext> = {},
  ) {
    super(
      `Invalid state transition for ${entity}: cannot transition from '${fromState}' to '${toState}'`,
      {
        code: ErrorCode.INVALID_STATE_TRANSITION,
        domain: ErrorDomain.DOMAIN,
        severity: ErrorSeverity.WARNING,
        httpStatus: 422,
        metadata: {
          entity,
          fromState,
          toState,
        },
        ...context,
      },
    )
  }
}
