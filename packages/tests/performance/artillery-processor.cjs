/**
 * Artillery Processor
 *
 * Custom functions for Artillery tests
 */

/* global module, console */

module.exports = {
  /**
   * Generate random date range
   */
  generateDateRange: function (context, events, done) {
    const ranges = [
      { starts: '2021-01-01T00:00:00Z', ends: '2021-01-31T23:59:59Z' },
      { starts: '2021-01-01T00:00:00Z', ends: '2021-03-31T23:59:59Z' },
      { starts: '2021-01-01T00:00:00Z', ends: '2021-06-30T23:59:59Z' },
      { starts: '2021-01-01T00:00:00Z', ends: '2021-12-31T23:59:59Z' },
      { starts: '2020-01-01T00:00:00Z', ends: '2022-12-31T23:59:59Z' },
    ]

    const range = ranges[Math.floor(Math.random() * ranges.length)]

    context.vars.starts_at = range.starts
    context.vars.ends_at = range.ends

    return done()
  },

  /**
   * Before request hook - add custom headers or modify request
   */
  beforeRequest: function (requestParams, context, ee, next) {
    // Add correlation ID
    requestParams.headers['X-Correlation-ID'] =
      `artillery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Log high-level request info if needed
    if (process.env.ARTILLERY_DEBUG) {
      console.log(
        `[${new Date().toISOString()}] ${requestParams.method} ${requestParams.url}`,
      )
    }

    return next()
  },

  /**
   * After response hook - process response data
   */
  afterResponse: function (requestParams, response, context, ee, next) {
    // Track custom metrics
    if (response.statusCode !== 200) {
      ee.emit('counter', 'http.errors.' + response.statusCode, 1)
    }

    // Track response times by endpoint
    const endpoint = requestParams.url.split('?')[0]

    ee.emit(
      'histogram',
      'response_time.' + endpoint.replace(/\//g, '_'),
      response.timings.phases.firstByte,
    )

    // Check for circuit breaker state in response headers
    if (response.headers && response.headers['x-circuit-breaker-state']) {
      ee.emit(
        'counter',
        'circuit_breaker.' + response.headers['x-circuit-breaker-state'],
        1,
      )
    }

    return next()
  },

  /**
   * Generate random sync parameters
   */
  generateSyncParams: function (context, events, done) {
    context.vars.syncForce = Math.random() > 0.5
    context.vars.syncPriority = Math.floor(Math.random() * 10) + 1
    context.vars.syncDelay = Math.random() > 0.8 ? 5000 : 0

    return done()
  },

  /**
   * Setup function - runs once before all tests
   */
  setupTest: function (context, events, done) {
    console.log('🚀 Starting Artillery performance test')
    console.log(`📍 Target: ${context.vars.target || 'http://localhost:5520'}`)
    console.log(`⏱️  Time: ${new Date().toISOString()}`)

    // You could check service health here
    return done()
  },

  /**
   * Teardown function - runs once after all tests
   */
  teardownTest: function (context, events, done) {
    console.log('✅ Artillery performance test completed')
    console.log(`⏱️  Time: ${new Date().toISOString()}`)

    return done()
  },
}
