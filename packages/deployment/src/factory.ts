import {
  API_GATEWAY_PORT,
  DATABASE_URL,
  NODE_ENV,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
} from '@fever/environment'
import {
  DeploymentPlatform,
  ServiceEnvironment,
  StorageProvider,
} from '@fever/types'

import { VercelDeploymentAdapter } from './adapters/vercel/adapter.js'
import type { DeploymentAdapter, DeploymentConfig } from './types/index.js'

export async function createDeploymentAdapter(
  platform: DeploymentPlatform,
): Promise<DeploymentAdapter> {
  const config = createDeploymentConfig(platform)

  switch (platform) {
    case DeploymentPlatform.VERCEL:
      return new VercelDeploymentAdapter(config)
    case DeploymentPlatform.LOCAL:
    case DeploymentPlatform.AWS:
    case DeploymentPlatform.DOCKER:
      throw new Error(`Platform ${platform} not yet implemented`)
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

function createDeploymentConfig(
  platform: DeploymentPlatform,
): DeploymentConfig {
  return {
    platform,
    environment: getEnvironment(),
    services: [], // Services are registered by the adapter
    infrastructure: {
      database: {
        url: DATABASE_URL,
      },
      cache: {
        url: REDIS_PASSWORD
          ? `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
          : `redis://${REDIS_HOST}:${REDIS_PORT}`,
      },
      storage: {
        type: StorageProvider.LOCAL, // We don't use external storage
      },
    },
    gateway: {
      enabled: platform === DeploymentPlatform.VERCEL,
      port: API_GATEWAY_PORT,
    },
  }
}

function getEnvironment(): ServiceEnvironment {
  switch (NODE_ENV) {
    case 'production':
      return ServiceEnvironment.PRODUCTION
    case 'staging':
      return ServiceEnvironment.STAGING
    default:
      return ServiceEnvironment.DEVELOPMENT
  }
}
