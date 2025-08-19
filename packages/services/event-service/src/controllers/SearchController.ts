/**
 * Search Controller
 * Handles HTTP requests for event search endpoint
 */

import { type EventSearchQuery } from '@fever/api'
import { PAGINATION_DEFAULT_LIMIT } from '@fever/environment'
import { getValidatedQuery } from '@fever/http'
import type { NextFunction, Request, Response } from 'express'

import type { IPlanService } from '../types/interfaces.js'

export class SearchController {
  constructor(private readonly planService: IPlanService) {
    // Bind methods to preserve 'this' context
    this.searchEvents = this.searchEvents.bind(this)
  }

  /**
   * GET /search
   * Search for events based on date range
   */
  async searchEvents(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Get validated query parameters
      const query = getValidatedQuery<EventSearchQuery>(req)

      // Ensure pagination defaults are applied
      const searchParams = {
        ...query,
        page: query.page || 1,
        limit: query.limit || PAGINATION_DEFAULT_LIMIT,
      }

      // Search events with pagination
      const response = await this.planService.searchEvents(searchParams)

      // Return response (already in correct format)
      res.json(response)
    } catch (error) {
      next(error)
    }
  }
}
