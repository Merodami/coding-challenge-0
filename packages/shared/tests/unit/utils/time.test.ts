import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatTime,
  isValidTime,
  parseTime,
  sleep,
  TIME_CONSTANTS,
} from '../../../src/utils/time.js'

describe('time utilities', () => {
  describe('parseTime', () => {
    it('should parse valid time strings to milliseconds', () => {
      expect(parseTime('5m')).toBe(5 * 60 * 1000)
      expect(parseTime('1h')).toBe(60 * 60 * 1000)
      expect(parseTime('30s')).toBe(30 * 1000)
      expect(parseTime('1d')).toBe(24 * 60 * 60 * 1000)
      expect(parseTime('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000)
      expect(parseTime('100ms')).toBe(100)
    })

    it('should pass through numeric values', () => {
      expect(parseTime(5000)).toBe(5000)
      expect(parseTime(0)).toBe(0)
      expect(parseTime(-1000)).toBe(-1000)
    })

    it('should return default value for invalid strings', () => {
      expect(parseTime('invalid')).toBe(60000) // Default 60s
      expect(parseTime('')).toBe(60000)
      expect(parseTime('abc123')).toBe(60000)
    })

    it('should use custom default value when provided', () => {
      expect(parseTime('invalid', 5000)).toBe(5000)
      expect(parseTime('', 0)).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(parseTime('0s')).toBe(0)
      expect(parseTime('0.5h')).toBe(30 * 60 * 1000)
      expect(parseTime('1.5m')).toBe(90 * 1000)
    })
  })

  describe('formatTime', () => {
    it('should format milliseconds to short time strings', () => {
      expect(formatTime(5 * 60 * 1000)).toBe('5m')
      expect(formatTime(60 * 60 * 1000)).toBe('1h')
      expect(formatTime(30 * 1000)).toBe('30s')
      expect(formatTime(24 * 60 * 60 * 1000)).toBe('1d')
      expect(formatTime(100)).toBe('100ms')
    })

    it('should format milliseconds to long time strings', () => {
      expect(formatTime(5 * 60 * 1000, true)).toBe('5 minutes')
      expect(formatTime(60 * 60 * 1000, true)).toBe('1 hour')
      expect(formatTime(1000, true)).toBe('1 second')
      expect(formatTime(24 * 60 * 60 * 1000, true)).toBe('1 day')
      expect(formatTime(100, true)).toBe('100 ms')
    })

    it('should handle edge cases', () => {
      expect(formatTime(0)).toBe('0ms')
      expect(formatTime(0, true)).toBe('0 ms')
      expect(formatTime(61000)).toBe('1m')
      expect(formatTime(61000, true)).toBe('1 minute')
    })

    it('should handle complex durations', () => {
      const duration =
        2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 45 * 60 * 1000

      expect(formatTime(duration)).toMatch(/^2d/) // Should start with 2d
    })
  })

  describe('isValidTime', () => {
    it('should return true for valid time strings', () => {
      expect(isValidTime('5m')).toBe(true)
      expect(isValidTime('1h')).toBe(true)
      expect(isValidTime('30s')).toBe(true)
      expect(isValidTime('1d')).toBe(true)
      expect(isValidTime('100ms')).toBe(true)
      expect(isValidTime('1 hour')).toBe(true)
      expect(isValidTime('2 weeks')).toBe(true)
    })

    it('should return true for numeric strings', () => {
      expect(isValidTime('1000')).toBe(true)
      expect(isValidTime('0')).toBe(true)
    })

    it('should return false for invalid time strings', () => {
      expect(isValidTime('invalid')).toBe(false)
      expect(isValidTime('')).toBe(false)
      expect(isValidTime('abc123')).toBe(false)
      expect(isValidTime('5x')).toBe(false)
      expect(isValidTime('m5')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidTime('0.5h')).toBe(true)
      expect(isValidTime('1.5 minutes')).toBe(true)
      expect(isValidTime('-5m')).toBe(false)
    })
  })

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should sleep for specified milliseconds', async () => {
      const promise = sleep(1000)

      vi.advanceTimersByTime(999)

      let resolved = false

      promise.then(() => {
        resolved = true
      })

      await Promise.resolve() // Let promises settle
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })

    it('should sleep for time string duration', async () => {
      const promise = sleep('2s')

      vi.advanceTimersByTime(1999)

      let resolved = false

      promise.then(() => {
        resolved = true
      })

      await Promise.resolve()
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })

    it('should handle invalid time strings with default', async () => {
      const promise = sleep('invalid')

      // Should use default 60s
      vi.advanceTimersByTime(59999)

      let resolved = false

      promise.then(() => {
        resolved = true
      })

      await Promise.resolve()
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })
  })

  describe('TIME_CONSTANTS', () => {
    it('should have correct time values in milliseconds', () => {
      expect(TIME_CONSTANTS.SECOND).toBe(1000)
      expect(TIME_CONSTANTS.MINUTE).toBe(60 * 1000)
      expect(TIME_CONSTANTS.HOUR).toBe(60 * 60 * 1000)
      expect(TIME_CONSTANTS.DAY).toBe(24 * 60 * 60 * 1000)
      expect(TIME_CONSTANTS.WEEK).toBe(7 * 24 * 60 * 60 * 1000)
    })
  })
})
