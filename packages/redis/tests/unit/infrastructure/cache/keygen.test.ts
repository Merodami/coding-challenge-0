import { describe, expect, it } from 'vitest'

import { defaultKeyGenerator } from '../../../../src/infrastructure/cache/keygen.js'

describe('defaultKeyGenerator', () => {
  it('should generate basic key with prefix and method name', () => {
    const key = defaultKeyGenerator('cache', 'getUser', [])

    expect(key).toBe('cache:getUser:')
  })

  it('should handle string arguments', () => {
    const key = defaultKeyGenerator('cache', 'getUser', ['123', 'active'])

    expect(key).toBe('cache:getUser:123:active')
  })

  it('should handle number arguments', () => {
    const key = defaultKeyGenerator('cache', 'calculate', [42, 3.14])

    expect(key).toBe('cache:calculate:42:3.14')
  })

  it('should handle boolean arguments', () => {
    const key = defaultKeyGenerator('cache', 'filter', [true, false])

    expect(key).toBe('cache:filter:true:false')
  })

  it('should handle null and undefined', () => {
    const key = defaultKeyGenerator('cache', 'check', [null, undefined])

    expect(key).toBe('cache:check:null:undefined')
  })

  it('should handle object arguments with stable serialization', () => {
    const obj1 = { b: 2, a: 1, c: 3 }
    const obj2 = { a: 1, b: 2, c: 3 }
    const key1 = defaultKeyGenerator('cache', 'process', [obj1])
    const key2 = defaultKeyGenerator('cache', 'process', [obj2])

    expect(key1).toBe(key2) // Should be same despite different property order
    expect(key1).toContain('{"a":1,"b":2,"c":3}')
  })

  it('should handle nested objects', () => {
    const nested = { user: { id: 1, name: 'John' }, active: true }
    const key = defaultKeyGenerator('cache', 'complex', [nested])

    expect(key).toContain('cache:complex:')
    expect(key).toContain('"user"')
    expect(key).toContain('"id":1')
  })

  it('should handle arrays', () => {
    const arr = [1, 2, 3]
    const key = defaultKeyGenerator('cache', 'array', [arr])

    expect(key).toContain('[1,2,3]')
  })

  it('should handle mixed argument types', () => {
    const key = defaultKeyGenerator('cache', 'mixed', [
      'string',
      123,
      true,
      { key: 'value' },
      null,
    ])

    expect(key).toBe('cache:mixed:string:123:true:{"key":"value"}:null')
  })

  it('should handle empty objects', () => {
    const key = defaultKeyGenerator('cache', 'empty', [{}])

    expect(key).toBe('cache:empty:{}')
  })

  it('should handle complex nested structures', () => {
    const complex = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      settings: {
        theme: 'dark',
        notifications: true,
      },
    }
    const key = defaultKeyGenerator('cache', 'complex', [complex])

    expect(key).toContain('cache:complex:')
    expect(key).toContain('"users"')
    expect(key).toContain('"settings"')
  })
})
