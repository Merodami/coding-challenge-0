/**
 * Integration tests for internal sync routes
 * Tests /internal/sync and /internal/sync/status endpoints
 */

import { initializeCache } from '@fever/redis'
import {
  cleanupTestDatabase,
  createTestDatabase,
  type TestDatabaseResult,
} from '@fever/tests'
import type { Express } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createEventServiceApp } from '../../src/app.js'

describe.skip('Internal Routes Integration Tests', () => {
  let app: Express
  let testDb: TestDatabaseResult

  const SERVICE_API_KEY = 'test-service-key-123'

  beforeAll(async () => {
    // Set SERVICE_API_KEY for testing
    process.env.SERVICE_API_KEY = SERVICE_API_KEY

    // Setup test database
    testDb = await createTestDatabase()

    // Initialize cache
    const cacheService = await initializeCache()

    // Create app
    app = await createEventServiceApp({
      prisma: testDb.prisma,
      cacheService,
    })
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDb)
  })

  describe('POST /internal/sync', () => {
    describe('Authentication', () => {
      it('should return 401 when x-service-api-key header is missing', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .send({ force: true })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({
          success: false,
          error: {
            code: 'SERVICE_API_KEY_INVALID',
            message:
              'Authentication failed: Invalid or missing service API key',
          },
        })
      })

      it('should return 401 when x-service-api-key is invalid', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', 'invalid-key')
          .send({ force: true })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({
          success: false,
          error: {
            code: 'SERVICE_API_KEY_INVALID',
            message:
              'Authentication failed: Invalid or missing service API key',
          },
        })
      })

      it('should accept valid x-service-api-key', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: true })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('jobId')
        expect(response.body).toHaveProperty('message')
        expect(response.body).toHaveProperty('timestamp')
      })
    })

    describe('Request Validation', () => {
      it('should accept empty body', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({})

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      it('should accept force parameter', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: true })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.jobId).toBeDefined()
      })

      it('should accept priority parameter', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({
            force: true,
            priority: 5,
          })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      it('should accept delay parameter', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({
            force: true,
            delay: 5000,
          })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      it('should reject invalid priority', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ priority: 15 }) // Max is 10

        expect(response.status).toBe(400)
      })

      it('should reject negative delay', async () => {
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ delay: -1000 })

        expect(response.status).toBe(400)
      })
    })

    describe('Queue Behavior', () => {
      it('should return "skipped" when job already exists without force', async () => {
        // First request to create a job
        await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: true })

        // Second request without force should skip
        const response = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: false })

        expect(response.status).toBe(200)
        expect(response.body.jobId).toBe('skipped')
        expect(response.body.message).toBe('Job already in queue')
      })

      it('should create new job when force is true even if job exists', async () => {
        // First request
        const response1 = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: true })

        // Second request with force
        const response2 = await request(app)
          .post('/internal/sync')
          .set('x-service-api-key', SERVICE_API_KEY)
          .send({ force: true })

        expect(response2.status).toBe(200)
        expect(response2.body.jobId).not.toBe('skipped')
        expect(response2.body.jobId).not.toBe(response1.body.jobId)
      })
    })
  })

  describe('GET /internal/sync/status', () => {
    describe('Authentication', () => {
      it('should return 401 when x-service-api-key header is missing', async () => {
        const response = await request(app).get('/internal/sync/status')

        expect(response.status).toBe(401)
        expect(response.body).toEqual({
          success: false,
          error: {
            code: 'SERVICE_API_KEY_INVALID',
            message:
              'Authentication failed: Invalid or missing service API key',
          },
        })
      })

      it('should return 401 when x-service-api-key is invalid', async () => {
        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', 'invalid-key')

        expect(response.status).toBe(401)
        expect(response.body).toEqual({
          success: false,
          error: {
            code: 'SERVICE_API_KEY_INVALID',
            message:
              'Authentication failed: Invalid or missing service API key',
          },
        })
      })

      it('should accept valid x-service-api-key', async () => {
        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', SERVICE_API_KEY)

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('queue')
      })
    })

    describe('Response Structure', () => {
      it('should return queue statistics', async () => {
        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', SERVICE_API_KEY)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.queue).toHaveProperty('waiting')
        expect(response.body.queue).toHaveProperty('active')
        expect(response.body.queue).toHaveProperty('completed')
        expect(response.body.queue).toHaveProperty('failed')
        expect(response.body.queue).toHaveProperty('delayed')
        expect(response.body.queue).toHaveProperty('total')

        // All counts should be numbers
        expect(typeof response.body.queue.waiting).toBe('number')
        expect(typeof response.body.queue.active).toBe('number')
        expect(typeof response.body.queue.completed).toBe('number')
        expect(typeof response.body.queue.failed).toBe('number')
        expect(typeof response.body.queue.delayed).toBe('number')
        expect(typeof response.body.queue.total).toBe('number')
      })

      it('should calculate total correctly', async () => {
        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', SERVICE_API_KEY)

        const { queue } = response.body
        const expectedTotal = queue.waiting + queue.active + queue.delayed

        expect(queue.total).toBe(expectedTotal)
      })

      it('should include lastSync when available', async () => {
        // Mock storing a sync result
        const cacheService = await initializeCache()

        await cacheService.set(
          'event-service:last-sync',
          {
            timestamp: new Date().toISOString(),
            eventsProcessed: 10,
            duration: 1500,
            success: true,
          },
          3600,
        )

        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', SERVICE_API_KEY)

        expect(response.status).toBe(200)

        if (response.body.lastSync) {
          expect(response.body.lastSync).toHaveProperty('timestamp')
          expect(response.body.lastSync).toHaveProperty('eventsProcessed')
          expect(response.body.lastSync).toHaveProperty('duration')
          expect(response.body.lastSync).toHaveProperty('success')
        }
      })

      it('should handle missing lastSync gracefully', async () => {
        // Clear any existing lastSync
        const cacheService = await initializeCache()

        await cacheService.delete('event-service:last-sync')

        const response = await request(app)
          .get('/internal/sync/status')
          .set('x-service-api-key', SERVICE_API_KEY)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.queue).toBeDefined()
        // lastSync can be null or undefined
      })
    })
  })

  describe('API Contract Compliance', () => {
    it('POST /internal/sync should match InternalTriggerSyncResponse schema', async () => {
      const response = await request(app)
        .post('/internal/sync')
        .set('x-service-api-key', SERVICE_API_KEY)
        .send({ force: true, priority: 5, delay: 1000 })

      expect(response.body).toMatchObject({
        success: expect.any(Boolean),
        jobId: expect.any(String),
        message: expect.any(String),
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
      })
    })

    it('GET /internal/sync/status should match InternalSyncStatusResponse schema', async () => {
      const response = await request(app)
        .get('/internal/sync/status')
        .set('x-service-api-key', SERVICE_API_KEY)

      expect(response.body).toMatchObject({
        success: true,
        queue: {
          waiting: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          delayed: expect.any(Number),
          total: expect.any(Number),
        },
      })

      if (response.body.lastSync) {
        expect(response.body.lastSync).toMatchObject({
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          ),
          eventsProcessed: expect.any(Number),
          duration: expect.any(Number),
          success: expect.any(Boolean),
        })
      }
    })
  })
})
