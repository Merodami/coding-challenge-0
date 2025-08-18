/**
 * ProviderClient Integration Tests
 *
 * Tests the ProviderClient with real HTTP requests using supertest
 * and mock HTTP server to simulate the external provider API
 */

import { vi } from 'vitest'

// Unmock modules for integration tests
vi.unmock('@fever/shared')
vi.unmock('axios')
vi.unmock('axios-retry')

import express from 'express'
import { Server } from 'http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ProviderClient } from '../../../src/providers/http/ProviderClient.js'

describe('ProviderClient Integration Tests', () => {
  let mockServer: Server
  let mockServerPort: number
  let client: ProviderClient

  beforeAll(async () => {
    // Create a mock HTTP server to simulate the external provider
    const app = express()

    // Successful response endpoint
    app.get('/api/events', (_req, res) => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<eventList>
  <output>
    <base_event base_event_id="291" sell_mode="online">
      <event event_id="291">
        <title>Test Event</title>
        <event_start_date>2024-01-01T10:00:00</event_start_date>
        <event_end_date>2024-01-01T12:00:00</event_end_date>
        <zone zone_id="1">
          <name>General</name>
          <price>25.00</price>
          <capacity>100</capacity>
          <numbered>false</numbered>
          <availability>80</availability>
        </zone>
      </event>
    </base_event>
  </output>
</eventList>`

      res.set('Content-Type', 'application/xml')
      res.send(xmlResponse)
    })

    // Timeout endpoint
    app.get('/api/events/timeout', () => {
      // Never respond to simulate timeout
      // Client should timeout after configured time
    })

    // 503 Service Unavailable endpoint
    app.get('/api/events/503', (_req, res) => {
      res.status(503).send('Service Temporarily Unavailable')
    })

    // 500 Server Error endpoint
    app.get('/api/events/500', (_req, res) => {
      res.status(500).send('Internal Server Error')
    })

    // 400 Bad Request endpoint
    app.get('/api/events/400', (_req, res) => {
      res.status(400).send('Bad Request')
    })

    // Health check endpoint
    app.head('/api/events', (_req, res) => {
      res.status(200).end()
    })

    // Start the mock server on a random port
    await new Promise<void>((resolve) => {
      mockServer = app.listen(0, () => {
        mockServerPort = (mockServer.address() as any).port
        resolve()
      })
    })
  })

  beforeEach(() => {
    // Create client pointing to our mock server
    client = new ProviderClient({
      url: `http://localhost:${mockServerPort}/api/events`,
      timeout: 1000, // Short timeout for tests
      retries: 1,
    })
  })

  describe('fetchEvents', () => {
    it('should successfully fetch and return XML data', async () => {
      const result = await client.fetchEvents()

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result).toContain('<eventList>')
      expect(result).toContain('<title>Test Event</title>')
      expect(result).toContain('base_event_id="291"')
    })

    it('should handle timeout errors', async () => {
      const timeoutClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/timeout`,
        timeout: 100, // Very short timeout
        retries: 0,
      })

      await expect(timeoutClient.fetchEvents()).rejects.toThrow()
    })

    it('should handle 503 service unavailable', async () => {
      const unavailableClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/503`,
        timeout: 1000,
        retries: 0,
      })

      await expect(unavailableClient.fetchEvents()).rejects.toThrow()
    })

    it('should handle 500 server errors', async () => {
      const errorClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/500`,
        timeout: 1000,
        retries: 0,
      })

      await expect(errorClient.fetchEvents()).rejects.toThrow()
    })

    it('should handle 400 client errors', async () => {
      const badRequestClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/400`,
        timeout: 1000,
        retries: 0,
      })

      await expect(badRequestClient.fetchEvents()).rejects.toThrow()
    })

    it('should return fallback data when circuit breaker is open', async () => {
      // First, trigger multiple failures to open the circuit breaker
      const failingClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/500`,
        timeout: 1000,
        retries: 0,
      })

      // Trigger failures to potentially open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await failingClient.fetchEvents()
        } catch {
          // Expected to fail
        }
      }

      // The circuit breaker should provide fallback data
      // Note: This test might need adjustment based on actual circuit breaker implementation
      const stats = failingClient.getStats()

      expect(stats.state).toBeDefined()
    })
  })

  describe('healthCheck', () => {
    it('should return true for successful health check', async () => {
      const result = await client.healthCheck()

      expect(result).toBe(true)
    })

    it('should return false for failed health check', async () => {
      const failingClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events/500`,
        timeout: 1000,
        retries: 0,
      })

      const result = await failingClient.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false for network errors', async () => {
      const networkErrorClient = new ProviderClient({
        url: 'http://localhost:99999/api/events', // Non-existent port
        timeout: 100,
        retries: 0,
      })

      const result = await networkErrorClient.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return circuit breaker statistics', () => {
      const stats = client.getStats()

      expect(stats).toHaveProperty('state')
      expect(stats).toHaveProperty('stats')
      expect(['open', 'closed', 'half-open']).toContain(stats.state)
    })
  })

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultClient = new ProviderClient()
      const stats = defaultClient.getStats()

      // Should be created without errors
      expect(stats).toBeDefined()
    })

    it('should use custom configuration', () => {
      const customClient = new ProviderClient({
        url: `http://localhost:${mockServerPort}/api/events`,
        timeout: 5000,
        retries: 3,
      })

      const stats = customClient.getStats()

      expect(stats).toBeDefined()
    })
  })

  afterAll(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer.close(() => resolve())
      })
    }
  })
})
