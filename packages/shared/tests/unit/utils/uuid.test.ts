import { describe, expect, it, vi } from 'vitest'

import { generateId, isValidUuid } from '../../../src/utils/uuid.js'

// Mock uuid module
vi.mock('uuid', () => ({
  v4: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}))

describe('uuid utilities', () => {
  describe('generateId', () => {
    it('should generate a UUID string', () => {
      const id = generateId()

      expect(typeof id).toBe('string')
      expect(id).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should use mocked uuid.v4', () => {
      // This test verifies that our mock is being used
      const id1 = generateId()
      const id2 = generateId()

      // With our mock, both should return the same value
      expect(id1).toBe(id2)
      expect(id1).toBe('123e4567-e89b-12d3-a456-426614174000')
    })
  })

  describe('isValidUuid', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should return true for valid UUID v1', () => {
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should return true for valid UUID v5', () => {
      expect(isValidUuid('6ba7b814-9dad-51d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
      expect(isValidUuid('123e4567-E89B-12d3-A456-426614174000')).toBe(true)
    })

    it('should return false for invalid UUIDs', () => {
      // Wrong format
      expect(isValidUuid('123e4567e89b12d3a456426614174000')).toBe(false) // No hyphens
      expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false) // Too short
      expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740000')).toBe(false) // Too long

      // Invalid characters
      expect(isValidUuid('123g4567-e89b-12d3-a456-426614174000')).toBe(false)
      expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400g')).toBe(false)
      expect(isValidUuid('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(false)

      // Wrong structure
      expect(isValidUuid('123e4567-e89b12d3-a456-426614174000')).toBe(false)
      expect(isValidUuid('123e4567-e89b-12d3a456-426614174000')).toBe(false)
    })

    it('should return false for invalid version digit', () => {
      // Version must be 1-5
      expect(isValidUuid('123e4567-e89b-62d3-a456-426614174000')).toBe(false) // 6 is invalid
      expect(isValidUuid('123e4567-e89b-02d3-a456-426614174000')).toBe(false) // 0 is invalid
    })

    it('should return false for invalid variant digit', () => {
      // Variant must be 8, 9, a, or b
      expect(isValidUuid('123e4567-e89b-12d3-c456-426614174000')).toBe(false) // c is invalid
      expect(isValidUuid('123e4567-e89b-12d3-7456-426614174000')).toBe(false) // 7 is invalid
    })

    it('should return false for empty or invalid input', () => {
      expect(isValidUuid('')).toBe(false)
      expect(isValidUuid('not-a-uuid')).toBe(false)
      expect(isValidUuid('12345')).toBe(false)
    })

    it('should return false for null-like UUIDs', () => {
      expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(false) // Invalid version/variant
    })

    it('should validate real UUID examples', () => {
      // Real UUID v4 examples
      expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
      expect(isValidUuid('2c5ea4c0-4067-11e9-8bad-9b1deb4d3b7d')).toBe(true)
      expect(isValidUuid('3b241101-e2bb-4255-8caf-4136c566a964')).toBe(true)
    })
  })
})
