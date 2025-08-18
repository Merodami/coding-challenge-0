/**
 * Mock Provider Server
 *
 * A test server that simulates the external provider API
 * This allows BullMQ workers to make real HTTP calls during tests
 */

import express from 'express'
import { readFileSync } from 'fs'
import type { Server } from 'http'
import { join } from 'path'

export interface MockProviderConfig {
  port?: number
  responseFile?: string
  delay?: number
  failureRate?: number
  timeout?: boolean
}

export class MockProviderServer {
  private app: express.Application
  private server: Server | null = null
  private port: number
  private responseFile: string
  private delay: number
  private failureRate: number
  private timeout: boolean
  private requestCount: number = 0

  constructor(config: MockProviderConfig = {}) {
    this.port = config.port || 0 // 0 means random available port
    this.responseFile = config.responseFile || 'response_1.xml'
    this.delay = config.delay || 0
    this.failureRate = config.failureRate || 0
    this.timeout = config.timeout || false

    this.app = express()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', requests: this.requestCount })
    })

    // Mock provider endpoint - matches what ProviderClient expects
    this.app.get('/', async (_req, res) => {
      this.requestCount++

      // Simulate timeout
      if (this.timeout) {
        // Don't respond, let the request timeout
        return
      }

      // Simulate random failures based on failure rate
      if (this.failureRate > 0 && Math.random() < this.failureRate) {
        res.status(503).json({ error: 'Service temporarily unavailable' })

        return
      }

      // Simulate delay (provider slowness)
      if (this.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delay))
      }

      try {
        // Read the XML fixture file
        const fixturePath = join(
          __dirname,
          '..',
          'fixtures',
          'provider-responses',
          this.responseFile,
        )

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const xmlContent = readFileSync(fixturePath, 'utf-8')

        res.set('Content-Type', 'application/xml')
        res.send(xmlContent)
      } catch {
        res.status(500).json({ error: 'Failed to read fixture file' })
      }
    })
  }

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        const address = this.server!.address()

        this.port =
          typeof address === 'object' && address ? address.port : this.port
        console.log(`Mock provider server started on port ${this.port}`)
        resolve(this.port)
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock provider server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  setResponseFile(filename: string): void {
    this.responseFile = filename
  }

  setDelay(delay: number): void {
    this.delay = delay
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate
  }

  setTimeout(timeout: boolean): void {
    this.timeout = timeout
  }

  getRequestCount(): number {
    return this.requestCount
  }

  resetRequestCount(): void {
    this.requestCount = 0
  }

  getUrl(): string {
    return `http://localhost:${this.port}`
  }
}

/**
 * Helper function to create and start a mock provider server
 */
export async function createMockProviderServer(
  config?: MockProviderConfig,
): Promise<MockProviderServer> {
  const server = new MockProviderServer(config)

  await server.start()

  return server
}
