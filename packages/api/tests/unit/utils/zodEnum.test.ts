import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createZodEnum } from '../../../src/common/utils/zodEnum.js'

describe('zodEnum', () => {
  describe('createZodEnum', () => {
    it('should create a Zod enum schema from a TypeScript enum', () => {
      enum TestEnum {
        ONE = 'one',
        TWO = 'two',
        THREE = 'three',
      }

      const schema = createZodEnum(TestEnum)

      expect(schema.parse('one')).toBe('one')
      expect(schema.parse('two')).toBe('two')
      expect(schema.parse('three')).toBe('three')
    })

    it('should throw when parsing invalid enum values', () => {
      enum TestEnum {
        VALID = 'valid',
      }

      const schema = createZodEnum(TestEnum)

      expect(() => schema.parse('invalid')).toThrow()
    })

    it('should handle single-value enums', () => {
      enum SingleEnum {
        ONLY = 'only',
      }

      const schema = createZodEnum(SingleEnum)

      expect(schema.parse('only')).toBe('only')
      expect(() => schema.parse('other')).toThrow()
    })

    it('should throw for empty enum objects', () => {
      const emptyEnum = {} as const

      expect(() => createZodEnum(emptyEnum as any)).toThrow(
        'Enum must have at least one value',
      )
    })

    it('should work with const objects that mimic enums', () => {
      const Status = {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        PENDING: 'pending',
      } as const

      const schema = createZodEnum(Status)

      expect(schema.parse('active')).toBe('active')
      expect(schema.parse('inactive')).toBe('inactive')
      expect(schema.parse('pending')).toBe('pending')
      expect(() => schema.parse('deleted')).toThrow()
    })

    it('should preserve the error message from Zod', () => {
      enum TestEnum {
        A = 'a',
        B = 'b',
      }

      const schema = createZodEnum(TestEnum)

      expect(() => schema.parse('c')).toThrow(z.ZodError)
    })

    it('should work with numeric string values', () => {
      const Priority = {
        LOW: '1',
        MEDIUM: '2',
        HIGH: '3',
      } as const

      const schema = createZodEnum(Priority)

      expect(schema.parse('1')).toBe('1')
      expect(schema.parse('2')).toBe('2')
      expect(schema.parse('3')).toBe('3')
      expect(() => schema.parse('4')).toThrow()
    })

    it('should be compatible with Zod transformations', () => {
      enum TestEnum {
        FOO = 'foo',
        BAR = 'bar',
      }

      const schema = createZodEnum(TestEnum).transform((val) =>
        val.toUpperCase(),
      )

      expect(schema.parse('foo')).toBe('FOO')
      expect(schema.parse('bar')).toBe('BAR')
    })

    it('should be compatible with Zod optional', () => {
      enum TestEnum {
        VALUE = 'value',
      }

      const schema = createZodEnum(TestEnum).optional()

      expect(schema.parse('value')).toBe('value')
      expect(schema.parse(undefined)).toBeUndefined()
      expect(() => schema.parse('invalid')).toThrow()
    })
  })
})
