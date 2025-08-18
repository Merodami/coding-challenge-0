/**
 * Provider HTTP Client
 * Production-ready HTTP client using Axios with retry and circuit breaker
 */

import {
  PROVIDER_API_TIMEOUT,
  PROVIDER_API_URL,
  PROVIDER_MAX_RETRIES,
} from '@fever/environment'
import { createCircuitBreaker, ErrorFactory, logger } from '@fever/shared'
import axios, { AxiosError, AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'

export interface ProviderClientOptions {
  url?: string
  timeout?: number
  retries?: number
}

export class ProviderClient {
  private readonly axiosInstance: AxiosInstance
  private readonly circuitBreaker: any
  private readonly timeout: number

  constructor(options: ProviderClientOptions = {}) {
    const {
      url = PROVIDER_API_URL,
      timeout = PROVIDER_API_TIMEOUT,
      retries = PROVIDER_MAX_RETRIES,
    } = options

    this.timeout = timeout

    // Create Axios instance with production settings
    this.axiosInstance = axios.create({
      baseURL: url,
      timeout,
      headers: {
        Accept: 'application/xml',
        'User-Agent': 'Fever-Event-Service/1.0',
        Connection: 'keep-alive',
      },
      // Validate status codes - only 2xx are successful
      validateStatus: (status) => status >= 200 && status < 300,
    })

    // Configure retry strategy
    axiosRetry(this.axiosInstance, {
      retries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        // Retry on network errors and 5xx server errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        )
      },
      onRetry: (retryCount, error) => {
        logger.warn(
          `Retrying provider request - attempt ${retryCount}: ${error.message}`,
        )
      },
    })

    // Wrap in circuit breaker using our shared implementation
    this.circuitBreaker = createCircuitBreaker(this.makeRequest.bind(this), {
      name: 'provider-api-client',
    })
  }

  /**
   * Fetch events XML from provider API with circuit breaker protection
   */
  async fetchEvents(): Promise<string> {
    logger.info('ProviderClient.fetchEvents called')
    try {
      return await this.circuitBreaker.fire()
    } catch (error) {
      // Circuit breaker will handle fallback, but if that fails too...
      logger.error(
        `Provider client failed completely: ${(error as Error).message}`,
      )
      throw this.transformError(error)
    }
  }

  /**
   * Internal method to make the actual HTTP request
   */
  private async makeRequest(): Promise<string> {
    const startTime = Date.now()

    try {
      logger.debug('Making request to provider API')

      const response = await this.axiosInstance.get('')

      const responseTime = Date.now() - startTime

      logger.info(
        `Provider API request successful - ${responseTime}ms, status: ${response.status}`,
      )

      return response.data
    } catch (error) {
      const responseTime = Date.now() - startTime

      if (axios.isAxiosError(error)) {
        logger.error(
          `Provider API request failed - ${responseTime}ms, status: ${error.response?.status}, ${error.message}`,
        )

        // Transform Axios errors to our domain errors
        throw this.transformAxiosError(error)
      }

      throw error
    }
  }

  /**
   * Health check without triggering circuit breaker
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.head('', { timeout: 5000 })

      return response.status >= 200 && response.status < 400
    } catch (error) {
      logger.debug(
        `Provider health check failed: ${axios.isAxiosError(error) ? error.message : String(error)}`,
      )

      return false
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.circuitBreaker.opened
        ? 'open'
        : this.circuitBreaker.halfOpen
          ? 'half-open'
          : 'closed',
      stats: this.circuitBreaker.stats,
    }
  }

  /**
   * Transform Axios errors to domain errors
   */
  private transformAxiosError(error: AxiosError): Error {
    if (error.code === 'ECONNABORTED') {
      return ErrorFactory.timeoutError('Provider API request', this.timeout)
    }

    if (!error.response) {
      return ErrorFactory.externalServiceError(
        'Provider API',
        'fetch',
        'Network error or service unavailable',
      )
    }

    const { status, statusText } = error.response

    if (status === 503) {
      return ErrorFactory.externalServiceError(
        'Provider API',
        'fetch',
        'Service temporarily unavailable',
      )
    }

    if (status >= 500) {
      return ErrorFactory.externalServiceError(
        'Provider API',
        'fetch',
        `Server error: ${status} ${statusText}`,
      )
    }

    if (status >= 400) {
      return ErrorFactory.externalServiceError(
        'Provider API',
        'fetch',
        `Client error: ${status} ${statusText}`,
      )
    }

    return ErrorFactory.externalServiceError(
      'Provider API',
      'fetch',
      error.message,
    )
  }

  /**
   * Transform general errors
   */
  private transformError(error: any): Error {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorFactory.externalServiceError(
        'Provider API',
        'fetch',
        'Network connection failed',
      )
    }

    return error instanceof Error ? error : new Error(String(error))
  }
}
