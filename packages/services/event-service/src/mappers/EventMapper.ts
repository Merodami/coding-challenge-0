/**
 * Event Mapper
 * Transforms from nested database structure to flat EventSummary format
 * Internal types only - no API imports (clean architecture)
 */

import type { Decimal } from '@prisma/client/runtime/library'

// Database types (what Prisma returns)
interface PrismaBasePlan {
  id: string // UUID
  basePlanId: string
  title: string
  sellMode: string
  organizerCompanyId: string | null
  plans?: PrismaPlan[]
}

interface PrismaPlan {
  id: string // UUID
  planId: string
  planStartDate: Date
  planEndDate: Date
  minPrice: Decimal | null
  maxPrice: Decimal | null
  zones?: PrismaZone[]
}

interface PrismaZone {
  zoneId: string
  name: string | null
  price: Decimal
  capacity: number | null
  numbered: boolean
}

// Internal EventSummary type (matches swagger spec but defined internally)
export interface EventSummaryInternal {
  id: string // UUID
  title: string
  start_date: string // YYYY-MM-DD
  start_time: string | null // HH:MM:SS
  end_date: string | null // YYYY-MM-DD
  end_time: string | null // HH:MM:SS
  min_price: number | null
  max_price: number | null
}

export class EventMapper {
  /**
   * Transform nested database structure to flat EventSummary for API
   * Each plan becomes a separate EventSummary in the response
   */
  static toEventSummaries(basePlans: PrismaBasePlan[]): EventSummaryInternal[] {
    const eventSummaries: EventSummaryInternal[] = []

    for (const basePlan of basePlans) {
      if (basePlan.plans) {
        for (const plan of basePlan.plans) {
          eventSummaries.push(this.planToEventSummary(basePlan, plan))
        }
      }
    }

    return eventSummaries
  }

  /**
   * Transform a single plan to EventSummary format
   */
  private static planToEventSummary(
    basePlan: PrismaBasePlan,
    plan: PrismaPlan,
  ): EventSummaryInternal {
    return {
      id: plan.id, // Use the plan's UUID
      title: basePlan.title,
      start_date: this.formatDate(plan.planStartDate),
      start_time: this.formatTime(plan.planStartDate),
      end_date: this.formatDate(plan.planEndDate),
      end_time: this.formatTime(plan.planEndDate),
      min_price: plan.minPrice ? Number(plan.minPrice) : null,
      max_price: plan.maxPrice ? Number(plan.maxPrice) : null,
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  /**
   * Format time as HH:MM:SS
   */
  private static formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`
  }
}
