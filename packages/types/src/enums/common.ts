/**
 * Common enums used across the Event Service
 */

/**
 * Sort order for queries
 * Used for ascending/descending sort operations
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Type definition for sort order - use this for type annotations
 */
export type SortOrderType = `${SortOrder}`

/**
 * Common timestamp sort fields - used by entities that only sort by timestamps
 */
export enum TimestampSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/**
 * Type definition for timestamp sort by - use this for type annotations
 */
export type TimestampSortByType = `${TimestampSortBy}`

/**
 * Common status values used across entities
 */
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DELETED = 'deleted',
}

/**
 * Type definition for status - use this for type annotations
 */
export type StatusType = `${Status}`

/**
 * Service environment types
 */
export enum ServiceEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Type definition for service environment
 */
export type ServiceEnvironmentType = `${ServiceEnvironment}`

/**
 * Log levels for system logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Type definition for log level
 */
export type LogLevelType = `${LogLevel}`

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * Type definition for HTTP method
 */
export type HttpMethodType = `${HttpMethod}`
