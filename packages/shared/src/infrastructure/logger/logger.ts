import { LOG_LEVEL, NODE_ENV } from '@fever/environment'
import pino from 'pino'

const isTest = NODE_ENV === 'test'
const isDevelopment = NODE_ENV === 'development'

// Create the base pino logger
const baseLogger = pino({
  level: isTest ? 'silent' : LOG_LEVEL,
  base: {
    pid: process.pid,
    hostname: 'fever-event-service',
  },
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

/**
 * Internal log function that handles various argument patterns
 * Following the exact pattern from .project
 */
function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  baseData: Record<string, unknown>,
  ...args: unknown[]
): void {
  // Skip logging completely in test environment
  if (isTest) return

  const data: Record<string, unknown> = { ...baseData }
  const messageParts: string[] = []

  for (const arg of args) {
    if (typeof arg === 'string') {
      messageParts.push(arg)
    } else if (arg instanceof Error) {
      // Attach error details
      data['error'] = { message: arg.message, stack: arg.stack }
    } else if (Array.isArray(arg)) {
      data['array'] = arg
    } else if (typeof arg === 'object' && arg !== null) {
      // Merge objects into the log's data payload
      Object.assign(data, arg)
    } else {
      messageParts.push(String(arg))
    }
  }

  const message = messageParts.join(' ')

  // eslint-disable-next-line security/detect-object-injection
  baseLogger[level](data, message)
}

/**
 * Create a logger instance that automatically includes the provided base data
 * and merges in dynamic context on every log call.
 */
const createLogger = (baseData: Record<string, unknown> = {}) => {
  // In test environment, return no-op functions to avoid any logging
  if (isTest) {
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }
  }

  // Normal logging for non-test environments
  return {
    debug: (...args: unknown[]): void => log('debug', baseData, ...args),
    info: (...args: unknown[]): void => log('info', baseData, ...args),
    warn: (...args: unknown[]): void => log('warn', baseData, ...args),
    error: (...args: unknown[]): void => log('error', baseData, ...args),
  }
}

/**
 * Default logger instance
 */
export const logger = createLogger({ name: 'fever-event-service' })
