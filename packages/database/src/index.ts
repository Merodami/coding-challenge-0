/**
 * @fever/database - Database package with Prisma ORM
 */

import { NODE_ENV } from '@fever/environment'
import { PrismaClient } from '@prisma/client'

// Re-export Prisma client and types
export { Prisma, PrismaClient } from '@prisma/client'

// Export enums from Prisma
export { EventStatus, SellMode, SyncStatus, SyncTrigger } from '@prisma/client'

// Create singleton instance
let prisma: PrismaClient | undefined

/**
 * Get the Prisma client instance (singleton)
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    })
  }

  return prisma
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}
