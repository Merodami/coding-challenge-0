import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isDateInRange,
  isFutureDate,
  isPastDate,
  isValidISODate,
  parseDate,
  toISOString,
} from '../../../src/utils/date.js'

describe('date utilities', () => {
  describe('isValidISODate', () => {
    it('should return true for valid ISO 8601 dates', () => {
      expect(isValidISODate('2024-01-15T10:30:00.000Z')).toBe(true)
      expect(isValidISODate('2023-12-31T23:59:59.999Z')).toBe(true)
      expect(isValidISODate('2025-06-01T00:00:00.000Z')).toBe(true)
    })

    it('should return false for invalid ISO dates', () => {
      expect(isValidISODate('2024-01-15')).toBe(false) // Missing time
      expect(isValidISODate('2024-01-15T10:30:00')).toBe(false) // Missing Z
      expect(isValidISODate('not a date')).toBe(false)
      expect(isValidISODate('')).toBe(false)
    })

    it('should return false for valid dates in wrong format', () => {
      expect(isValidISODate('01/15/2024')).toBe(false)
      expect(isValidISODate('2024-13-01T00:00:00.000Z')).toBe(false) // Invalid month
      expect(isValidISODate('2024-01-32T00:00:00.000Z')).toBe(false) // Invalid day
    })
  })

  describe('toISOString', () => {
    it('should convert Date object to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')

      expect(toISOString(date)).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should convert date string to ISO string', () => {
      expect(toISOString('2024-01-15T10:30:00.000Z')).toBe(
        '2024-01-15T10:30:00.000Z',
      )
      expect(toISOString('2024-01-15')).toBe('2024-01-15T00:00:00.000Z')
    })

    it('should handle various date formats', () => {
      expect(toISOString('January 15, 2024')).toMatch(/2024-01-15/)
      expect(toISOString('2024/01/15')).toMatch(/2024-01-15/)
    })

    it('should throw for invalid dates', () => {
      const invalidDate = new Date('invalid')

      expect(() => toISOString(invalidDate)).toThrow()
      expect(() => toISOString('invalid')).toThrow()
    })
  })

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const result = parseDate('2024-01-15T10:30:00.000Z')

      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should parse various date formats', () => {
      expect(parseDate('2024-01-15')).toBeInstanceOf(Date)
      expect(parseDate('January 15, 2024')).toBeInstanceOf(Date)
      expect(parseDate('01/15/2024')).toBeInstanceOf(Date)
    })

    it('should throw for invalid date strings', () => {
      expect(() => parseDate('invalid')).toThrow('Invalid date string: invalid')
      expect(() => parseDate('')).toThrow('Invalid date string: ')
      expect(() => parseDate('abc123')).toThrow()
    })
  })

  describe('isPastDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for past dates', () => {
      expect(isPastDate('2024-01-14T12:00:00.000Z')).toBe(true)
      expect(isPastDate('2023-12-31T23:59:59.999Z')).toBe(true)
      expect(isPastDate(new Date('2024-01-15T11:59:59.999Z'))).toBe(true)
    })

    it('should return false for future dates', () => {
      expect(isPastDate('2024-01-16T12:00:00.000Z')).toBe(false)
      expect(isPastDate('2025-01-01T00:00:00.000Z')).toBe(false)
      expect(isPastDate(new Date('2024-01-15T12:00:00.001Z'))).toBe(false)
    })

    it('should return false for current time', () => {
      expect(isPastDate(new Date('2024-01-15T12:00:00.000Z'))).toBe(false)
    })
  })

  describe('isFutureDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for future dates', () => {
      expect(isFutureDate('2024-01-16T12:00:00.000Z')).toBe(true)
      expect(isFutureDate('2025-01-01T00:00:00.000Z')).toBe(true)
      expect(isFutureDate(new Date('2024-01-15T12:00:00.001Z'))).toBe(true)
    })

    it('should return false for past dates', () => {
      expect(isFutureDate('2024-01-14T12:00:00.000Z')).toBe(false)
      expect(isFutureDate('2023-12-31T23:59:59.999Z')).toBe(false)
      expect(isFutureDate(new Date('2024-01-15T11:59:59.999Z'))).toBe(false)
    })

    it('should return false for current time', () => {
      expect(isFutureDate(new Date('2024-01-15T12:00:00.000Z'))).toBe(false)
    })
  })

  describe('isDateInRange', () => {
    const startDate = '2024-01-10T00:00:00.000Z'
    const endDate = '2024-01-20T00:00:00.000Z'

    it('should return true for dates within range', () => {
      expect(
        isDateInRange('2024-01-15T12:00:00.000Z', startDate, endDate),
      ).toBe(true)
      expect(
        isDateInRange('2024-01-10T00:00:00.000Z', startDate, endDate),
      ).toBe(true)
      expect(
        isDateInRange('2024-01-20T00:00:00.000Z', startDate, endDate),
      ).toBe(true)
    })

    it('should return false for dates outside range', () => {
      expect(
        isDateInRange('2024-01-09T23:59:59.999Z', startDate, endDate),
      ).toBe(false)
      expect(
        isDateInRange('2024-01-20T00:00:00.001Z', startDate, endDate),
      ).toBe(false)
      expect(
        isDateInRange('2023-12-31T00:00:00.000Z', startDate, endDate),
      ).toBe(false)
      expect(
        isDateInRange('2024-02-01T00:00:00.000Z', startDate, endDate),
      ).toBe(false)
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')
      const start = new Date(startDate)
      const end = new Date(endDate)

      expect(isDateInRange(date, start, end)).toBe(true)
    })

    it('should handle mixed Date objects and strings', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')

      expect(isDateInRange(date, startDate, endDate)).toBe(true)
      expect(
        isDateInRange(
          '2024-01-15T00:00:00.000Z',
          new Date(startDate),
          new Date(endDate),
        ),
      ).toBe(true)
    })

    it('should handle inclusive boundaries', () => {
      expect(isDateInRange(startDate, startDate, endDate)).toBe(true)
      expect(isDateInRange(endDate, startDate, endDate)).toBe(true)
    })

    it('should handle reversed range (end before start)', () => {
      // When end is before start, no date can be in range
      expect(
        isDateInRange('2024-01-15T00:00:00.000Z', endDate, startDate),
      ).toBe(false)
    })
  })
})
