import { createGatewayWithServices } from '@fever/api-gateway'
import { CACHE_DISABLED } from '@fever/environment'
import { type ICacheService, initializeCache } from '@fever/redis'
import { logger } from '@fever/shared'
import { DeploymentPlatform } from '@fever/types'
import { PrismaClient } from '@prisma/client'
import { type Application } from 'express'

import { getServiceDefinitions } from '../../services/definitions.js'
import type { ServiceDependencies } from '../../types/index.js'
import { BaseDeploymentAdapter } from '../base.js'

export class VercelDeploymentAdapter extends BaseDeploymentAdapter {
  readonly platform = DeploymentPlatform.VERCEL

  private prisma?: PrismaClient
  private cache?: ICacheService
  private serviceApps: Map<string, Application> = new Map()

  async initialize(): Promise<void> {
    logger.info('Initializing Vercel deployment adapter')

    // Initialize infrastructure
    await this.initializeInfrastructure()

    // Register all services
    const services = getServiceDefinitions()

    for (const service of services) {
      this.registry.register(service)
    }

    // Create service applications
    await this.createServiceApplications()
  }

  async createApp(): Promise<Application> {
    // Use API Gateway as the main application with embedded services
    // This is the industry-standard pattern for serverless deployments
    logger.info(
      'Creating API Gateway with embedded services for Vercel deployment',
    )

    // Ensure Redis is available for gateway features
    if (this.cache) {
      process.env['REDIS_URL'] =
        process.env['REDIS_URL'] || 'redis://localhost:6379'
    }

    // Create gateway app with all services embedded
    const app = await createGatewayWithServices(this.serviceApps)

    logger.info(
      {
        mode: 'api-gateway-embedded',
        services: Array.from(this.serviceApps.keys()),
        features: [
          'authentication',
          'rate-limiting',
          'request-validation',
          'health-checks',
          'documentation',
          'cors',
          'compression',
        ],
      },
      'Vercel deployment adapter configured',
    )

    return app
  }

  async startServer(_app: Application): Promise<void> {
    // In Vercel, we don't start a server - Vercel handles it
    logger.info('Vercel deployment adapter ready (serverless mode)')
  }

  protected async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
    }

    if (this.cache) {
      await this.cache.disconnect()
    }
  }

  protected getDistributedServiceUrl(serviceName: string): string {
    // In Vercel, all services go through the API gateway
    const apiGatewayUrl =
      process.env['API_GATEWAY_BASE_URL'] || 'https://feverapi.vercel.app'

    return `${apiGatewayUrl}/api/v1/${serviceName}`
  }

  protected async checkDistributedService(
    serviceName: string,
  ): Promise<boolean> {
    // In monolith mode, check if service app exists
    return this.serviceApps.has(serviceName)
  }

  protected async checkInfrastructure(): Promise<{
    database: boolean
    cache: boolean
    storage: boolean
  }> {
    const results = {
      database: false,
      cache: false,
      storage: true, // Assume storage is external (S3/Blob)
    }

    try {
      // Check database
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`
        results.database = true
      }
    } catch (error) {
      logger.error(error, 'Database health check failed')
    }

    try {
      // Check cache
      if (this.cache) {
        if (this.cache.checkHealth) {
          const health = await this.cache.checkHealth()

          results.cache = health.status === 'healthy'
        } else {
          // Fallback: try to set and get a test value
          const testKey = '__health_check__'

          await this.cache.set(testKey, 'test', 1)

          const value = await this.cache.get(testKey)

          results.cache = value === 'test'
        }
      }
    } catch (error) {
      logger.error(error, 'Cache health check failed')
    }

    return results
  }

  private async initializeInfrastructure(): Promise<void> {
    // Run migrations on first startup if needed
    await this.runMigrationsIfNeeded()

    // Initialize Prisma
    const databaseUrl = this.config.infrastructure.database.url

    // Check if using Supabase pooler or PgBouncer (connection pooling)
    const isUsingPooler =
      databaseUrl.includes('pooler.supabase.com') ||
      databaseUrl.includes('pgbouncer') ||
      databaseUrl.includes('6543') // Common pooler port

    // Append pgbouncer mode if using connection pooling
    const finalDatabaseUrl =
      isUsingPooler && !databaseUrl.includes('pgbouncer=true')
        ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}pgbouncer=true&connection_limit=1`
        : databaseUrl

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: finalDatabaseUrl,
        },
      },
      log:
        this.config.environment === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    })

    // Initialize cache using the shared function that respects CACHE_DISABLED
    this.cache = await initializeCache()

    if (CACHE_DISABLED) {
      logger.info('Cache disabled for Vercel deployment - using memory cache')
    }
  }

  private async createServiceApplications(): Promise<void> {
    // Service clients will use URLs from environment variables
    // For Vercel, set all service URLs to point to the deployed API gateway
    const dependencies: ServiceDependencies = {
      prisma: this.prisma!,
      cache: this.cache!,
    }

    for (const service of this.registry.list()) {
      try {
        const app = await service.createApp(dependencies)

        this.serviceApps.set(service.name, app)
        logger.info(`Created ${service.name} application`)
      } catch (error) {
        logger.error(error, `Failed to create ${service.name} application`)
        throw error
      }
    }
  }

  private async runMigrationsIfNeeded(): Promise<void> {
    try {
      // Check if we have a migration database URL (direct connection for migrations)
      const migrationUrl = process.env['MIGRATION_DATABASE_URL']

      if (!migrationUrl) {
        logger.info('No MIGRATION_DATABASE_URL set, skipping migrations')

        return
      }

      logger.info('Running database migrations on startup...')

      // Create a temporary Prisma client for migrations using direct connection
      const { spawn } = await import('child_process')

      const migrationProcess = spawn(
        'npx',
        [
          'prisma',
          'migrate',
          'deploy',
          '--schema=packages/database/prisma/schema.prisma',
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: migrationUrl,
          },
          stdio: 'pipe',
        },
      )

      let errorOutput = ''

      migrationProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      await new Promise((resolve, reject) => {
        migrationProcess.on('close', (code) => {
          if (code === 0) {
            logger.info('Database migrations completed successfully')
            resolve(code)
          } else {
            logger.error('Database migrations failed')
            reject(
              new Error(`Migration failed with code ${code}: ${errorOutput}`),
            )
          }
        })
      })
    } catch (error) {
      logger.error({ error }, 'Error running migrations')
      // Don't throw - let the app start even if migrations fail
      // This prevents deployment failures and allows manual migration fixes
    }
  }
}
