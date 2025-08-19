import { SortOrder } from '@fever/types'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  createSortFieldMapper,
  mapSortOrder,
} from '../../../src/common/utils/sorting.js'

describe('sorting utilities', () => {
  describe('createSortFieldMapper', () => {
    const ApiSortFieldSchema = z.enum(['name', 'date', 'price'])

    type DbFields = 'event_name' | 'event_date' | 'event_price' | 'created_at'

    const mapping = {
      name: 'event_name' as DbFields,
      date: 'event_date' as DbFields,
      price: 'event_price' as DbFields,
    }

    const mapper = createSortFieldMapper(ApiSortFieldSchema, mapping)

    describe('mapSortField', () => {
      it('should map API field to database field', () => {
        expect(mapper.mapSortField('name', 'created_at')).toBe('event_name')
        expect(mapper.mapSortField('date', 'created_at')).toBe('event_date')
        expect(mapper.mapSortField('price', 'created_at')).toBe('event_price')
      })

      it('should return default field when API field is undefined', () => {
        expect(mapper.mapSortField(undefined, 'created_at')).toBe('created_at')
      })

      it('should return default field for unmapped fields', () => {
        // @ts-expect-error - testing invalid field
        expect(mapper.mapSortField('invalid', 'created_at')).toBe('created_at')
      })

      it('should handle empty string as invalid field', () => {
        // @ts-expect-error - testing invalid field
        expect(mapper.mapSortField('', 'created_at')).toBe('created_at')
      })
    })

    describe('isValidField', () => {
      it('should return true for valid API fields', () => {
        expect(mapper.isValidField('name')).toBe(true)
        expect(mapper.isValidField('date')).toBe(true)
        expect(mapper.isValidField('price')).toBe(true)
      })

      it('should return false for invalid fields', () => {
        expect(mapper.isValidField('invalid')).toBe(false)
        expect(mapper.isValidField('')).toBe(false)
        expect(mapper.isValidField('created_at')).toBe(false)
      })
    })
  })

  describe('mapSortOrder', () => {
    it('should return ASC when provided ASC', () => {
      expect(mapSortOrder(SortOrder.ASC)).toBe(SortOrder.ASC)
    })

    it('should return DESC when provided DESC', () => {
      expect(mapSortOrder(SortOrder.DESC)).toBe(SortOrder.DESC)
    })

    it('should return DESC as default when undefined', () => {
      expect(mapSortOrder(undefined)).toBe(SortOrder.DESC)
    })

    it('should return DESC for invalid values', () => {
      // @ts-expect-error - testing invalid value
      expect(mapSortOrder('invalid')).toBe(SortOrder.DESC)
      // @ts-expect-error - testing invalid value
      expect(mapSortOrder('ASC')).toBe(SortOrder.DESC)
      // @ts-expect-error - testing invalid value
      expect(mapSortOrder('DESC')).toBe(SortOrder.DESC)
      // @ts-expect-error - testing invalid value
      expect(mapSortOrder(null)).toBe(SortOrder.DESC)
    })
  })

  describe('integration: mapper with different schemas', () => {
    it('should work with single field enum', () => {
      const SingleFieldSchema = z.enum(['id'])
      const singleMapper = createSortFieldMapper(SingleFieldSchema, {
        id: 'entity_id',
      })

      expect(singleMapper.mapSortField('id', 'default_field')).toBe('entity_id')
      expect(singleMapper.isValidField('id')).toBe(true)
      expect(singleMapper.isValidField('other')).toBe(false)
    })

    it('should work with complex field names', () => {
      const ComplexSchema = z.enum([
        'user.name',
        'user.email',
        'meta.createdAt',
      ])
      const complexMapper = createSortFieldMapper(ComplexSchema, {
        'user.name': 'users.full_name',
        'user.email': 'users.email_address',
        'meta.createdAt': 'metadata.created_timestamp',
      })

      expect(complexMapper.mapSortField('user.name', 'id')).toBe(
        'users.full_name',
      )
      expect(complexMapper.mapSortField('user.email', 'id')).toBe(
        'users.email_address',
      )
      expect(complexMapper.mapSortField('meta.createdAt', 'id')).toBe(
        'metadata.created_timestamp',
      )
    })

    it('should handle partial mappings', () => {
      const PartialSchema = z.enum(['field1', 'field2', 'field3'])
      const partialMapper = createSortFieldMapper(PartialSchema, {
        field1: 'db_field1',
        // field2 is intentionally not mapped
        field3: 'db_field3',
      } as any)

      expect(partialMapper.mapSortField('field1', 'default')).toBe('db_field1')
      expect(partialMapper.mapSortField('field2', 'default')).toBe('default')
      expect(partialMapper.mapSortField('field3', 'default')).toBe('db_field3')
    })
  })
})
