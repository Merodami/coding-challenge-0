import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { EventId } from '../../shared/branded.js'

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z)

/**
 * Event-specific parameters shared across tiers
 */

// ============= Path Parameters =============

/**
 * Event ID path parameter (raw Zod)
 */
export const EventIdParam = z.object({
  eventId: EventId.describe('Event ID'),
})

/**
 * Event ID path parameter (OpenAPI documented)
 */
export const EventIdParamSchema = EventIdParam.openapi('EventIdParam', {
  description: 'Event ID path parameter',
})

export type EventIdParam = z.infer<typeof EventIdParam>

/**
 * Session ID path parameter (raw Zod)
 */
export const SessionIdParam = z.object({
  sessionId: z.string().uuid().describe('Session ID'),
})

/**
 * Session ID path parameter (OpenAPI documented)
 */
export const SessionIdParamSchema = SessionIdParam.openapi('SessionIdParam', {
  description: 'Session ID path parameter',
})

export type SessionIdParam = z.infer<typeof SessionIdParam>

/**
 * Zone ID path parameter (raw Zod)
 */
export const ZoneIdParam = z.object({
  zoneId: z.string().uuid().describe('Zone ID'),
})

/**
 * Zone ID path parameter (OpenAPI documented)
 */
export const ZoneIdParamSchema = ZoneIdParam.openapi('ZoneIdParam', {
  description: 'Zone ID path parameter',
})

export type ZoneIdParam = z.infer<typeof ZoneIdParam>
