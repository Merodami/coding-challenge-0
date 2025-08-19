import { createDeploymentAdapter } from '@fever/deployment'
import { createErrorResponse, ErrorCode } from '@fever/types'

// Don't load local env files on Vercel - environment variables are provided by Vercel
// Only import getLocalEnv if not in production
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.DEPLOYMENT_PLATFORM !== 'vercel'
) {
  const { getLocalEnv } = await import('@fever/environment')
  getLocalEnv()
}

// Create a singleton app instance
let app

export default async function handler(req, res) {
  try {
    // Initialize app on first request (cold start)
    if (!app) {
      const adapter = await createDeploymentAdapter('vercel')
      await adapter.initialize()
      app = await adapter.createApp()
    }

    // Let Express handle the request
    app(req, res)
  } catch (error) {
    // eslint-disable-next-line no-undef
    console.error('Handler error:', error)
    res
      .status(500)
      .json(
        createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Internal server error'),
      )
  }
}
