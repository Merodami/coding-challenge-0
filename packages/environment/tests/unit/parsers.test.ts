import { describe, expect, it } from 'vitest'

import {
  parseBoolean,
  parseJson,
  parseList,
  parseNumber,
  parseString,
} from '../../src/parsers.js'

describe('parsers', () => {
  describe('parseBoolean', () => {
    it('should parse "true" as true', () => {
      expect(parseBoolean('true')).toBe(true)
    })

    it('should parse "TRUE" as true (case insensitive)', () => {
      expect(parseBoolean('TRUE')).toBe(true)
    })

    it('should parse "True" as true (mixed case)', () => {
      expect(parseBoolean('True')).toBe(true)
    })

    it('should parse "false" as false', () => {
      expect(parseBoolean('false')).toBe(false)
    })

    it('should parse any other value as false', () => {
      expect(parseBoolean('1')).toBe(false)
      expect(parseBoolean('yes')).toBe(false)
      expect(parseBoolean('on')).toBe(false)
      expect(parseBoolean('')).toBe(false)
      expect(parseBoolean('random')).toBe(false)
    })
  })

  describe('parseNumber', () => {
    it('should parse valid integers', () => {
      expect(parseNumber('42')).toBe(42)
      expect(parseNumber('0')).toBe(0)
      expect(parseNumber('-10')).toBe(-10)
    })

    it('should parse valid decimals', () => {
      expect(parseNumber('3.14')).toBe(3.14)
      expect(parseNumber('-2.5')).toBe(-2.5)
      expect(parseNumber('0.001')).toBe(0.001)
    })

    it('should parse scientific notation', () => {
      expect(parseNumber('1e3')).toBe(1000)
      expect(parseNumber('1.5e-2')).toBe(0.015)
    })

    it('should throw for invalid numbers', () => {
      expect(() => parseNumber('abc')).toThrow('Invalid number value: abc')
      expect(() => parseNumber('12abc')).toThrow('Invalid number value: 12abc')
    })

    it('should handle empty string as zero', () => {
      expect(parseNumber('')).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(parseNumber('Infinity')).toBe(Infinity)
      expect(parseNumber('-Infinity')).toBe(-Infinity)
      expect(() => parseNumber('NaN')).toThrow('Invalid number value: NaN')
    })
  })

  describe('parseString', () => {
    it('should return the input string as-is', () => {
      expect(parseString('hello')).toBe('hello')
      expect(parseString('')).toBe('')
      expect(parseString(' spaces ')).toBe(' spaces ')
      expect(parseString('123')).toBe('123')
    })
  })

  describe('parseList', () => {
    it('should parse comma-separated values', () => {
      expect(parseList('a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('should trim whitespace', () => {
      expect(parseList(' a , b , c ')).toEqual(['a', 'b', 'c'])
      expect(parseList('one, two, three')).toEqual(['one', 'two', 'three'])
    })

    it('should filter out empty values', () => {
      expect(parseList('a,,b,,')).toEqual(['a', 'b'])
      expect(parseList(',,,,')).toEqual([])
    })

    it('should handle single value', () => {
      expect(parseList('single')).toEqual(['single'])
    })

    it('should handle empty string', () => {
      expect(parseList('')).toEqual([])
    })

    it('should handle values with special characters', () => {
      expect(parseList('foo-bar,baz_qux,test.value')).toEqual([
        'foo-bar',
        'baz_qux',
        'test.value',
      ])
    })
  })

  describe('parseJson', () => {
    it('should parse valid JSON objects', () => {
      expect(parseJson('{"key":"value"}')).toEqual({ key: 'value' })
      expect(parseJson('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 })
    })

    it('should parse valid JSON arrays', () => {
      expect(parseJson('[1,2,3]')).toEqual([1, 2, 3])
      expect(parseJson('["a","b","c"]')).toEqual(['a', 'b', 'c'])
    })

    it('should parse JSON primitives', () => {
      expect(parseJson('123')).toBe(123)
      expect(parseJson('"string"')).toBe('string')
      expect(parseJson('true')).toBe(true)
      expect(parseJson('false')).toBe(false)
      expect(parseJson('null')).toBeNull()
    })

    it('should parse nested structures', () => {
      const nested = '{"a":{"b":{"c":123}},"arr":[1,2,3]}'

      expect(parseJson(nested)).toEqual({
        a: { b: { c: 123 } },
        arr: [1, 2, 3],
      })
    })

    it('should throw for invalid JSON', () => {
      expect(() => parseJson('invalid')).toThrow('Invalid JSON value: invalid')
      expect(() => parseJson('{key: value}')).toThrow()
      expect(() => parseJson("{'key': 'value'}")).toThrow()
      expect(() => parseJson('')).toThrow('Invalid JSON value: ')
    })

    it('should maintain type with generic parameter', () => {
      interface TestType {
        name: string
        age: number
      }

      const result = parseJson<TestType>('{"name":"John","age":30}')

      expect(result.name).toBe('John')
      expect(result.age).toBe(30)
    })
  })
})
