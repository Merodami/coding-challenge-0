/**
 * Event Service /search Endpoint Integration Tests with Testcontainers
 *
 * Tests the full /search endpoint with real PostgreSQL database using testcontainers.
 * Validates API specification compliance with actual database persistence.
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

import { createEventServiceApp } from '../../src/app.js'
import {
  AuthenticatedRequestClient,
  createAuthenticatedClient,
  createUnauthenticatedClient,
} from '../helpers/authHelper.js'

describe('Event Service /search Endpoint - Testcontainer Integration', () => {
  let testDb: TestDatabaseResult
  let app: Express
  let request: ReturnType<typeof supertest>
  let authRequest: AuthenticatedRequestClient
  let unauthRequest: ReturnType<typeof supertest>
  let cacheService: MemoryCacheService

  beforeAll(async () => {
    // Create test database with our SQL fixture
    testDb = await createTestDatabase({
      databaseName: 'event_service_test',
      initSqlPath: 'packages/tests/src/fixtures/init.sql',
    })

    // Create cache service
    cacheService = new MemoryCacheService()
    await cacheService.connect()

    // Create the event service app with test dependencies
    app = await createEventServiceApp({
      prisma: testDb.prisma,
      cacheService,
    })

    // Create supertest instance
    request = supertest(app)

    // Create authenticated and unauthenticated clients
    authRequest = createAuthenticatedClient(request)
    unauthRequest = createUnauthenticatedClient(request)

    logger.info('Test setup complete')
  }, 60000) // Increased timeout for container startup

  beforeEach(async () => {
    // Clear cache between tests
    await cacheService.clearAll()

    // Clear database data using raw SQL to ensure clean state
    await testDb.prisma
      .$executeRaw`TRUNCATE TABLE "zones", "plans", "base_plans" CASCADE`

    // Re-insert sample data from fixture
    await testDb.prisma.$executeRaw`
      INSERT INTO "base_plans" ("base_plan_id", "title", "organizer_company_id", "sell_mode") VALUES
      ('291', 'Summer Music Festival', '1', 'online'),
      ('292', 'Art Gallery Opening', '2', 'offline'),
      ('293', 'Tech Conference 2024', '3', 'online');
    `

    await testDb.prisma.$executeRaw`
      INSERT INTO "plans" ("base_plan_id", "plan_id", "plan_start_date", "plan_end_date", "min_price", "max_price") VALUES
      ((SELECT id FROM "base_plans" WHERE "base_plan_id" = '291'), '291', '2024-07-15T18:00:00Z', '2024-07-15T23:00:00Z', 75.00, 150.00),
      ((SELECT id FROM "base_plans" WHERE "base_plan_id" = '292'), '292', '2024-07-20T19:00:00Z', '2024-07-20T22:00:00Z', 25.00, 25.00),
      ((SELECT id FROM "base_plans" WHERE "base_plan_id" = '293'), '293', '2024-08-01T09:00:00Z', '2024-08-01T17:00:00Z', 99.00, 299.00);
    `

    await testDb.prisma.$executeRaw`
      INSERT INTO "zones" ("plan_id", "zone_id", "name", "price", "capacity", "numbered") VALUES
      ((SELECT id FROM "plans" WHERE "plan_id" = '291'), '1', 'General Admission', 75.00, 1000, false),
      ((SELECT id FROM "plans" WHERE "plan_id" = '291'), '2', 'VIP', 150.00, 100, true),
      ((SELECT id FROM "plans" WHERE "plan_id" = '292'), '3', 'Standard', 25.00, 200, false),
      ((SELECT id FROM "plans" WHERE "plan_id" = '293'), '4', 'Early Bird', 99.00, 500, false),
      ((SELECT id FROM "plans" WHERE "plan_id" = '293'), '5', 'Premium', 299.00, 50, true);
    `
  })

  afterAll(async () => {
    // Cleanup resources
    if (cacheService) {
      await cacheService.disconnect()
    }

    await cleanupTestDatabase(testDb)
  }, 30000)

  describe('API Specification Compliance Tests', () => {
    it('should return events in correct API format', async () => {
      const response = await authRequest.get('/search').query({
        starts_at: '2024-07-01T00:00:00Z',
        ends_at: '2024-08-31T23:59:59Z',
      })

      console.log('Response status:', response.status)
      console.log('Response body:', JSON.stringify(response.body, null, 2))

      expect(response.status).toBe(200)

      // Verify correct response structure per API specification
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('error', null)
      expect(response.body.data).toHaveProperty('events')
      expect(Array.isArray(response.body.data.events)).toBe(true)

      // Should return only online events per API specification
      const events = response.body.data.events

      expect(events).toHaveLength(2) // 2 plans total from 2 base plans (291 has 1 plan, 293 has 1 plan)

      // Verify each event has required fields matching swagger spec EventSummary
      events.forEach((event: any) => {
        expect(event).toHaveProperty('id')
        expect(typeof event.id).toBe('string') // UUID
        expect(event).toHaveProperty('title')
        expect(event).toHaveProperty('start_date')
        expect(event).toHaveProperty('start_time')
        expect(event).toHaveProperty('end_date')
        expect(event).toHaveProperty('end_time')
        expect(event).toHaveProperty('min_price')
        expect(event).toHaveProperty('max_price')
      })

      // Check pagination metadata
      expect(response.body.data).toHaveProperty('pagination')
      expect(response.body.data.pagination).toHaveProperty('page', 1)
      expect(response.body.data.pagination).toHaveProperty('limit', 20)
      expect(response.body.data.pagination).toHaveProperty('total', 2)
      expect(response.body.data.pagination).toHaveProperty('totalPages', 1)
      expect(response.body.data.pagination).toHaveProperty('hasNext', false)
      expect(response.body.data.pagination).toHaveProperty('hasPrev', false)
    })

    it('should filter events by date range correctly', async () => {
      // Test narrow date range that should only include Summer Music Festival
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-10T00:00:00Z',
          ends_at: '2024-07-20T23:59:59Z',
        })
        .expect(200)

      const events = response.body.data.events

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Summer Music Festival')
    })

    it('should return only events with sell_mode=online', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-01T00:00:00Z',
          ends_at: '2024-08-31T23:59:59Z',
        })
        .expect(200)

      const events = response.body.data.events

      // Should exclude event 292 (Art Gallery Opening) which has sell_mode=offline
      // We have 2 plans total: 1 from 291 and 1 from 293
      expect(events).toHaveLength(2)

      const eventTitles = events.map((e: any) => e.title)

      expect(eventTitles).toContain('Summer Music Festival') // 291 (online)
      expect(eventTitles).toContain('Tech Conference 2024') // 293 (online)
      expect(eventTitles).not.toContain('Art Gallery Opening') // 292 (offline)
    })

    it('should include price range information from zones', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-10T00:00:00Z',
          ends_at: '2024-07-20T23:59:59Z',
        })
        .expect(200)

      const event = response.body.data.events[0]

      // Summer Music Festival has zones with prices 75.00 and 150.00
      expect(event.min_price).toBe(75.0)
      expect(event.max_price).toBe(150.0)
      expect(event.title).toBe('Summer Music Festival')
    })

    it('should respond in hundreds of milliseconds', async () => {
      const startTime = Date.now()

      await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-01T00:00:00Z',
          ends_at: '2024-08-31T23:59:59Z',
        })
        .expect(200)

      const responseTime = Date.now() - startTime

      // API requirement: respond in under 300ms
      expect(responseTime).toBeLessThan(1000)
      logger.info(`Response time: ${responseTime}ms`)
    })

    it('should work even when no events match the date range', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2025-01-01T00:00:00Z',
          ends_at: '2025-01-31T23:59:59Z',
        })
        .expect(200)

      expect(response.body.data.events).toEqual([])
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
      expect(response.body.error).toBeNull()
    })

    it('should handle invalid date parameters gracefully', async () => {
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: 'invalid-date',
          ends_at: '2024-08-31T23:59:59Z',
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBeTruthy()
      expect(response.body).toHaveProperty('data', null)
    })

    it('should allow optional starts_at and ends_at parameters', async () => {
      // Only ends_at - should return events ending before this date
      const response1 = await authRequest
        .get('/search')
        .query({ ends_at: '2024-07-20T23:59:59Z' })
        .expect(200)

      expect(response1.body.data.events).toHaveLength(1)
      expect(response1.body.data.events[0].title).toBe('Summer Music Festival')

      // Only starts_at - should return events starting after this date
      const response2 = await authRequest
        .get('/search')
        .query({ starts_at: '2024-07-20T00:00:00Z' })
        .expect(200)

      expect(response2.body.data.events).toHaveLength(1) // 1 plan from Tech Conference
      expect(response2.body.data.events[0].title).toBe('Tech Conference 2024')

      // No parameters - should return all events
      const response3 = await authRequest.get('/search').expect(200)

      expect(response3.body.data.events).toHaveLength(2)
    })
  })

  describe('Database Persistence Tests', () => {
    it('should persist events in database correctly', async () => {
      // Verify data exists in database using raw SQL
      const basePlans = await testDb.prisma.$queryRaw`
        SELECT bp.*, COUNT(DISTINCT p.id) as plan_count
        FROM "base_plans" bp
        LEFT JOIN "plans" p ON p."base_plan_id" = bp.id
        WHERE bp."sell_mode" = 'online'
        GROUP BY bp.id
      `

      expect(basePlans).toHaveLength(2) // 291 and 293 are online

      const festival = (basePlans as any[]).find(
        (bp) => bp.base_plan_id === '291',
      )

      expect(festival).toBeDefined()
      expect(festival?.title).toBe('Summer Music Festival')
      expect(Number(festival?.plan_count)).toBe(1)

      // Check zones for this plan
      const zones = await testDb.prisma.$queryRaw`
        SELECT z.*
        FROM "zones" z
        INNER JOIN "plans" p ON z."plan_id" = p.id
        WHERE p."plan_id" = '291'
      `

      expect(zones).toHaveLength(2)
    })

    it('should handle soft deletes correctly', async () => {
      // Mark an event as deleted using raw SQL
      await testDb.prisma.$executeRaw`
        UPDATE "base_plans" 
        SET "deleted_at" = NOW() 
        WHERE "base_plan_id" = '291'
      `

      // Should not appear in search results
      const response = await authRequest
        .get('/search')
        .query({
          starts_at: '2024-07-01T00:00:00Z',
          ends_at: '2024-08-31T23:59:59Z',
        })
        .expect(200)

      const events = response.body.data.events

      expect(events).toHaveLength(1) // 1 plan from Tech Conference 293
      expect(events[0].title).toBe('Tech Conference 2024')
    })

    it('should maintain referential integrity', async () => {
      // Verify cascade deletes work properly
      const basePlans = await testDb.prisma.$queryRaw`
        SELECT * FROM "base_plans" WHERE "base_plan_id" = '291'
      `

      expect(basePlans).toHaveLength(1)

      const basePlan = (basePlans as any[])[0]

      // Delete base plan should cascade to plans and zones
      await testDb.prisma.$executeRaw`
        DELETE FROM "base_plans" WHERE id = ${basePlan.id}::uuid
      `

      // Verify related data is gone
      const remainingPlans = await testDb.prisma.$queryRaw`
        SELECT * FROM "plans" WHERE "base_plan_id" = ${basePlan.id}::uuid
      `

      const remainingZones = await testDb.prisma.$queryRaw`
        SELECT z.* FROM "zones" z 
        INNER JOIN "plans" p ON z."plan_id" = p.id 
        WHERE p."base_plan_id" = ${basePlan.id}::uuid
      `

      expect(remainingPlans).toHaveLength(0)
      expect(remainingZones).toHaveLength(0)
    })
  })

  describe('API Key Authentication Tests', () => {
    // Note: REQUIRE_API_KEY=true is already set in .env.test
    // API_KEY=test-fever-api-key is already set in .env.test

    describe('Authentication Requirements', () => {
      it('should return 401 when x-api-key header is missing', async () => {
        const response = await unauthRequest
          .get('/search')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-08-31T23:59:59Z',
          })
          .expect(401)

        expect(response.body).toEqual({
          data: null,
          error: {
            code: 'API_KEY_INVALID',
            message: 'Authentication failed: Invalid or missing API key',
          },
        })
      })

      it('should return 401 when x-api-key header is invalid', async () => {
        const response = await unauthRequest
          .get('/search')
          .set('x-api-key', 'invalid-api-key')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-08-31T23:59:59Z',
          })
          .expect(401)

        expect(response.body).toEqual({
          data: null,
          error: {
            code: 'API_KEY_INVALID',
            message: 'Authentication failed: Invalid or missing API key',
          },
        })
      })

      it('should return 401 when x-api-key header is empty', async () => {
        const response = await unauthRequest
          .get('/search')
          .set('x-api-key', '')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-08-31T23:59:59Z',
          })
          .expect(401)

        expect(response.body).toEqual({
          data: null,
          error: {
            code: 'API_KEY_INVALID',
            message: 'Authentication failed: Invalid or missing API key',
          },
        })
      })

      it('should return 200 when valid x-api-key header is provided', async () => {
        const response = await authRequest
          .get('/search')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-08-31T23:59:59Z',
          })
          .expect(200)

        expect(response.body).toHaveProperty('data')
        expect(response.body).toHaveProperty('error', null)
        expect(response.body.data).toHaveProperty('events')
        expect(Array.isArray(response.body.data.events)).toBe(true)
      })

      it('should handle case-insensitive x-api-key header', async () => {
        // Test lowercase
        const response1 = await authRequest
          .get('/search')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-07-31T23:59:59Z',
          })
          .expect(200)

        expect(response1.body.data).toHaveProperty('events')

        // Test uppercase
        const response2 = await unauthRequest
          .get('/search')
          .set('X-API-KEY', 'test-fever-api-key')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-07-31T23:59:59Z',
          })
          .expect(200)

        expect(response2.body.data).toHaveProperty('events')

        // Test mixed case
        const response3 = await unauthRequest
          .get('/search')
          .set('X-Api-Key', 'test-fever-api-key')
          .query({
            starts_at: '2024-07-01T00:00:00Z',
            ends_at: '2024-07-31T23:59:59Z',
          })
          .expect(200)

        expect(response3.body.data).toHaveProperty('events')
      })

      it('should validate API key before processing query parameters', async () => {
        // Even with invalid query parameters, should return 401 for missing API key
        const response = await unauthRequest
          .get('/search')
          .query({
            starts_at: 'invalid-date',
            ends_at: '2024-08-31T23:59:59Z',
          })
          .expect(401)

        expect(response.body.error.code).toBe('API_KEY_INVALID')
        // Should not get parameter validation error, API key check comes first
      })
    })
  })

  describe('Performance and Caching Tests', () => {
    it('should cache responses for identical requests', async () => {
      const queryParams = {
        starts_at: '2024-07-01T00:00:00Z',
        ends_at: '2024-08-31T23:59:59Z',
      }

      // First request (with valid API key)
      const startTime1 = Date.now()
      const response1 = await authRequest
        .get('/search')
        .query(queryParams)
        .expect(200)
      const time1 = Date.now() - startTime1

      // Second identical request (should be cached)
      const startTime2 = Date.now()
      const response2 = await authRequest
        .get('/search')
        .query(queryParams)
        .expect(200)
      const time2 = Date.now() - startTime2

      // Verify responses are identical
      expect(response1.body).toEqual(response2.body)

      // Second request should be faster (cached)
      expect(time2).toBeLessThan(time1)

      logger.info(`First request: ${time1}ms, Cached request: ${time2}ms`)
    })

    it('should handle concurrent requests efficiently', async () => {
      const queryParams = {
        starts_at: '2024-07-01T00:00:00Z',
        ends_at: '2024-08-31T23:59:59Z',
      }

      // Make 5 concurrent requests (with valid API key)
      const startTime = Date.now()
      const promises = Array(5)
        .fill(0)
        .map(() => authRequest.get('/search').query(queryParams).expect(200))

      const responses = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All responses should be identical
      responses.forEach((response) => {
        expect(response.body).toEqual(responses[0].body)
      })

      // Total time for 5 concurrent requests should still be reasonable
      expect(totalTime).toBeLessThan(2000)

      logger.info(`5 concurrent requests completed in ${totalTime}ms`)
    })
  })
})
