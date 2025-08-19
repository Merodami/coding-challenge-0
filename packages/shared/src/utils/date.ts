/**
 * Date utility functions
 */

/**
 * Check if a date string is valid ISO 8601
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString)

  return !isNaN(date.getTime()) && date.toISOString() === dateString
}

/**
 * Format a date to ISO 8601 string
 */
export function toISOString(date: Date | string): string {
  if (typeof date === 'string') {
    const dateObj = new Date(date)

    return dateObj.toISOString()
  }

  return date.toISOString()
}

/**
 * Parse a date string to Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return date
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj < new Date()
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj > new Date()
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string,
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const startObj =
    typeof startDate === 'string' ? new Date(startDate) : startDate
  const endObj = typeof endDate === 'string' ? new Date(endDate) : endDate

  return dateObj >= startObj && dateObj <= endObj
}
