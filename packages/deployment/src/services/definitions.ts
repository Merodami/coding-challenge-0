import { createEventServer } from '@fever/event-service'

import type { ServiceDefinition } from '../types/index.js'

export function getServiceDefinitions(): ServiceDefinition[] {
  return [
    {
      name: 'event',
      port: 5501,
      basePath: '/events',
      healthCheck: '/health',
      createApp: async (dependencies) => {
        // Adapt ServiceDependencies to ServerConfig
        const result = await createEventServer({
          prisma: dependencies.prisma,
          cacheService: dependencies.cache,
        })

        return result.app
      },
    },
  ]
}
