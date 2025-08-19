import ms from 'ms'

/**
 * Modern time utilities using the industry-standard `ms` library
 */

/**
 * Type for valid time strings that ms accepts
 */
type TimeString = ms.StringValue

/**
 * Check if a string is a valid time format
 */
function isValidTimeString(value: string): value is TimeString {
  // Simple regex check for ms format
  return (
    /^\d+(\.\d+)?\s*(years?|yrs?|y|weeks?|w|days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|sec|s|milliseconds?|msecs?|msec|ms)$/i.test(
      value,
    ) || /^\d+$/.test(value)
  )
}

/**
 * Convert time string to milliseconds
 *
 * @param time - Time string (e.g., '5m', '1h', '30s', '1d') or number in milliseconds
 * @param defaultMs - Default value if parsing fails (defaults to 60 seconds)
 * @returns Time in milliseconds
 *
 * @example
 * ```typescript
 * parseTime('5m')     // 300000
 * parseTime('1h')     // 3600000
 * parseTime('30s')    // 30000
 * parseTime('1d')     // 86400000
 * parseTime('invalid') // 60000 (default)
 * parseTime(5000)     // 5000 (pass-through)
 * ```
 */
export function parseTime(
  time: string | number,
  defaultMs: number = 60000,
): number {
  if (typeof time === 'number') {
    return time
  }

  if (!isValidTimeString(time)) {
    return defaultMs
  }

  try {
    return ms(time)
  } catch {
    return defaultMs
  }
}

/**
 * Convert milliseconds to human-readable time string
 *
 * @param milliseconds - Time in milliseconds
 * @param long - Use long format (default: false)
 * @returns Human-readable time string
 *
 * @example
 * ```typescript
 * formatTime(300000)           // '5m'
 * formatTime(300000, true)     // '5 minutes'
 * formatTime(3600000)          // '1h'
 * formatTime(3600000, true)    // '1 hour'
 * ```
 */
export function formatTime(
  milliseconds: number,
  long: boolean = false,
): string {
  return ms(milliseconds, { long })
}

/**
 * Common time constants in milliseconds
 */
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

/**
 * Validate if a time string is valid
 *
 * @param time - Time string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidTime('5m')      // true
 * isValidTime('invalid') // false
 * ```
 */
export function isValidTime(time: string): boolean {
  return isValidTimeString(time)
}

/**
 * Sleep for specified time (async utility)
 *
 * @param time - Time string or milliseconds
 * @returns Promise that resolves after the specified time
 *
 * @example
 * ```typescript
 * await sleep('1s')     // Sleep for 1 second
 * await sleep(1000)     // Sleep for 1000ms
 * ```
 */
export function sleep(time: string | number): Promise<void> {
  const ms_value = parseTime(time)

  return new Promise((resolve) => setTimeout(resolve, ms_value))
}
