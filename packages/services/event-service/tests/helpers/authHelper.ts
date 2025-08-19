/**
 * Authentication Helper for Event Service Tests
 *
 * Provides an authenticated request client for API key authentication
 * Following the pattern from .project but adapted for API key auth
 */

import supertest from 'supertest'

type SuperTestRequest = ReturnType<typeof supertest>

/**
 * Authenticated Request Client for API key authentication
 * Provides a fluent interface that automatically adds API key to all requests
 *
 * Usage:
 * const authRequest = new AuthenticatedRequestClient(request, 'api-key')
 * const response = await authRequest.get('/search').query({...})
 */
export class AuthenticatedRequestClient {
  private request: SuperTestRequest
  private apiKey: string

  constructor(request: SuperTestRequest, apiKey?: string) {
    this.request = request
    this.apiKey = apiKey || process.env.API_KEY || 'test-fever-api-key'
  }

  /**
   * GET request with automatic API key authentication
   */
  get(url: string) {
    return this.request.get(url).set('x-api-key', this.apiKey)
  }

  /**
   * POST request with automatic API key authentication
   */
  post(url: string) {
    return this.request.post(url).set('x-api-key', this.apiKey)
  }

  /**
   * PUT request with automatic API key authentication
   */
  put(url: string) {
    return this.request.put(url).set('x-api-key', this.apiKey)
  }

  /**
   * PATCH request with automatic API key authentication
   */
  patch(url: string) {
    return this.request.patch(url).set('x-api-key', this.apiKey)
  }

  /**
   * DELETE request with automatic API key authentication
   */
  delete(url: string) {
    return this.request.delete(url).set('x-api-key', this.apiKey)
  }

  /**
   * HEAD request with automatic API key authentication
   */
  head(url: string) {
    return this.request.head(url).set('x-api-key', this.apiKey)
  }

  /**
   * OPTIONS request with automatic API key authentication
   */
  options(url: string) {
    return this.request.options(url).set('x-api-key', this.apiKey)
  }

  /**
   * Change the API key for subsequent requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Get the current API key
   */
  getApiKey(): string {
    return this.apiKey
  }

  /**
   * Get the underlying supertest instance (for direct access if needed)
   */
  getRequest(): SuperTestRequest {
    return this.request
  }
}

/**
 * Helper to create an authenticated request client with default API key
 */
export function createAuthenticatedClient(
  request: SuperTestRequest,
  apiKey?: string,
): AuthenticatedRequestClient {
  return new AuthenticatedRequestClient(request, apiKey)
}

/**
 * Helper to create an unauthenticated request (for testing 401 responses)
 * Just returns the original request without any modifications
 */
export function createUnauthenticatedClient(
  request: SuperTestRequest,
): SuperTestRequest {
  return request
}
