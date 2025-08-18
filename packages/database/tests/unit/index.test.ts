import { PrismaClient } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock environment
vi.mock('@fever/environment', () => ({
  NODE_ENV: 'test',
}))

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  })),
  Prisma: {},
  EventStatus: { ACTIVE: 'active', SUSPENDED: 'suspended' },
  SellMode: { ONLINE: 'online', OFFLINE: 'offline' },
  SyncStatus: { SUCCESS: 'success', FAILED: 'failed' },
  SyncTrigger: { MANUAL: 'manual', SCHEDULED: 'scheduled' },
}))

describe('database package', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('should export PrismaClient', async () => {
    const { PrismaClient: ExportedPrismaClient } = await import(
      '../../src/index.js'
    )

    expect(ExportedPrismaClient).toBeDefined()
    expect(ExportedPrismaClient).toBe(PrismaClient)
  })

  it('should export getPrismaClient function', async () => {
    const { getPrismaClient } = await import('../../src/index.js')

    expect(getPrismaClient).toBeDefined()
    expect(typeof getPrismaClient).toBe('function')
  })

  it('should export disconnectPrisma function', async () => {
    const { disconnectPrisma } = await import('../../src/index.js')

    expect(disconnectPrisma).toBeDefined()
    expect(typeof disconnectPrisma).toBe('function')
  })

  it('should create singleton instance with getPrismaClient', async () => {
    const { getPrismaClient } = await import('../../src/index.js')

    const instance1 = getPrismaClient()
    const instance2 = getPrismaClient()

    expect(instance1).toBe(instance2)
    expect(instance1).toBeDefined()
    expect(instance1.$connect).toBeDefined()
    expect(instance1.$disconnect).toBeDefined()
  })

  it('should handle disconnectPrisma', async () => {
    const { getPrismaClient, disconnectPrisma } = await import(
      '../../src/index.js'
    )

    const instance = getPrismaClient()

    await disconnectPrisma()

    expect(instance.$disconnect).toHaveBeenCalled()
  })

  it('should export Prisma enums', async () => {
    const { EventStatus, SellMode, SyncStatus, SyncTrigger } = await import(
      '../../src/index.js'
    )

    expect(EventStatus).toBeDefined()
    expect(SellMode).toBeDefined()
    expect(SyncStatus).toBeDefined()
    expect(SyncTrigger).toBeDefined()
  })
})
