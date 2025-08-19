/**
 * Search Routes
 * Defines the HTTP routes for the event search API
 */

import { EventSearchQuerySchema } from '@fever/api'
import { optionalApiKey, validateQuery } from '@fever/http'
import { Router } from 'express'

import type { SearchController } from '../controllers/SearchController.js'

export function createSearchRoutes(searchController: SearchController): Router {
  const routes = new SearchRoutes(searchController)

  return routes.getRouter()
}

export class SearchRoutes {
  private router: Router

  constructor(private readonly searchController: SearchController) {
    this.router = Router()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    /**
     * GET /search
     * Search for events based on date range
     * Matches Swagger specification exactly
     * Protected by API key when REQUIRE_API_KEY=true
     */
    this.router.get(
      '/search',
      optionalApiKey(),
      validateQuery(EventSearchQuerySchema),
      this.searchController.searchEvents,
    )
  }

  getRouter(): Router {
    return this.router
  }
}
