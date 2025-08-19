/**
 * Plan Repository Implementation for Worker
 * Handles data persistence for syncing plans from provider
 */

import { ErrorFactory, logger } from '@fever/shared'
import type { PrismaClient } from '@prisma/client'
import { SellMode } from '@prisma/client'

import type { BasePlanDomain } from '../types/domain.js'

export class PlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Upsert base plans and their related data
   * Used during provider sync to update database
   */
  async upsertBasePlans(basePlans: BasePlanDomain[]): Promise<void> {
    logger.info(
      `PlanRepository.upsertBasePlans called with ${basePlans.length} base plans`,
    )
    try {
      // Use transaction for consistency
      await this.prisma.$transaction(async (tx) => {
        for (const basePlan of basePlans) {
          logger.info(
            `Upserting base plan: ${basePlan.basePlanId} - ${basePlan.title}`,
          )
          await this.upsertSingleBasePlan(tx, basePlan)
        }
      })
      logger.info(`Successfully upserted ${basePlans.length} base plans`)
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error('Failed to upsert base plans:', appError)
      throw ErrorFactory.databaseError(
        'upsertBasePlans',
        'Failed to upsert base plans',
        appError,
      )
    }
  }

  /**
   * Upsert a single base plan with its plans and zones
   */
  private async upsertSingleBasePlan(
    tx: any,
    basePlan: BasePlanDomain,
  ): Promise<void> {
    // Upsert base plan
    const upsertedBasePlan = await tx.basePlan.upsert({
      where: { basePlanId: basePlan.basePlanId },
      update: {
        title: basePlan.title,
        sellMode: basePlan.sellMode as SellMode,
        organizerCompanyId: basePlan.organizerCompanyId,
        lastSeenAt: new Date(),
        deletedAt: null, // Undelete if it was soft deleted
      },
      create: {
        basePlanId: basePlan.basePlanId,
        title: basePlan.title,
        sellMode: basePlan.sellMode as SellMode,
        organizerCompanyId: basePlan.organizerCompanyId,
      },
    })

    // Process each plan (session) if they exist
    if (!basePlan.plans || basePlan.plans.length === 0) {
      return
    }

    for (const plan of basePlan.plans) {
      await this.upsertPlanWithZones(tx, upsertedBasePlan.id, plan)
    }
  }

  /**
   * Upsert a plan with its zones
   */
  private async upsertPlanWithZones(
    tx: any,
    basePlanId: string,
    plan: any,
  ): Promise<void> {
    // Calculate min/max prices from zones
    const { minPrice, maxPrice } = this.calculatePriceRange(plan.zones)

    // Upsert plan
    const upsertedPlan = await tx.plan.upsert({
      where: {
        basePlanId_planId: {
          basePlanId,
          planId: plan.planId,
        },
      },
      update: {
        planStartDate: plan.planStartDate,
        planEndDate: plan.planEndDate,
        sellFrom: plan.sellFrom,
        sellTo: plan.sellTo,
        soldOut: plan.soldOut,
        minPrice,
        maxPrice,
        lastSeenAt: new Date(),
        deletedAt: null, // Undelete if it was soft deleted
      },
      create: {
        basePlanId,
        planId: plan.planId,
        planStartDate: plan.planStartDate,
        planEndDate: plan.planEndDate,
        sellFrom: plan.sellFrom,
        sellTo: plan.sellTo,
        soldOut: plan.soldOut,
        minPrice,
        maxPrice,
      },
    })

    // Update zones
    await this.updatePlanZones(tx, upsertedPlan.id, plan.zones)
  }

  /**
   * Calculate min and max prices from zones
   */
  private calculatePriceRange(zones: any[] | undefined): {
    minPrice: number | null
    maxPrice: number | null
  } {
    if (!zones || zones.length === 0) {
      return { minPrice: null, maxPrice: null }
    }

    const prices = zones.map((z) => z.price)

    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }
  }

  /**
   * Update zones for a plan
   */
  private async updatePlanZones(
    tx: any,
    planId: string,
    zones: any[] | undefined,
  ): Promise<void> {
    // Delete existing zones
    await tx.zone.deleteMany({
      where: { planId },
    })

    // Create new zones if they exist
    if (!zones || zones.length === 0) {
      return
    }

    await tx.zone.createMany({
      data: zones.map((zone) => ({
        planId,
        zoneId: zone.zoneId,
        name: zone.name,
        capacity: zone.capacity,
        price: zone.price,
        numbered: zone.numbered,
      })),
    })
  }

  /**
   * Mark plans as deleted if they weren't in the latest sync
   * Soft delete to maintain history
   */
  async markMissingPlansAsDeleted(
    currentBasePlanIds: string[],
  ): Promise<number> {
    try {
      // Mark base plans as deleted if not in current list
      const result = await this.prisma.basePlan.updateMany({
        where: {
          basePlanId: { notIn: currentBasePlanIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      })

      return result.count
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error('Failed to mark missing plans as deleted:', appError)
      throw ErrorFactory.databaseError(
        'markMissingPlansAsDeleted',
        'Failed to mark missing plans as deleted',
        appError,
      )
    }
  }

  /**
   * Delete old plans for cleanup
   * Hard delete for old data
   */
  async deleteOldPlans(beforeDate: Date): Promise<number> {
    try {
      // Delete plans older than the specified date
      const result = await this.prisma.plan.deleteMany({
        where: {
          planEndDate: { lt: beforeDate },
        },
      })

      return result.count
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error('Failed to delete old plans:', appError)
      throw ErrorFactory.databaseError(
        'deleteOldPlans',
        'Failed to delete old plans',
        appError,
      )
    }
  }
}
