/**
 * System and deployment related enums
 */

/**
 * Deployment platforms
 */
export enum DeploymentPlatform {
  VERCEL = 'vercel',
  AWS = 'aws',
  DOCKER = 'docker',
  LOCAL = 'local',
}

/**
 * Type definition for deployment platform
 */
export type DeploymentPlatformType = `${DeploymentPlatform}`

/**
 * Storage providers for file storage
 */
export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  BLOB = 'blob',
  GCS = 'gcs',
}

/**
 * Type definition for storage provider
 */
export type StorageProviderType = `${StorageProvider}`

/**
 * Service deployment modes
 */
export enum ServiceDeploymentMode {
  STANDALONE = 'standalone',
  EMBEDDED = 'embedded',
  DISTRIBUTED = 'distributed',
}

/**
 * Type definition for service deployment mode
 */
export type ServiceDeploymentModeType = `${ServiceDeploymentMode}`

/**
 * Infrastructure component types
 */
export enum InfrastructureComponent {
  DATABASE = 'database',
  CACHE = 'cache',
  STORAGE = 'storage',
  QUEUE = 'queue',
  MONITORING = 'monitoring',
}

/**
 * Type definition for infrastructure component
 */
export type InfrastructureComponentType = `${InfrastructureComponent}`
