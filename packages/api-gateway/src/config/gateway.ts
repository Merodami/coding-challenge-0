import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@fever/environment'

export interface GatewayConfig {
  rateLimit?: {
    max: number
    windowMs: number
  }
}

export function loadConfig(): GatewayConfig {
  return {
    rateLimit: {
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
  }
}
