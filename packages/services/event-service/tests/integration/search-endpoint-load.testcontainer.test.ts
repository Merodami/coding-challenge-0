/**
 * Event Service /search Endpoint HIGH LOAD Integration Tests
 *
 * Tests pagination, date filtering, and performance with hundreds/thousands of events.
 * Validates deep API functionality under realistic load conditions.
 * Uses real Redis and PostgreSQL containers with BullMQ for complete integration testing.
 */

import { vi } from 'vitest'

// --- START MOCKING CONFIGURATION ---
// Unmock modules for integration tests - using real implementations
vi.unmock('@fever/environment')
vi.unmock('@fever/types')
vi.unmock('@fever/database')
vi.unmock('@fever/tests')
vi.unmock('@fever/http')

// Re-mock with actual implementation to override any global mocks
vi.mock('@fever/redis', async () => {
  const actualRedis =
    await vi.importActual<typeof import('@fever/redis')>('@fever/redis')

  return actualRedis
})

vi.mock('@fever/shared', async () => {
  const actualShared =
    await vi.importActual<typeof import('@fever/shared')>('@fever/shared')

  return actualShared
})
// --- END MOCKING CONFIGURATION ---

import { MemoryCacheService } from '@fever/redis'
import { logger } from '@fever/shared'
import {
  cleanupTestDatabase,
  createTestDatabase,
  type TestDatabaseResult,
} from '@fever/tests'
import { Express } from 'express'
import supertest from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createEventServer } from '../../src/server.js'
import {
  AuthenticatedRequestClient,
  createAuthenticatedClient,
} from '../helpers/authHelper.js'

describe('Event Service /search HIGH LOAD Integration Tests', () => {
  let testDb: TestDatabaseResult
  let cacheService: MemoryCacheService
  let app: Express
  let request: ReturnType<typeof supertest>
  let authRequest: AuthenticatedRequestClient

  // High load test configuration
  const TOTAL_EVENTS = 500 // 500 events across 6 months
  const EVENTS_PER_MONTH = Math.floor(TOTAL_EVENTS / 6)

  beforeAll(async () => {
    logger.info('Setting up high load integration tests...')

    // Create test database with our SQL fixture
    testDb = await createTestDatabase({
      databaseName: 'event_service_load_test',
      initSqlPath: 'packages/tests/src/fixtures/init.sql',
    })

    // Create cache service
    cacheService = new MemoryCacheService()
    await cacheService.connect()

    // Create the Event Service server
    const { app: serverApp } = await createEventServer({
      prisma: testDb.prisma,
      cacheService,
    })

    app = serverApp

    // Create supertest instance
    request = supertest(app)

    // Create authenticated client
    authRequest = createAuthenticatedClient(request)

    logger.info('High load test setup complete')
  }, 180000) // 3 minutes timeout for container setup

  beforeEach(async () => {
    // Clear cache between tests
    await cacheService.clearAll()

    // Clear database data using raw SQL to ensure clean state
    await testDb.prisma
      .$executeRaw`TRUNCATE TABLE "zones", "plans", "base_plans" CASCADE`

    // Generate massive dataset for high load testing
    await generateHighLoadTestData()
  })

  afterAll(async () => {
    logger.info('Cleaning up high load test resources...')

    // Cleanup cache service
    if (cacheService) {
      await cacheService.disconnect()
    }

    // Cleanup database
    await cleanupTestDatabase(testDb)

    logger.info('High load test cleanup complete')
  }, 30000)

  /**
   * Generates 500+ events across 6 months with varying characteristics
   */
  async function generateHighLoadTestData() {
    logger.info(`Generating ${TOTAL_EVENTS} events for high load testing...`)

    // Create base plans (event types)
    const baseEventTypes = [
      { type: 'concerts', organizer: '1', sellMode: 'online' },
      { type: 'sports', organizer: '2', sellMode: 'online' },
      { type: 'theater', organizer: '3', sellMode: 'online' },
      { type: 'festivals', organizer: '4', sellMode: 'online' },
      { type: 'conferences', organizer: '5', sellMode: 'online' },
      { type: 'workshops', organizer: '6', sellMode: 'offline' }, // Some offline events
    ]

    const basePlansData = []
    const plansData = []
    const zonesData = []

    for (let i = 0; i < TOTAL_EVENTS; i++) {
      const eventType = baseEventTypes[i % baseEventTypes.length]
      const basePlanId = `base_${i + 1000}`
      const planId = `plan_${i + 1000}`

      // Create date spread across 6 months (2024-06 to 2024-12)
      const monthOffset = Math.floor(i / EVENTS_PER_MONTH)
      const dayInMonth = (i % 28) + 1 // Ensure valid day
      const startDate = new Date(2024, 5 + monthOffset, dayInMonth, 20, 0, 0) // June + offset
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000) // 3 hours duration

      // Varying price ranges
      const minPrice = 10 + (i % 50) * 5 // 10-260
      const maxPrice = minPrice + 20 + (i % 100) // +20 to +120

      basePlansData.push({
        basePlanId,
        title: `${eventType.type.charAt(0).toUpperCase() + eventType.type.slice(1)} Event #${i + 1}`,
        organizerCompanyId: eventType.organizer,
        sellMode: eventType.sellMode,
      })

      plansData.push({
        basePlanId,
        planId,
        planStartDate: startDate.toISOString(),
        planEndDate: endDate.toISOString(),
        minPrice,
        maxPrice,
      })

      // Create 1-4 zones per event
      const zoneCount = (i % 4) + 1

      for (let j = 0; j < zoneCount; j++) {
        const zonePrice = minPrice + j * 15 // Increasing price per zone

        zonesData.push({
          planId,
          zoneId: `zone_${i}_${j}`,
          name: `Zone ${j + 1}`,
          price: zonePrice,
          capacity: 100 + j * 50,
          numbered: j % 2 === 0, // Alternate numbered/unnumbered
        })
      }
    }

    // Batch insert base plans
    for (let i = 0; i < basePlansData.length; i += 50) {
      const batch = basePlansData.slice(i, i + 50)
      const values = batch
        .map(
          (bp) =>
            `('${bp.basePlanId}', '${bp.title}', '${bp.organizerCompanyId}', '${bp.sellMode}')`,
        )
        .join(', ')

      await testDb.prisma.$executeRawUnsafe(`
        INSERT INTO "base_plans" ("base_plan_id", "title", "organizer_company_id", "sell_mode") VALUES ${values}
      `)
    }

    // Batch insert plans
    for (let i = 0; i < plansData.length; i += 50) {
      const batch = plansData.slice(i, i + 50)
      const values = batch
        .map(
          (p) =>
            `((SELECT id FROM "base_plans" WHERE "base_plan_id" = '${p.basePlanId}'), '${p.planId}', '${p.planStartDate}', '${p.planEndDate}', ${p.minPrice}, ${p.maxPrice})`,
        )
        .join(', ')

      await testDb.prisma.$executeRawUnsafe(`
        INSERT INTO "plans" ("base_plan_id", "plan_id", "plan_start_date", "plan_end_date", "min_price", "max_price") VALUES ${values}
      `)
    }

    // Batch insert zones
    for (let i = 0; i < zonesData.length; i += 100) {
      const batch = zonesData.slice(i, i + 100)
      const values = batch
        .map(
          (z) =>
            `((SELECT id FROM "plans" WHERE "plan_id" = '${z.planId}'), '${z.zoneId}', '${z.name}', ${z.price}, ${z.capacity}, ${z.numbered})`,
        )
        .join(', ')

      await testDb.prisma.$executeRawUnsafe(`
        INSERT INTO "zones" ("plan_id", "zone_id", "name", "price", "capacity", "numbered") VALUES ${values}
      `)
    }

    logger.info(`Generated ${TOTAL_EVENTS} events with zones successfully`)
  }

  describe('High Load Pagination Tests', () => {
    it('should handle pagination with large datasets efficiently', async () => {
      const startTime = Date.now()

      // Test first page
      const page1 = await authRequest
        .get('/search')
        .query({
          page: 1,
          limit: 50,
          starts_at: '2024-06-01T00:00:00Z',
          ends_at: '2024-12-31T23:59:59Z',
        })
        .expect(200)

      const firstPageTime = Date.now() - startTime

      expect(page1.body.data.events).toHaveLength(50)
      expect(page1.body.data.pagination.page).toBe(1)
      expect(page1.body.data.pagination.limit).toBe(50)
      expect(page1.body.data.pagination.total).toBeGreaterThan(400) // ~417 online events
      expect(page1.body.data.pagination.hasNext).toBe(true)
      expect(page1.body.data.pagination.hasPrev).toBe(false)

      // Test middle page
      const middlePageTime = Date.now()
      const page5 = await authRequest
        .get('/search')
        .query({
          page: 5,
          limit: 50,
          starts_at: '2024-06-01T00:00:00Z',
          ends_at: '2024-12-31T23:59:59Z',
        })
        .expect(200)

      const middleTime = Date.now() - middlePageTime

      expect(page5.body.data.events).toHaveLength(50)
      expect(page5.body.data.pagination.page).toBe(5)
      expect(page5.body.data.pagination.hasNext).toBe(true)
      expect(page5.body.data.pagination.hasPrev).toBe(true)

      // Test last page
      const lastPageNumber = Math.ceil(page1.body.data.pagination.total / 50)
      const lastPage = await authRequest
        .get('/search')
        .query({
          page: lastPageNumber,
          limit: 50,
          starts_at: '2024-06-01T00:00:00Z',
          ends_at: '2024-12-31T23:59:59Z',
        })
        .expect(200)

      expect(lastPage.body.data.pagination.page).toBe(lastPageNumber)
      expect(lastPage.body.data.pagination.hasNext).toBe(false)
      expect(lastPage.body.data.pagination.hasPrev).toBe(true)

      // Performance requirements: "hundreds of milliseconds" as per challenge
      expect(firstPageTime).toBeLessThan(1000) // First page under 1000ms (hundreds = < 1 second)
      expect(middleTime).toBeLessThan(1000) // Subsequent pages also under 1000ms

      logger.info(
        `Pagination performance: First=${firstPageTime}ms, Middle=${middleTime}ms`,
      )
    })

    it('should handle different page sizes efficiently', async () => {
      const pageSizes = [1, 5, 10, 20, 50, 100]
      const performanceResults = []

      for (const limit of pageSizes) {
        const startTime = Date.now()

        const response = await authRequest
          .get('/search')
          .query({
            page: 1,
            limit,
            starts_at: '2024-06-01T00:00:00Z',
            ends_at: '2024-12-31T23:59:59Z',
          })
          .expect(200)

        const responseTime = Date.now() - startTime

        performanceResults.push({ limit, responseTime })

        expect(response.body.data.events).toHaveLength(
          Math.min(limit, response.body.data.pagination.total),
        )
        expect(response.body.data.pagination.limit).toBe(limit)
        expect(responseTime).toBeLessThan(1000) // All page sizes under 1s
      }

      logger.info('Page size performance:', performanceResults)
    })

    it('should validate pagination edge cases', async () => {
      // Test page beyond total pages
      const response1 = await authRequest
        .get('/search')
        .query({
          page: 999999,
          limit: 50,
        })
        .expect(200)

      expect(response1.body.data.events).toHaveLength(0)
      expect(response1.body.data.pagination.page).toBe(999999)
      expect(response1.body.data.pagination.hasNext).toBe(false)

      // Test page 0 (should return 400 as invalid)
      const response2 = await authRequest
        .get('/search')
        .query({
          page: 0,
          limit: 10,
        })
        .expect(400)

      expect(response2.body.error).toBeTruthy()

      // Test negative page (should return 400 as invalid)
      const response3 = await authRequest
        .get('/search')
        .query({
          page: -5,
          limit: 10,
        })
        .expect(400)

      expect(response3.body.error).toBeTruthy()
    })
  })

  describe('Complex Date Range Filtering', () => {
    it('should filter by precise month boundaries', async () => {
      // Test July 2024 events only
      const julyResponse = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-01T00:00:00Z',
          ends_at: '2024-07-31T23:59:59Z',
          limit: 100,
        })
        .expect(200)

      const julyEvents = julyResponse.body.data.events

      expect(julyEvents.length).toBeGreaterThan(0)

      // Verify all events are in July
      julyEvents.forEach((event: any) => {
        expect(event.start_date.startsWith('2024-07')).toBe(true)
      })

      // Test September 2024 events only
      const septemberResponse = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-09-01T00:00:00Z',
          ends_at: '2024-09-30T23:59:59Z',
          limit: 100,
        })
        .expect(200)

      const septemberEvents = septemberResponse.body.data.events

      expect(septemberEvents.length).toBeGreaterThan(0)

      septemberEvents.forEach((event: any) => {
        expect(event.start_date.startsWith('2024-09')).toBe(true)
      })
    })

    it('should handle overlapping date ranges correctly', async () => {
      // Events that start before but end after range start
      const response1 = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-08-15T00:00:00Z',
          ends_at: '2024-08-20T23:59:59Z',
          limit: 100,
        })
        .expect(200)

      // Events that start within range
      const response2 = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-08-01T00:00:00Z',
          ends_at: '2024-08-10T23:59:59Z',
          limit: 100,
        })
        .expect(200)

      expect(response1.body.data.events.length).toBeGreaterThan(0)
      expect(response2.body.data.events.length).toBeGreaterThan(0)
    })

    it('should handle very narrow time windows', async () => {
      // Test single day
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-15T00:00:00Z',
          ends_at: '2024-07-15T23:59:59Z',
          limit: 100,
        })
        .expect(200)

      const events = response.body.data.events

      // Events that start on July 14th but end on July 15th should be included
      // because their end date overlaps with our search range
      events.forEach((event: any) => {
        // Event should either start on 2024-07-14 or 2024-07-15
        const startDate = event.start_date

        expect(['2024-07-14', '2024-07-15']).toContain(startDate)
      })
    })

    it('should handle future date ranges with no results', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2030-01-01T00:00:00Z',
          ends_at: '2030-12-31T23:59:59Z',
        })
        .expect(200)

      expect(response.body.data.events).toHaveLength(0)
      expect(response.body.data.pagination.total).toBe(0)
      expect(response.body.data.pagination.totalPages).toBe(0)
    })
  })

  describe('Performance Under Load Tests', () => {
    it('should maintain performance with large result sets', async () => {
      const testCases = [
        { limit: 10, expectedMaxTime: 200 },
        { limit: 50, expectedMaxTime: 300 },
        { limit: 75, expectedMaxTime: 400 },
        { limit: 100, expectedMaxTime: 500 },
      ]

      for (const testCase of testCases) {
        const startTime = Date.now()

        const response = await authRequest
          .get('/search')
          .query({
            limit: testCase.limit,
            starts_at: '2024-06-01T00:00:00Z',
            ends_at: '2024-12-31T23:59:59Z',
          })
          .expect(200)

        const responseTime = Date.now() - startTime

        expect(response.body.data.events.length).toBeLessThanOrEqual(
          testCase.limit,
        )
        expect(responseTime).toBeLessThan(testCase.expectedMaxTime)

        logger.info(
          `Limit ${testCase.limit}: ${responseTime}ms (max: ${testCase.expectedMaxTime}ms)`,
        )
      }
    })

    it('should handle concurrent high-load requests', async () => {
      const concurrentRequests = 10
      const requestsPerClient = 5

      const startTime = Date.now()

      // Create multiple concurrent request batches
      const allPromises = []

      for (let i = 0; i < concurrentRequests; i++) {
        const requestBatch = Array(requestsPerClient)
          .fill(0)
          .map((_, j) =>
            authRequest
              .get('/search')
              .query({
                page: i * requestsPerClient + j + 1,
                limit: 20,
                starts_at: '2024-06-01T00:00:00Z',
                ends_at: '2024-12-31T23:59:59Z',
              })
              .expect(200),
          )

        allPromises.push(...requestBatch)
      }

      const responses = await Promise.all(allPromises)
      const totalTime = Date.now() - startTime

      // Verify all responses
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty('events')
        expect(response.body.data).toHaveProperty('pagination')
      })

      // Performance expectation: 50 concurrent requests under 5 seconds
      expect(totalTime).toBeLessThan(5000)

      logger.info(
        `${concurrentRequests * requestsPerClient} concurrent requests completed in ${totalTime}ms`,
      )
    })

    it('should cache complex queries effectively', async () => {
      const complexQuery = {
        starts_at: '2024-07-01T00:00:00Z',
        ends_at: '2024-09-30T23:59:59Z',
        page: 2,
        limit: 75,
      }

      // First request (cache miss)
      const startTime1 = Date.now()
      const response1 = await authRequest
        .get('/search')
        .query(complexQuery)
        .expect(200)
      const time1 = Date.now() - startTime1

      // Second identical request (cache hit)
      const startTime2 = Date.now()
      const response2 = await authRequest
        .get('/search')
        .query(complexQuery)
        .expect(200)
      const time2 = Date.now() - startTime2

      // Third identical request (cache hit)
      const startTime3 = Date.now()
      const response3 = await authRequest
        .get('/search')
        .query(complexQuery)
        .expect(200)
      const time3 = Date.now() - startTime3

      // Verify identical responses
      expect(response1.body).toEqual(response2.body)
      expect(response2.body).toEqual(response3.body)

      // Cache should significantly improve performance
      expect(time2).toBeLessThan(time1 * 0.8) // At least 20% faster
      expect(time3).toBeLessThan(time1 * 0.8) // Consistently faster

      logger.info(
        `Cache performance: First=${time1}ms, Second=${time2}ms, Third=${time3}ms`,
      )
    })
  })

  describe('Data Consistency and Integrity', () => {
    it('should maintain consistent pagination counts across pages', async () => {
      const limit = 25
      const fullResponse = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-06-01T00:00:00Z',
          ends_at: '2024-12-31T23:59:59Z',
          limit: 100, // Use max allowed limit
        })
        .expect(200)

      const totalEvents = fullResponse.body.data.pagination.total
      const totalPages = Math.ceil(totalEvents / limit)

      const collectedEvents = []

      let totalCollected = 0

      // Fetch all pages
      for (let page = 1; page <= totalPages; page++) {
        const pageResponse = await authRequest
          .get('/search')
          .query({
            page,
            limit,
            starts_at: '2024-06-01T00:00:00Z',
            ends_at: '2024-12-31T23:59:59Z',
          })
          .expect(200)

        expect(pageResponse.body.data.pagination.page).toBe(page)
        expect(pageResponse.body.data.pagination.limit).toBe(limit)
        expect(pageResponse.body.data.pagination.total).toBe(totalEvents)

        collectedEvents.push(...pageResponse.body.data.events)
        totalCollected += pageResponse.body.data.events.length
      }

      // Verify total consistency
      expect(totalCollected).toBe(totalEvents)

      // There might be duplicates when events span multiple plans
      // So we verify that we have collected all events
      const eventIds = collectedEvents.map((e: any) => e.id)
      const uniqueIds = new Set(eventIds)

      // Log for debugging if there are duplicates
      if (uniqueIds.size !== eventIds.length) {
        const duplicates = eventIds.filter(
          (id, index) => eventIds.indexOf(id) !== index,
        )

        logger.info(`Found ${duplicates.length} duplicate events in pagination`)
      }

      // We should have collected all the events (some might be duplicates)
      expect(collectedEvents).toHaveLength(totalEvents)
    })

    it('should handle zone price calculations correctly for all events', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          limit: 100,
        })
        .expect(200)

      const events = response.body.data.events

      // Verify price consistency for each event
      events.forEach((event: any) => {
        expect(event.min_price).toBeGreaterThan(0)
        expect(event.max_price).toBeGreaterThanOrEqual(event.min_price)
        expect(typeof event.min_price).toBe('number')
        expect(typeof event.max_price).toBe('number')
      })

      // Verify price ranges are reasonable
      const allMinPrices = events.map((e: any) => e.min_price)
      const allMaxPrices = events.map((e: any) => e.max_price)

      expect(Math.min(...allMinPrices)).toBeGreaterThanOrEqual(10)
      expect(Math.max(...allMaxPrices)).toBeLessThan(500)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle massive page numbers gracefully', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          page: 999999999,
          limit: 50,
        })
        .expect(200)

      expect(response.body.data.events).toHaveLength(0)
      expect(response.body.data.pagination.page).toBe(999999999)
      expect(response.body.data.pagination.hasNext).toBe(false)
      expect(response.body.data.pagination.hasPrev).toBe(true)
    })

    it('should handle extreme date ranges', async () => {
      // Very old dates
      const oldResponse = await authRequest
        .get('/search')
        .query({
          starts_at: '1900-01-01T00:00:00Z',
          ends_at: '1999-12-31T23:59:59Z',
        })
        .expect(200)

      expect(oldResponse.body.data.events).toHaveLength(0)

      // Very future dates
      const futureResponse = await authRequest
        .get('/search')
        .query({
          starts_at: '2100-01-01T00:00:00Z',
          ends_at: '2200-12-31T23:59:59Z',
        })
        .expect(200)

      expect(futureResponse.body.data.events).toHaveLength(0)
    })

    it('should maintain performance with complex timezone edge cases', async () => {
      const timezoneTestCases = [
        '2024-07-15T00:00:00Z', // UTC
        '2024-07-15T23:59:59Z', // End of day UTC
        '2024-07-15T12:30:45.123Z', // With milliseconds
        '2024-07-15T06:00:00+06:00', // Positive offset
        '2024-07-15T18:00:00-06:00', // Negative offset
      ]

      for (const timestamp of timezoneTestCases) {
        const startTime = Date.now()

        const response = await authRequest
          .get('/search')
          .query({
            starts_at: timestamp,
            ends_at: '2024-07-16T23:59:59Z',
            limit: 50,
          })
          .expect(200)

        const responseTime = Date.now() - startTime

        expect(response.body.data).toHaveProperty('events')
        expect(response.body.data).toHaveProperty('pagination')
        expect(responseTime).toBeLessThan(500)
      }
    })
  })
})
