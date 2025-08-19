/**
 * XMLParser Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ensure @fever/shared is not mocked for these tests
vi.unmock('@fever/shared')
vi.unmock('@fever/environment')
vi.unmock('fast-xml-parser')

import { XMLParser } from '../../../src/providers/xml/XMLParser.js'

describe('XMLParser', () => {
  let parser: XMLParser

  beforeEach(() => {
    parser = new XMLParser()
  })

  describe('parse', () => {
    it('should parse valid plan XML successfully', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">
          <output>
            <base_plan base_plan_id="291" sell_mode="online" title="Camela en concierto">
              <plan plan_start_date="2021-06-30T21:00:00" plan_end_date="2021-06-30T22:00:00" plan_id="291">
                <zone zone_id="40" capacity="243" price="20.00" name="Platea" numbered="true" />
              </plan>
            </base_plan>
          </output>
        </planList>
      `

      const result = await parser.parse(xml)

      expect(result).toBeDefined()
      expect(result.planList).toBeDefined()
      expect(result.planList.output).toBeDefined()
      expect(result.planList.output.base_plan).toBeInstanceOf(Array)
      expect(result.planList.output.base_plan[0].base_plan_id).toBe('291')
      expect(result.planList.output.base_plan[0].sell_mode).toBe('online')
      expect(result.planList.output.base_plan[0].title).toBe(
        'Camela en concierto',
      )
    })

    it('should handle multiple base plans', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList>
          <output>
            <base_plan base_plan_id="291" sell_mode="online" title="Event 1">
              <plan plan_id="291" plan_start_date="2021-06-30T21:00:00" plan_end_date="2021-06-30T22:00:00">
                <zone zone_id="40" price="20.00" />
              </plan>
            </base_plan>
            <base_plan base_plan_id="322" sell_mode="online" title="Event 2">
              <plan plan_id="1642" plan_start_date="2021-07-01T20:00:00" plan_end_date="2021-07-01T21:30:00">
                <zone zone_id="311" price="55.00" />
              </plan>
            </base_plan>
          </output>
        </planList>
      `

      const result = await parser.parse(xml)

      expect(result.planList.output.base_plan).toHaveLength(2)
      expect(result.planList.output.base_plan[0].base_plan_id).toBe('291')
      expect(result.planList.output.base_plan[1].base_plan_id).toBe('322')
    })

    it('should handle multiple plans within a base plan', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList>
          <output>
            <base_plan base_plan_id="322" sell_mode="online" title="Pantomima Full">
              <plan plan_id="1642" plan_start_date="2021-02-10T20:00:00" plan_end_date="2021-02-10T21:30:00">
                <zone zone_id="311" price="55.00" />
              </plan>
              <plan plan_id="1643" plan_start_date="2021-02-11T20:00:00" plan_end_date="2021-02-11T21:30:00">
                <zone zone_id="311" price="55.00" />
              </plan>
            </base_plan>
          </output>
        </planList>
      `

      const result = await parser.parse(xml)

      const basePlan = result.planList.output.base_plan[0]

      expect(basePlan.plan).toBeInstanceOf(Array)
      expect(basePlan.plan).toHaveLength(2)
      expect(basePlan.plan[0].plan_id).toBe('1642')
      expect(basePlan.plan[1].plan_id).toBe('1643')
    })

    it('should handle multiple zones within a plan', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList>
          <output>
            <base_plan base_plan_id="291" sell_mode="online" title="Test Event">
              <plan plan_id="291" plan_start_date="2021-06-30T21:00:00" plan_end_date="2021-06-30T22:00:00">
                <zone zone_id="40" capacity="243" price="20.00" name="Platea" numbered="true" />
                <zone zone_id="38" capacity="100" price="15.00" name="Grada 2" numbered="false" />
                <zone zone_id="30" capacity="90" price="30.00" name="A28" numbered="true" />
              </plan>
            </base_plan>
          </output>
        </planList>
      `

      const result = await parser.parse(xml)

      const zones = result.planList.output.base_plan[0].plan[0].zone

      expect(zones).toBeInstanceOf(Array)
      expect(zones).toHaveLength(3)
      expect(zones[0].zone_id).toBe('40')
      expect(zones[0].price).toBe('20.00')
      expect(zones[1].zone_id).toBe('38')
      expect(zones[1].price).toBe('15.00')
      expect(zones[2].zone_id).toBe('30')
      expect(zones[2].price).toBe('30.00')
    })

    it('should handle empty planList', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList>
          <output></output>
        </planList>
      `

      const result = await parser.parse(xml)

      expect(result).toBeDefined()
      expect(result.planList).toBeDefined()
      expect(result.planList.output).toBeDefined()
    })

    it('should throw error for invalid XML', async () => {
      const invalidXml = 'This is not valid XML <unclosed tag'

      await expect(parser.parse(invalidXml)).rejects.toThrow(
        "External service 'XMLParser' failed during parse: Invalid XML response",
      )
    })

    it('should handle offline sell_mode plans', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <planList>
          <output>
            <base_plan base_plan_id="444" sell_mode="offline" title="Offline Event">
              <plan plan_id="1642" plan_start_date="2021-09-30T20:00:00" plan_end_date="2021-09-30T21:00:00">
                <zone zone_id="7" capacity="22" price="65.00" numbered="false" />
              </plan>
            </base_plan>
          </output>
        </planList>
      `

      const result = await parser.parse(xml)

      expect(result.planList.output.base_plan[0].sell_mode).toBe('offline')
    })
  })

  describe('safeParse', () => {
    it('should return fallback structure on error', async () => {
      const invalidXml = 'invalid xml'

      const result = await parser.safeParse(invalidXml)

      expect(result).toBeDefined()
      expect(result).toEqual({
        planList: {
          output: {
            base_plan: [],
          },
        },
      })
    })
  })
})
