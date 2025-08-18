/**
 * Plan Repository Implementation
 * Handles data retrieval for plans with performance optimizations
 */

import { PAGINATION_DEFAULT_LIMIT } from '@fever/environment'
import { ErrorFactory } from '@fever/shared'
import { type PaginatedResult, SellMode } from '@fever/types'
import type { PrismaClient } from '@prisma/client'

import {
  EventMapper,
  type EventSummaryInternal,
} from '../mappers/EventMapper.js'

export class PlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Search for events based on date range with pagination
   * Returns events in EventSummary format (flat structure matching swagger spec)
   */
  async searchEvents(params: {
    startsAt?: Date
    endsAt?: Date
    page?: number
    limit?: number
  }): Promise<PaginatedResult<EventSummaryInternal>> {
    try {
      const page = params.page || 1
      const limit = params.limit || PAGINATION_DEFAULT_LIMIT

      // Build WHERE clause for plans (not base plans)
      const planWhereClause: any = {
        deletedAt: null,
        // Add date range filtering if provided
        ...(params.startsAt || params.endsAt
          ? {
              AND: [
                params.startsAt
                  ? { planEndDate: { gte: params.startsAt } }
                  : {},
                params.endsAt ? { planStartDate: { lte: params.endsAt } } : {},
              ],
            }
          : {}),
        // Only include plans from online base plans
        basePlan: {
          sellMode: SellMode.ONLINE,
          deletedAt: null,
        },
      }

      // Get total count for pagination
      const total = await this.prisma.plan.count({
        where: planWhereClause,
      })

      // Calculate pagination values
      const skip = (page - 1) * limit
      const totalPages = Math.ceil(total / limit)

      // Fetch plans with their base plans and zones
      const plans = await this.prisma.plan.findMany({
        where: planWhereClause,
        include: {
          basePlan: true,
          zones: true,
        },
        orderBy: {
          planStartDate: 'asc',
        },
        skip,
        take: limit,
      })

      // Group plans by base plan for mapper
      const basePlansMap = new Map<string, any>()

      for (const plan of plans) {
        const basePlanId = plan.basePlan.basePlanId

        if (!basePlansMap.has(basePlanId)) {
          basePlansMap.set(basePlanId, {
            ...plan.basePlan,
            plans: [],
          })
        }
        basePlansMap.get(basePlanId)!.plans.push(plan)
      }

      // Transform to EventSummary format
      const eventSummaries = EventMapper.toEventSummaries(
        Array.from(basePlansMap.values()),
      )

      return {
        data: eventSummaries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      throw ErrorFactory.databaseError(
        'searchEvents',
        'Failed to search events',
        appError,
      )
    }
  }
}
