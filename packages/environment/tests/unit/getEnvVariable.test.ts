import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getEnvVariable } from '../../src/getEnvVariable.js'

describe('getEnvVariable', () => {
  const originalEnv = process.env
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    process.env = { ...originalEnv }
    consoleSpy.mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('when environment variable exists', () => {
    it('should return the casted value', () => {
      process.env['TEST_VAR'] = '123'

      const result = getEnvVariable('TEST_VAR', Number)

      expect(result).toBe(123)
    })

    it('should apply custom cast function', () => {
      process.env['TEST_BOOL'] = 'true'

      const result = getEnvVariable('TEST_BOOL', (val) => val === 'true')

      expect(result).toBe(true)
    })

    it('should handle string values', () => {
      process.env['TEST_STRING'] = 'hello world'

      const result = getEnvVariable('TEST_STRING', String)

      expect(result).toBe('hello world')
    })
  })

  describe('when environment variable does not exist', () => {
    it('should return fallback value when provided', () => {
      const result = getEnvVariable('MISSING_VAR', Number, 42)

      expect(result).toBe(42)
      expect(consoleSpy).toHaveBeenCalledWith(
        'No "MISSING_VAR" environment variable found. Using fallback.',
      )
    })

    it('should return null when no fallback provided', () => {
      const result = getEnvVariable('MISSING_VAR', Number)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Missing environment variable "MISSING_VAR".',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty string as valid value', () => {
      process.env['EMPTY_VAR'] = ''

      const result = getEnvVariable('EMPTY_VAR', String)

      expect(result).toBe('')
    })

    it('should treat undefined as missing', () => {
      process.env['UNDEFINED_VAR'] = undefined as any

      const result = getEnvVariable('UNDEFINED_VAR', String, 'default')

      expect(result).toBe('default')
    })

    it('should handle complex cast functions', () => {
      process.env['JSON_VAR'] = '{"key":"value"}'

      const result = getEnvVariable('JSON_VAR', JSON.parse)

      expect(result).toEqual({ key: 'value' })
    })

    it('should handle cast function that throws', () => {
      process.env['BAD_JSON'] = 'not json'

      const castFn = (val: string) => JSON.parse(val)

      expect(() => getEnvVariable('BAD_JSON', castFn)).toThrow()
    })
  })
})
