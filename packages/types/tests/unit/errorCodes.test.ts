import { describe, expect, it } from 'vitest'

import {
  ErrorCode,
  getHttpStatusForErrorCode,
  isRetryableError,
} from '../../src/errorCodes.js'

describe('errorCodes', () => {
  describe('getHttpStatusForErrorCode', () => {
    it('should return correct HTTP status for known error codes', () => {
      expect(getHttpStatusForErrorCode(ErrorCode.VALIDATION_ERROR)).toBe(400)
      expect(getHttpStatusForErrorCode(ErrorCode.UNAUTHORIZED)).toBe(401)
      expect(getHttpStatusForErrorCode(ErrorCode.NOT_FOUND)).toBe(404)
      expect(getHttpStatusForErrorCode(ErrorCode.INTERNAL_ERROR)).toBe(500)
    })

    it('should return 500 for unknown error codes', () => {
      const unknownCode = 'UNKNOWN_ERROR_CODE' as ErrorCode

      expect(getHttpStatusForErrorCode(unknownCode)).toBe(500)
    })
  })

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryableError(ErrorCode.PROVIDER_UNAVAILABLE)).toBe(true)
      expect(isRetryableError(ErrorCode.CONNECTION_ERROR)).toBe(true)
      expect(isRetryableError(ErrorCode.TIMEOUT_ERROR)).toBe(true)
      expect(isRetryableError(ErrorCode.EXTERNAL_SERVICE_ERROR)).toBe(true)
      expect(isRetryableError(ErrorCode.SYNC_FAILED)).toBe(true)
    })

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError(ErrorCode.VALIDATION_ERROR)).toBe(false)
      expect(isRetryableError(ErrorCode.UNAUTHORIZED)).toBe(false)
      expect(isRetryableError(ErrorCode.FORBIDDEN)).toBe(false)
      expect(isRetryableError(ErrorCode.NOT_FOUND)).toBe(false)
      expect(isRetryableError(ErrorCode.BAD_REQUEST)).toBe(false)
      expect(isRetryableError(ErrorCode.BUSINESS_RULE_VIOLATION)).toBe(false)
      expect(isRetryableError(ErrorCode.INVALID_API_KEY)).toBe(false)
    })

    it('should handle all infrastructure and external errors as retryable', () => {
      const infrastructureErrors = [
        ErrorCode.PROVIDER_UNAVAILABLE,
        ErrorCode.CONNECTION_ERROR,
        ErrorCode.TIMEOUT_ERROR,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
      ]

      infrastructureErrors.forEach((code) => {
        expect(isRetryableError(code)).toBe(true)
      })
    })

    it('should handle all user/client errors as non-retryable', () => {
      const clientErrors = [
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.BAD_REQUEST,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
        ErrorCode.NOT_FOUND,
      ]

      clientErrors.forEach((code) => {
        expect(isRetryableError(code)).toBe(false)
      })
    })
  })
})
