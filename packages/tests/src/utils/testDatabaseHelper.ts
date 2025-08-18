/**
 * Simplified Test Database Helper
 *
 * Provides a simple way to set up PostgreSQL test containers with SQL initialization.
 * Much simpler than the full .project implementation - just what we need for integration tests.
 */
import {
  DEBUG,
  PG_DATABASE,
  PG_PASSWORD,
  PG_USER,
  TEST_VERBOSE,
} from '@fever/environment'
import { PrismaClient } from '@prisma/client'
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import fs from 'fs'
import path from 'path'

export interface TestDatabaseConfig {
  /**
   * Name of the test database (defaults to PG_DATABASE from env or 'test_db')
   */
  databaseName?: string

  /**
   * Database username (defaults to PG_USER from env or 'test_user')
   */
  username?: string

  /**
   * Database password (defaults to PG_PASSWORD from env or 'test_password')
   */
  password?: string

  /**
   * Path to SQL initialization file (relative to service root)
   */
  initSqlPath?: string

  /**
   * Timeout for container startup in milliseconds (defaults to 120000)
   */
  startupTimeout?: number
}

export interface TestDatabaseResult {
  container: StartedPostgreSqlContainer
  prisma: PrismaClient
  databaseUrl: string
}

function logVerbose(message: string): void {
  if (DEBUG || TEST_VERBOSE) {
    console.log(message)
  }
}

function logVerboseWarn(message: string): void {
  if (DEBUG || TEST_VERBOSE) {
    console.warn(message)
  }
}

function configureContainer(
  databaseName: string,
  username: string,
  password: string,
  startupTimeout: number,
  initSqlPath: string,
): PostgreSqlContainer {
  let container = new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase(databaseName)
    .withUsername(username)
    .withPassword(password)
    .withStartupTimeout(startupTimeout)

  // Always resolve from repository root, regardless of where the test is run from
  const repoRoot = path.resolve(__dirname, '../../../..')
  const fullInitSqlPath = path.resolve(repoRoot, initSqlPath)

  logVerbose(`Looking for init.sql at: ${fullInitSqlPath}`)

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(fullInitSqlPath)) {
    logVerbose('Found init.sql, adding to container initialization')
    container = container.withCopyFilesToContainer([
      {
        source: fullInitSqlPath,
        target: '/docker-entrypoint-initdb.d/init.sql',
      },
    ])
  } else {
    logVerboseWarn('init.sql not found, starting with empty database')
  }

  return container
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log:
      DEBUG === 'true' && TEST_VERBOSE === 'true'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  })
}

async function verifyDatabaseConnection(prisma: PrismaClient): Promise<void> {
  await prisma.$queryRaw`SELECT 1 as test`
  logVerbose('Database connection verified')

  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `

  logVerbose(`Available tables: ${JSON.stringify(tables)}`)
}

/**
 * Creates and starts a PostgreSQL test container with SQL initialization
 */
export async function createTestDatabase(
  config: TestDatabaseConfig = {},
): Promise<TestDatabaseResult> {
  const {
    databaseName = PG_DATABASE || 'test_db',
    username = PG_USER || 'test_user',
    password = PG_PASSWORD || 'test_password',
    initSqlPath = 'packages/services/event-service/tests/fixtures/init.sql',
    startupTimeout = 120000,
  } = config

  logVerbose('Starting PostgreSQL test container...')

  const container = configureContainer(
    databaseName,
    username,
    password,
    startupTimeout,
    initSqlPath,
  )

  const startedContainer = await container.start()

  logVerbose('PostgreSQL container started successfully')

  await new Promise((resolve) => setTimeout(resolve, 3000))
  logVerbose('Waited for database initialization')

  const databaseUrl = startedContainer.getConnectionUri()

  logVerbose(`Database URL: ${databaseUrl}`)

  const prisma = createPrismaClient(databaseUrl)

  await prisma.$connect()
  logVerbose('Prisma client connected to test database')

  try {
    await verifyDatabaseConnection(prisma)
  } catch (error) {
    console.error('❌ Database verification failed:', error)
    throw error
  }

  return {
    container: startedContainer,
    prisma,
    databaseUrl,
  }
}

async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect()
    logVerbose('Prisma client disconnected')
  } catch (error) {
    logVerboseWarn(`Error disconnecting Prisma: ${error}`)
  }
}

async function stopContainer(
  container: StartedPostgreSqlContainer,
): Promise<void> {
  try {
    await container.stop()
    logVerbose('PostgreSQL container stopped')
  } catch (error) {
    logVerboseWarn(`Error stopping container: ${error}`)
  }
}

/**
 * Cleans up test database resources
 */
export async function cleanupTestDatabase(
  result: TestDatabaseResult | undefined,
): Promise<void> {
  logVerbose('Cleaning up test database resources...')

  if (!result) {
    logVerbose('No test database result to cleanup')

    return
  }

  const { prisma, container } = result

  if (prisma) {
    await disconnectPrisma(prisma)
  }

  if (container) {
    await stopContainer(container)
  }

  logVerbose('Cleanup complete')
}

/**
 * Clears all data from the test database (keeps schema)
 */
export async function clearTestDatabase(prisma: PrismaClient): Promise<void> {
  try {
    // Clear data using raw SQL to work with any schema
    await prisma.$executeRaw`TRUNCATE TABLE "zones", "plans", "base_plans", "sync_history" CASCADE`

    if (DEBUG || TEST_VERBOSE) {
      console.log('Cleared all test data')
    }
  } catch (error) {
    if (DEBUG || TEST_VERBOSE) {
      console.warn(`Error clearing database: ${error}`)
    }
    // Don't throw - tests should continue even if cleanup fails
  }
}
