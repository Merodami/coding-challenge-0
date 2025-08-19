#!/usr/bin/env tsx

/**
 * Generate Test Data for Performance Testing
 *
 * Creates XML files with varying numbers of events and zones
 * to test the system's ability to handle large datasets
 *
 * Usage:
 * tsx generate-test-data.ts --events 10000 --zones 100
 */

import { faker } from '@faker-js/faker'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { parseArgs } from 'util'

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    events: {
      type: 'string',
      default: '1000',
    },
    zones: {
      type: 'string',
      default: '10',
    },
    output: {
      type: 'string',
      default: 'generated-events.xml',
    },
  },
})

const numEvents = parseInt(values.events as string, 10)
const numZones = parseInt(values.zones as string, 10)
const outputFile = values.output as string

console.log(
  `Generating ${numEvents} events with up to ${numZones} zones each...`,
)

interface Zone {
  zone_id: string
  capacity: number
  price: string
  name: string
  numbered: boolean
}

interface Plan {
  plan_start_date: string
  plan_end_date: string
  plan_id: string
  sell_from: string
  sell_to: string
  sold_out: boolean
  zones: Zone[]
}

interface BasePlan {
  base_plan_id: string
  sell_mode: string
  title: string
  organizer_company_id?: string
  plans: Plan[]
}

/**
 * Generate a random zone
 */
function generateZone(): Zone {
  return {
    zone_id: `${faker.number.int({ min: 1, max: 9999 })}`,
    capacity: faker.number.int({ min: 10, max: 1000 }),
    price: faker.commerce.price({ min: 10, max: 500, dec: 2 }),
    name: faker.helpers.arrayElement([
      'VIP',
      'General',
      'Balcony',
      'Orchestra',
      'Mezzanine',
      'Gallery',
      'Standing',
      'Seated',
      'Premium',
      'Standard',
      `Section ${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 1, max: 99 })}`,
    ]),
    numbered: faker.datatype.boolean(),
  }
}

/**
 * Generate a random plan (session)
 */
function generatePlan(basePlanId: string, index: number): Plan {
  const startDate = faker.date.between({
    from: '2021-01-01',
    to: '2021-12-31',
  })

  const endDate = new Date(startDate)

  endDate.setHours(endDate.getHours() + faker.number.int({ min: 1, max: 4 }))

  const sellFrom = new Date(startDate)

  sellFrom.setMonth(sellFrom.getMonth() - faker.number.int({ min: 1, max: 6 }))

  const sellTo = new Date(startDate)

  sellTo.setHours(sellTo.getHours() - 1)

  const zonesCount = faker.number.int({ min: 1, max: Math.min(numZones, 20) })
  const zones: Zone[] = []

  for (let i = 0; i < zonesCount; i++) {
    zones.push(generateZone())
  }

  return {
    plan_start_date: startDate.toISOString().slice(0, 19),
    plan_end_date: endDate.toISOString().slice(0, 19),
    plan_id: `${basePlanId}-${index}`,
    sell_from: sellFrom.toISOString().slice(0, 19),
    sell_to: sellTo.toISOString().slice(0, 19),
    sold_out: faker.datatype.boolean({ probability: 0.1 }),
    zones,
  }
}

/**
 * Generate a random base plan (event)
 */
function generateBasePlan(index: number): BasePlan {
  const basePlanId = `${index + 1000}`
  const plansCount = faker.number.int({ min: 1, max: 5 })
  const plans: Plan[] = []

  for (let i = 0; i < plansCount; i++) {
    plans.push(generatePlan(basePlanId, i + 1))
  }

  return {
    base_plan_id: basePlanId,
    sell_mode: faker.helpers.arrayElement(['online', 'offline', 'both']),
    title: faker.helpers.arrayElement([
      `${faker.music.artist()} Live`,
      `${faker.company.name()} Conference`,
      faker.commerce.productName(),
      `${faker.word.adjective()} ${faker.word.noun()} Festival`,
      `${faker.person.fullName()} Comedy Show`,
      `${faker.location.city()} Marathon`,
    ]),
    organizer_company_id: faker.datatype.boolean()
      ? faker.number.int({ min: 1, max: 100 }).toString()
      : undefined,
    plans,
  }
}

/**
 * Convert a zone to XML
 */
function zoneToXml(zone: Zone): string {
  return `            <zone zone_id="${zone.zone_id}" capacity="${zone.capacity}" price="${zone.price}" name="${zone.name}" numbered="${zone.numbered}" />`
}

/**
 * Convert a plan to XML
 */
function planToXml(plan: Plan): string {
  const zonesXml = plan.zones.map(zoneToXml).join('\n')

  return `         <plan plan_start_date="${plan.plan_start_date}" plan_end_date="${plan.plan_end_date}" plan_id="${plan.plan_id}" sell_from="${plan.sell_from}" sell_to="${plan.sell_to}" sold_out="${plan.sold_out}">
${zonesXml}
         </plan>`
}

/**
 * Convert a base plan to XML
 */
function basePlanToXml(basePlan: BasePlan): string {
  const plansXml = basePlan.plans.map(planToXml).join('\n')
  const orgAttr = basePlan.organizer_company_id
    ? ` organizer_company_id="${basePlan.organizer_company_id}"`
    : ''

  return `      <base_plan base_plan_id="${basePlan.base_plan_id}" sell_mode="${basePlan.sell_mode}"${orgAttr} title="${basePlan.title}">
${plansXml}
      </base_plan>`
}

/**
 * Generate the complete XML
 */
function generateXml(): string {
  const basePlans: BasePlan[] = []

  for (let i = 0; i < numEvents; i++) {
    basePlans.push(generateBasePlan(i))

    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} events...`)
    }
  }

  const basePlansXml = basePlans.map(basePlanToXml).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<planList xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0" xsi:noNamespaceSchemaLocation="planList.xsd">
   <output>
${basePlansXml}
   </output>
</planList>`
}

// Generate and save the XML
const xml = generateXml()
const outputPath = join(
  __dirname,
  '..',
  'fixtures',
  'provider-responses',
  outputFile,
)

// eslint-disable-next-line security/detect-non-literal-fs-filename
writeFileSync(outputPath, xml, 'utf-8')

// Calculate statistics
const xmlSize = Buffer.byteLength(xml, 'utf-8')
const xmlSizeMB = (xmlSize / 1024 / 1024).toFixed(2)

console.log(`✅ Generated ${outputFile}`)
console.log(`   Events: ${numEvents}`)
console.log(`   Max zones per plan: ${numZones}`)
console.log(`   File size: ${xmlSizeMB} MB`)
console.log(`   Path: ${outputPath}`)
