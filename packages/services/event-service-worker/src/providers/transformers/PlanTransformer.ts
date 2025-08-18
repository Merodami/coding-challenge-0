/**
 * Plan Transformer Module
 * Transforms provider XML data (planList) to domain models
 */

import { ErrorFactory, logger } from '@fever/shared'
import { SellMode } from '@fever/types'
import { get } from 'lodash-es'
import { v4 as uuidv4 } from 'uuid'

import type {
  BasePlanDomain,
  PlanDomain,
  ZoneDomain,
} from '../../types/domain.js'

export class PlanTransformer {
  /**
   * Transform provider XML data to domain plans
   */
  transform(data: any): BasePlanDomain[] {
    try {
      // Provider returns planList > output > base_plan[]
      const basePlans = get(data, 'planList.output.base_plan', [])

      if (!Array.isArray(basePlans)) {
        logger.warn('No base plans found in provider response')

        return []
      }

      const transformedPlans: BasePlanDomain[] = []

      for (const basePlan of basePlans) {
        // Only include plans with sell_mode = "online"
        const sellMode = get(basePlan, 'sell_mode', '')

        if (sellMode !== 'online') {
          continue
        }

        const plan = this.transformBasePlan(basePlan)

        if (plan) {
          transformedPlans.push(plan)
        }
      }

      return transformedPlans
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error({ err: appError }, 'Failed to transform provider data')

      return []
    }
  }

  /**
   * Transform a single base plan from provider format
   */
  private transformBasePlan(basePlan: any): BasePlanDomain | null {
    try {
      const basePlanId = get(basePlan, 'base_plan_id', '')
      const title = get(basePlan, 'title', 'Untitled Event')
      const organizerCompanyId = get(basePlan, 'organizer_company_id', null)
      const sellMode = get(basePlan, 'sell_mode', 'online')

      // Transform nested plans (sessions)
      const plans = this.extractPlans(basePlan, basePlanId)

      return {
        id: uuidv4(), // Will be replaced by database
        basePlanId: String(basePlanId),
        title,
        organizerCompanyId: organizerCompanyId
          ? String(organizerCompanyId)
          : null,
        sellMode: sellMode === 'online' ? SellMode.ONLINE : SellMode.OFFLINE,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        plans,
      }
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error(
        { err: appError, basePlanId: get(basePlan, 'base_plan_id', 'unknown') },
        'Failed to transform base plan',
      )

      return null
    }
  }

  /**
   * Extract plans (sessions) from base plan data
   */
  private extractPlans(basePlan: any, basePlanId: string): PlanDomain[] {
    const plans: PlanDomain[] = []

    // Plans can be a single object or array
    let planList = get(basePlan, 'plan', [])

    if (!Array.isArray(planList)) {
      planList = [planList]
    }

    for (const plan of planList) {
      try {
        const planId = get(plan, 'plan_id', '')
        const planStartDate = this.parseDate(get(plan, 'plan_start_date', null))
        const planEndDate = this.parseDate(get(plan, 'plan_end_date', null))
        const sellFrom = this.parseDate(get(plan, 'sell_from', null))
        const sellTo = this.parseDate(get(plan, 'sell_to', null))
        const soldOut = get(plan, 'sold_out', 'false') === 'true'

        // Extract zones and calculate min/max prices
        const zones = this.extractZones(plan)
        const { minPrice, maxPrice } = this.calculatePriceRange(zones)

        plans.push({
          id: uuidv4(), // Will be replaced by database
          basePlanId: String(basePlanId),
          planId: String(planId),
          planStartDate,
          planEndDate,
          sellFrom,
          sellTo,
          soldOut,
          minPrice,
          maxPrice,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          deletedAt: null,
          zones,
        })
      } catch (error) {
        const appError = ErrorFactory.fromError(error)

        logger.warn(
          { err: appError, planId: get(plan, 'plan_id', 'unknown') },
          'Failed to parse plan',
        )
      }
    }

    return plans
  }

  /**
   * Extract zones from plan data
   */
  private extractZones(plan: any): ZoneDomain[] {
    const zones: ZoneDomain[] = []

    // Zones can be a single object or array
    let zoneList = get(plan, 'zone', [])

    if (!Array.isArray(zoneList)) {
      zoneList = [zoneList]
    }

    for (const zone of zoneList) {
      try {
        zones.push({
          id: uuidv4(), // Will be replaced by database
          planId: '', // Will be set by database
          zoneId: String(get(zone, 'zone_id', '')),
          name: get(zone, 'name', null),
          capacity: parseInt(get(zone, 'capacity', '0'), 10) || null,
          price: parseFloat(get(zone, 'price', '0')) || 0,
          numbered: get(zone, 'numbered', 'false') === 'true',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        })
      } catch (error) {
        const appError = ErrorFactory.fromError(error)

        logger.warn({ err: appError }, 'Failed to parse zone')
      }
    }

    return zones
  }

  /**
   * Calculate min and max prices from zones
   */
  private calculatePriceRange(zones: ZoneDomain[]): {
    minPrice: number | null
    maxPrice: number | null
  } {
    if (zones.length === 0) {
      return { minPrice: null, maxPrice: null }
    }

    const prices = zones.map((z) => z.price).filter((price) => price > 0)

    if (prices.length === 0) {
      return { minPrice: null, maxPrice: null }
    }

    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }
  }

  /**
   * Parse date string from provider
   */
  private parseDate(dateStr: string | null): Date {
    if (!dateStr) {
      return new Date()
    }

    try {
      const date = new Date(dateStr)

      if (isNaN(date.getTime())) {
        logger.warn({ dateStr }, 'Invalid date from provider')

        return new Date()
      }

      return date
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.warn({ err: appError, dateStr }, 'Failed to parse date')

      return new Date()
    }
  }
}
