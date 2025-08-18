/**
 * Internal domain models for Event Service
 * These are the core business entities matching the provider's XML structure
 */

import type { SellModeType } from '@fever/types'

// ============= Base Plan Domain (Event) =============

export interface BasePlanDomain {
  id: string
  basePlanId: string
  title: string
  organizerCompanyId: string | null
  sellMode: SellModeType
  firstSeenAt: Date
  lastSeenAt: Date
  deletedAt: Date | null
  // Relations
  plans?: PlanDomain[]
}

// ============= Plan Domain (Session) =============

export interface PlanDomain {
  id: string
  basePlanId: string
  planId: string
  planStartDate: Date
  planEndDate: Date
  sellFrom: Date | null
  sellTo: Date | null
  soldOut: boolean
  minPrice: number | null
  maxPrice: number | null
  firstSeenAt: Date
  lastSeenAt: Date
  deletedAt: Date | null
  // Relations
  basePlan?: BasePlanDomain
  zones?: ZoneDomain[]
}

// ============= Zone Domain =============

export interface ZoneDomain {
  id: string
  planId: string
  zoneId: string
  name: string | null
  capacity: number | null
  price: number
  numbered: boolean
  firstSeenAt: Date
  lastSeenAt: Date
  // Relations
  plan?: PlanDomain
}

// ============= Sync History Domain =============

export interface SyncHistoryDomain {
  id: string
  startedAt: Date
  completedAt: Date | null
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  eventsFound: number | null
  eventsCreated: number | null
  eventsUpdated: number | null
  eventsDeleted: number | null
  responseTimeMs: number | null
  processingTimeMs: number | null
  error: string | null
  createdAt: Date
}

// ============= Queue Domain =============

export interface SyncJobDomain {
  id: string
  timestamp: string
  trigger: 'manual' | 'scheduled' | 'cron'
  metadata?: Record<string, unknown>
}

export interface SyncResultDomain {
  eventsProcessed: number
  success: boolean
  errorMessage?: string
  duration: number
}

export interface QueueStatsDomain {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
}

export interface LastSyncInfoDomain {
  timestamp: string
  eventsProcessed: number
  duration: number
  success: boolean
}

export interface SyncJobOptionsDomain {
  delay?: number
  priority?: number
  force?: boolean
}
