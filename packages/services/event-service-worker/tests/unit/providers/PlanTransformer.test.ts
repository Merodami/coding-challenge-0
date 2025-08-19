/**
 * PlanTransformer Unit Tests
 */

import { SellMode } from '@fever/types'
import { beforeEach, describe, expect, it } from 'vitest'

import { PlanTransformer } from '../../../src/providers/transformers/PlanTransformer.js'

describe('PlanTransformer', () => {
  let transformer: PlanTransformer

  beforeEach(() => {
    transformer = new PlanTransformer()
  })

  describe('transform', () => {
    it('should transform valid plan data', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Camela en concierto',
                organizer_company_id: '2',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: '2021-06-30T21:00:00',
                    plan_end_date: '2021-06-30T22:00:00',
                    sell_from: '2020-07-01T00:00:00',
                    sell_to: '2021-06-30T20:00:00',
                    sold_out: 'false',
                    zone: [
                      {
                        zone_id: '40',
                        capacity: '243',
                        price: '20.00',
                        name: 'Platea',
                        numbered: 'true',
                      },
                      {
                        zone_id: '38',
                        capacity: '100',
                        price: '15.00',
                        name: 'Grada 2',
                        numbered: 'false',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result).toHaveLength(1)
      expect(result[0]?.basePlanId).toBe('291')
      expect(result[0]?.title).toBe('Camela en concierto')
      expect(result[0]?.sellMode).toBe(SellMode.ONLINE)
      expect(result[0]?.organizerCompanyId).toBe('2')
      expect(result[0]?.plans).toHaveLength(1)
      expect(result[0]?.plans?.[0]?.planId).toBe('291')
      expect(result[0]?.plans?.[0]?.zones).toHaveLength(2)
      expect(result[0]?.plans?.[0]?.minPrice).toBe(15)
      expect(result[0]?.plans?.[0]?.maxPrice).toBe(20)
    })

    it('should filter out offline events', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Online Event',
                plan: [],
              },
              {
                base_plan_id: '444',
                sell_mode: 'offline',
                title: 'Offline Event',
                plan: [],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result).toHaveLength(1)
      expect(result[0]?.basePlanId).toBe('291')
      expect(result[0]?.title).toBe('Online Event')
    })

    it('should handle multiple plans within a base plan', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '322',
                sell_mode: 'online',
                title: 'Multiple Sessions Event',
                plan: [
                  {
                    plan_id: '1642',
                    plan_start_date: '2021-02-10T20:00:00',
                    plan_end_date: '2021-02-10T21:30:00',
                    zone: [{ zone_id: '311', price: '55.00' }],
                  },
                  {
                    plan_id: '1643',
                    plan_start_date: '2021-02-11T20:00:00',
                    plan_end_date: '2021-02-11T21:30:00',
                    zone: [{ zone_id: '311', price: '55.00' }],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0].plans).toHaveLength(2)
      expect(result[0]?.plans?.[0]?.planId).toBe('1642')
      expect(result[0].plans![1].planId).toBe('1643')
    })

    it('should handle single plan object (not array)', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Single Plan Event',
                plan: {
                  plan_id: '291',
                  plan_start_date: '2021-06-30T21:00:00',
                  plan_end_date: '2021-06-30T22:00:00',
                  zone: { zone_id: '40', price: '20.00' },
                },
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0].plans).toHaveLength(1)
      expect(result[0]?.plans?.[0]?.planId).toBe('291')
    })

    it('should handle single zone object (not array)', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Single Zone Event',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: '2021-06-30T21:00:00',
                    plan_end_date: '2021-06-30T22:00:00',
                    zone: { zone_id: '40', price: '20.00', capacity: '100' },
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0]?.plans?.[0]?.zones).toHaveLength(1)
      expect(result[0]?.plans?.[0]?.zones?.[0].zoneId).toBe('40')
      expect(result[0]?.plans?.[0]?.zones?.[0].price).toBe(20)
      expect(result[0]?.plans?.[0]?.zones?.[0].capacity).toBe(100)
    })

    it('should calculate min and max prices correctly', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Multi Price Event',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: '2021-06-30T21:00:00',
                    plan_end_date: '2021-06-30T22:00:00',
                    zone: [
                      { zone_id: '1', price: '10.00' },
                      { zone_id: '2', price: '25.00' },
                      { zone_id: '3', price: '15.00' },
                      { zone_id: '4', price: '50.00' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0]?.plans?.[0]?.minPrice).toBe(10)
      expect(result[0]?.plans?.[0]?.maxPrice).toBe(50)
    })

    it('should handle empty base_plan array', () => {
      const data = {
        planList: {
          output: {
            base_plan: [],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result).toEqual([])
    })

    it('should handle missing planList', () => {
      const data = {}

      const result = transformer.transform(data)

      expect(result).toEqual([])
    })

    it('should handle invalid date strings', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Invalid Date Event',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: 'invalid-date',
                    plan_end_date: '2021-06-30T22:00:00',
                    zone: [{ zone_id: '40', price: '20.00' }],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result).toHaveLength(1)
      expect(result[0].plans).toHaveLength(1)
      // Should use current date as fallback
      expect(result[0]?.plans?.[0]?.planStartDate).toBeInstanceOf(Date)
    })

    it('should parse boolean strings correctly', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'Boolean Test Event',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: '2021-06-30T21:00:00',
                    plan_end_date: '2021-06-30T22:00:00',
                    sold_out: 'true',
                    zone: [
                      { zone_id: '40', price: '20.00', numbered: 'true' },
                      { zone_id: '41', price: '20.00', numbered: 'false' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0]?.plans?.[0]?.soldOut).toBe(true)
      expect(result[0]?.plans?.[0]?.zones?.[0].numbered).toBe(true)
      expect(result[0]?.plans?.[0]?.zones?.[1].numbered).toBe(false)
    })

    it('should handle null prices gracefully', () => {
      const data = {
        planList: {
          output: {
            base_plan: [
              {
                base_plan_id: '291',
                sell_mode: 'online',
                title: 'No Price Event',
                plan: [
                  {
                    plan_id: '291',
                    plan_start_date: '2021-06-30T21:00:00',
                    plan_end_date: '2021-06-30T22:00:00',
                    zone: [],
                  },
                ],
              },
            ],
          },
        },
      }

      const result = transformer.transform(data)

      expect(result[0]?.plans?.[0]?.minPrice).toBeNull()
      expect(result[0]?.plans?.[0]?.maxPrice).toBeNull()
    })
  })
})
