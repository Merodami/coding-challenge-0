#!/usr/bin/env tsx

// Load environment variables before importing anything else
import { config } from 'dotenv'
import { dirname as pathDirname, join as pathJoin } from 'path'
import { fileURLToPath as fileUrlToPath } from 'url'

const __currentFilename = fileUrlToPath(import.meta.url)
const __currentDirname = pathDirname(__currentFilename)

// Load environment variables from project root
config({ path: pathJoin(__currentDirname, '../../../../.env') })
config({ path: pathJoin(__currentDirname, '../../../../.env.local') })

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

import { createRegistry } from '../common/registry/base.js'
import { registerInternalAPI } from './generators/internal-api.js'
import { registerPublicAPI } from './generators/public-api.js'

/**
 * Generate OpenAPI specifications for all APIs
 */

// Extend Zod with OpenAPI
extendZodWithOpenApi(z)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Output directory
const OUTPUT_DIR = join(__dirname, '../../generated/openapi')

// ============= Public API =============
const publicRegistry = createRegistry({
  title: 'Fever Event Service API',
  version: '1.0.0',
  description:
    'Public API for integrating external provider events into Fever marketplace.\n\n## Authentication\n\nThis API requires authentication via API key. Include the API key in the `x-api-key` header for all requests.\n\n**Default API Key for PoC Testing:** `fever-poc-api-key-2025`\n\n```bash\ncurl -H "x-api-key: fever-poc-api-key-2025" http://localhost:5500/api/v1/events/search\n```',
  servers: [
    {
      url: 'http://localhost:5500/api/v1',
      description: 'Local Development (API Gateway)',
    },
    {
      url: 'https://api.fever.com/v1',
      description: 'Production',
    },
    {
      url: 'https://api.staging.fever.com/v1',
      description: 'Staging',
    },
  ],
})

// Register security scheme for public API
publicRegistry.registerSecurityScheme('apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
  description:
    'API key for authentication. Default for PoC: `fever-poc-api-key-2025`',
})

// Register all public schemas and routes
registerPublicAPI(publicRegistry)

// ============= Internal API =============
const internalRegistry = createRegistry({
  title: 'Fever Event Service Internal API',
  version: '1.0.0',
  description:
    'Internal API for service-to-service communication and background job management. These endpoints are NOT exposed through the API Gateway and must be accessed directly on the Event Service port.\n\n## Authentication\n\nInternal endpoints require a service API key. Include the key in the `x-service-api-key` header.\n\n**Default Service API Key for PoC Testing:** `fever-internal-service-key-2025`\n\n```bash\ncurl -H "x-service-api-key: fever-internal-service-key-2025" http://localhost:5501/internal/sync/status\n```',
  servers: [
    {
      url: 'http://localhost:5501',
      description: 'Local Development (Event Service Direct)',
    },
  ],
})

// Register security scheme for internal API
internalRegistry.registerSecurityScheme('serviceApiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'x-service-api-key',
  description:
    'Service API key for internal endpoints. Default for PoC: `fever-internal-service-key-2025`',
})

// Register all internal schemas and routes
registerInternalAPI(internalRegistry)

// ============= Generate Documents =============

console.log('🔧 Generating OpenAPI specifications...')

// Create output directory if it doesn't exist
mkdirSync(OUTPUT_DIR, { recursive: true })

// Generate public API document
const publicDocument = publicRegistry.generateDocument()

// Save individual API specs
const publicOutputPath = join(OUTPUT_DIR, 'public-api.json')

writeFileSync(publicOutputPath, JSON.stringify(publicDocument, null, 2))
console.log(`✅ Public API spec generated: ${publicOutputPath}`)

// Generate internal API document
const internalDocument = internalRegistry.generateDocument()

// Save internal API spec
const internalOutputPath = join(OUTPUT_DIR, 'internal-api.json')

writeFileSync(internalOutputPath, JSON.stringify(internalDocument, null, 2))
console.log(`✅ Internal API spec generated: ${internalOutputPath}`)

// Combine all APIs into one document
const allApisDocument = {
  ...publicDocument,
  info: {
    ...publicDocument.info,
    title: 'Fever Event Service - All APIs',
    description:
      'Complete API documentation for Fever Event Service including public and internal APIs. Note: Public APIs go through the API Gateway (port 5500), while Internal APIs must be accessed directly on the Event Service (port 5501).',
  },
  servers: [
    {
      url: 'http://localhost:5500/api/v1',
      description: 'API Gateway (Public Endpoints)',
    },
    {
      url: 'http://localhost:5501',
      description: 'Event Service Direct (Internal Endpoints)',
    },
  ],
  paths: {
    ...publicDocument.paths,
    ...internalDocument.paths,
  },
  components: {
    schemas: {
      ...publicDocument.components?.schemas,
      ...internalDocument.components?.schemas,
    },
    securitySchemes: {
      ...publicDocument.components?.securitySchemes,
      ...internalDocument.components?.securitySchemes,
      serviceApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-service-api-key',
        description: 'Service-to-service authentication key',
      },
    },
  },
}

const allApisPath = join(OUTPUT_DIR, 'all-apis.json')

writeFileSync(allApisPath, JSON.stringify(allApisDocument, null, 2))
console.log(`✅ Combined spec generated: ${allApisPath}`)

console.log('\n🎉 OpenAPI specifications generated successfully!')
