/**
 * Service Authentication Helper for Internal API Tests
 *
 * Provides an authenticated request client for service-to-service API authentication
 * Uses x-service-api-key header for internal endpoints
 */

import supertest from 'supertest'

type SuperTestRequest = ReturnType<typeof supertest>

/**
 * Service Authenticated Request Client for internal API authentication
 * Provides a fluent interface that automatically adds service API key to all requests
 *
 * Usage:
 * const serviceRequest = new ServiceAuthenticatedRequestClient(request, 'service-key')
 * const response = await serviceRequest.get('/internal/sync/status')
 */
export class ServiceAuthenticatedRequestClient {
  private request: SuperTestRequest
  private serviceApiKey: string

  constructor(request: SuperTestRequest, serviceApiKey?: string) {
    this.request = request
    this.serviceApiKey =
      serviceApiKey || process.env.SERVICE_API_KEY || 'test-service-api-key'
  }

  /**
   * GET request with automatic service API key authentication
   */
  get(url: string) {
    return this.request.get(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * POST request with automatic service API key authentication
   */
  post(url: string) {
    return this.request.post(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * PUT request with automatic service API key authentication
   */
  put(url: string) {
    return this.request.put(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * PATCH request with automatic service API key authentication
   */
  patch(url: string) {
    return this.request.patch(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * DELETE request with automatic service API key authentication
   */
  delete(url: string) {
    return this.request.delete(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * HEAD request with automatic service API key authentication
   */
  head(url: string) {
    return this.request.head(url).set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * OPTIONS request with automatic service API key authentication
   */
  options(url: string) {
    return this.request
      .options(url)
      .set('x-service-api-key', this.serviceApiKey)
  }

  /**
   * Change the service API key for subsequent requests
   */
  setServiceApiKey(serviceApiKey: string): void {
    this.serviceApiKey = serviceApiKey
  }

  /**
   * Get the current service API key
   */
  getServiceApiKey(): string {
    return this.serviceApiKey
  }

  /**
   * Get the underlying supertest instance (for direct access if needed)
   */
  getRequest(): SuperTestRequest {
    return this.request
  }
}

/**
 * Helper to create a service authenticated request client with default service API key
 */
export function createServiceAuthenticatedClient(
  request: SuperTestRequest,
  serviceApiKey?: string,
): ServiceAuthenticatedRequestClient {
  return new ServiceAuthenticatedRequestClient(request, serviceApiKey)
}

/**
 * Helper to create an unauthenticated request (for testing 401 responses)
 * Just returns the original request without any modifications
 */
export function createUnauthenticatedServiceClient(
  request: SuperTestRequest,
): SuperTestRequest {
  return request
}
