import type { PaginatedResult } from '@fever/types'
import { describe, expect, it } from 'vitest'

import { paginatedResponse } from '../../../src/utils/pagination.js'

describe('paginatedResponse', () => {
  const mockPagination = {
    page: 1,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasNext: true,
    hasPrev: false,
  }

  interface MockDomain {
    id: number
    name: string
    internal: string
  }

  interface MockDTO {
    id: number
    name: string
  }

  const mockMapper = (domain: MockDomain): MockDTO => ({
    id: domain.id,
    name: domain.name,
  })

  it('should transform data using the provided mapper function', () => {
    const domainResult: PaginatedResult<MockDomain> = {
      data: [
        { id: 1, name: 'Item 1', internal: 'secret' },
        { id: 2, name: 'Item 2', internal: 'hidden' },
      ],
      pagination: mockPagination,
    }

    const result = paginatedResponse(domainResult, mockMapper)

    expect(result.data).toEqual([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ])
    expect(result.data[0]).not.toHaveProperty('internal')
    expect(result.data[1]).not.toHaveProperty('internal')
  })

  it('should preserve pagination metadata unchanged', () => {
    const domainResult: PaginatedResult<MockDomain> = {
      data: [{ id: 1, name: 'Item 1', internal: 'secret' }],
      pagination: mockPagination,
    }

    const result = paginatedResponse(domainResult, mockMapper)

    expect(result.pagination).toEqual(mockPagination)
    expect(result.pagination).toBe(mockPagination) // Should be same reference
  })

  it('should handle empty data array', () => {
    const domainResult: PaginatedResult<MockDomain> = {
      data: [],
      pagination: { ...mockPagination, total: 0, totalPages: 0 },
    }

    const result = paginatedResponse(domainResult, mockMapper)

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('should handle single item', () => {
    const domainResult: PaginatedResult<MockDomain> = {
      data: [{ id: 42, name: 'Single Item', internal: 'private' }],
      pagination: {
        ...mockPagination,
        total: 1,
        totalPages: 1,
        hasNext: false,
      },
    }

    const result = paginatedResponse(domainResult, mockMapper)

    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({ id: 42, name: 'Single Item' })
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.hasNext).toBe(false)
  })

  it('should work with different domain and DTO types', () => {
    interface NumberDomain {
      value: number
    }

    interface StringDTO {
      text: string
    }

    const numberToStringMapper = (domain: NumberDomain): StringDTO => ({
      text: domain.value.toString(),
    })

    const domainResult: PaginatedResult<NumberDomain> = {
      data: [{ value: 1 }, { value: 2 }, { value: 3 }],
      pagination: mockPagination,
    }

    const result = paginatedResponse(domainResult, numberToStringMapper)

    expect(result.data).toEqual([{ text: '1' }, { text: '2' }, { text: '3' }])
  })

  it('should handle complex transformation logic', () => {
    interface ComplexDomain {
      id: number
      details: {
        name: string
        value: number
      }
      tags: string[]
    }

    interface SimpleDTO {
      id: number
      displayName: string
      tagCount: number
    }

    const complexMapper = (domain: ComplexDomain): SimpleDTO => ({
      id: domain.id,
      displayName: `${domain.details.name} (${domain.details.value})`,
      tagCount: domain.tags.length,
    })

    const domainResult: PaginatedResult<ComplexDomain> = {
      data: [
        {
          id: 1,
          details: { name: 'Test', value: 100 },
          tags: ['tag1', 'tag2', 'tag3'],
        },
      ],
      pagination: mockPagination,
    }

    const result = paginatedResponse(domainResult, complexMapper)

    expect(result.data[0]).toEqual({
      id: 1,
      displayName: 'Test (100)',
      tagCount: 3,
    })
  })

  it('should maintain immutability - not modify original data', () => {
    const originalData = [{ id: 1, name: 'Original', internal: 'secret' }]
    const domainResult: PaginatedResult<MockDomain> = {
      data: originalData,
      pagination: mockPagination,
    }

    paginatedResponse(domainResult, mockMapper)

    // Original data should remain unchanged
    expect(originalData[0]).toEqual({
      id: 1,
      name: 'Original',
      internal: 'secret',
    })
    expect(originalData[0]).toHaveProperty('internal')
  })
})
