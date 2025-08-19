import * as dotenv from 'dotenv'
import * as findUp from 'find-up'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the modules
vi.mock('dotenv')
vi.mock('find-up')

describe('loadEnv', () => {
  const originalEnv = process.env
  const mockDotenvConfig = vi.mocked(dotenv.config)
  const mockFindUpSync = vi.mocked(findUp.findUpSync)

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('getLocalEnv', () => {
    it('should load .env.test in test environment', async () => {
      process.env['NODE_ENV'] = 'test'
      mockFindUpSync.mockReturnValueOnce('/path/to/.env.test')

      // Import after setting up mocks
      const { getLocalEnv } = await import('../../src/loadEnv.js')

      getLocalEnv()

      expect(mockFindUpSync).toHaveBeenCalledWith('.env.test')
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: '/path/to/.env.test',
      })
    })

    it('should load base .env file when not in test environment', async () => {
      process.env['NODE_ENV'] = 'development'
      mockFindUpSync
        .mockReturnValueOnce('/path/to/.env') // .env
        .mockReturnValueOnce(undefined) // .env.local

      const { getLocalEnv } = await import('../../src/loadEnv.js')

      getLocalEnv()

      expect(mockFindUpSync).toHaveBeenCalledWith('.env')
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: '/path/to/.env',
      })
    })

    it('should load both .env and .env.local with override', async () => {
      process.env['NODE_ENV'] = 'development'
      mockFindUpSync
        .mockReturnValueOnce('/path/to/.env') // .env
        .mockReturnValueOnce('/path/to/.env.local') // .env.local

      const { getLocalEnv } = await import('../../src/loadEnv.js')

      getLocalEnv()

      expect(mockDotenvConfig).toHaveBeenCalledTimes(2)
      expect(mockDotenvConfig).toHaveBeenNthCalledWith(1, {
        path: '/path/to/.env',
      })
      expect(mockDotenvConfig).toHaveBeenNthCalledWith(2, {
        path: '/path/to/.env.local',
        override: true,
      })
    })

    it('should handle missing .env files gracefully', async () => {
      process.env['NODE_ENV'] = 'production'
      mockFindUpSync.mockReturnValue(undefined)

      const { getLocalEnv } = await import('../../src/loadEnv.js')

      getLocalEnv()

      expect(mockFindUpSync).toHaveBeenCalledWith('.env')
      expect(mockFindUpSync).toHaveBeenCalledWith('.env.local')
      expect(mockDotenvConfig).not.toHaveBeenCalled()
    })

    it('should only load .env.local when base .env is missing', async () => {
      process.env['NODE_ENV'] = 'development'
      mockFindUpSync
        .mockReturnValueOnce(undefined) // .env
        .mockReturnValueOnce('/path/to/.env.local') // .env.local

      const { getLocalEnv } = await import('../../src/loadEnv.js')

      getLocalEnv()

      expect(mockDotenvConfig).toHaveBeenCalledTimes(1)
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: '/path/to/.env.local',
        override: true,
      })
    })
  })
})
