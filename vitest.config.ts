import { resolve } from 'path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Core package aliases
      '@fever/shared': resolve(__dirname, './packages/shared/src'),
      '@fever/types': resolve(__dirname, './packages/types/src'),
      '@fever/environment': resolve(__dirname, './packages/environment/src'),
      '@fever/database': resolve(__dirname, './packages/database/src'),
      '@fever/redis': resolve(__dirname, './packages/redis/src'),
      '@fever/api': resolve(__dirname, './packages/api/src'),
      '@fever/http': resolve(__dirname, './packages/http/src'),
      '@fever/tests': resolve(__dirname, './packages/tests/src'),

      // Event service aliases
      '@fever/event-service': resolve(
        __dirname,
        './packages/services/event-service/src',
      ),
      '@event-service': resolve(
        __dirname,
        './packages/services/event-service/src',
      ),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    env: loadEnv('test', process.cwd(), ''),
    include: [
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 60000, // 60 seconds for setup/teardown hooks
    isolate: true,
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
        isolate: true,
      },
    },
    pool: 'threads',
    maxConcurrency: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/tests/**',
      ],
    },
  },
})
