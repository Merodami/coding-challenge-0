# ADR-003: Circuit Breaker for Provider Resilience

## Status
Accepted

## Context
The external provider API is highly unreliable:
- 36% of requests fail with 503 errors
- Response times can exceed 4 seconds
- The service must remain available even when provider is down
- We cannot wait for slow provider responses

## Decision
We will implement the **Circuit Breaker pattern** using the **Opossum** library to handle provider failures gracefully.

## Consequences

### Positive
- **Fail fast**: Don't wait for timeouts when provider is down
- **Automatic recovery**: Circuit reopens when provider recovers
- **System protection**: Prevents cascading failures
- **Metrics**: Built-in statistics for monitoring
- **Battle-tested**: Opossum is a mature, production-ready library

### Negative
- Additional complexity in the service layer
- Need to tune thresholds based on actual behavior
- Potential for false positives (circuit opening unnecessarily)

## Implementation Details

### Circuit Breaker Configuration
```typescript
const circuitBreakerOptions = {
  timeout: 3000,                    // 3 second timeout
  errorThresholdPercentage: 50,     // Open at 50% error rate
  resetTimeout: 30000,               // Try again after 30 seconds
  volumeThreshold: 10,               // Minimum 10 requests before opening
  name: 'provider-api-breaker'
}
```

### Circuit States
1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: Too many failures, requests immediately rejected
3. **HALF-OPEN**: Testing if service recovered

### Integration with Service Layer
```typescript
class PlanService {
  constructor() {
    this.providerCircuitBreaker = createCircuitBreaker(
      this.fetchFromProvider.bind(this),
      circuitBreakerOptions
    )
  }

  async syncEventsFromProvider() {
    try {
      const basePlans = await this.providerCircuitBreaker.fire()
      // Process data...
    } catch (error) {
      // Circuit is open or request failed
      // Continue serving from cache/database
      return { success: true, errorMessage: 'Provider unavailable, serving from cache' }
    }
  }
}
```

### Monitoring Events
```typescript
circuitBreaker.on('open', () => {
  logger.warn('Provider circuit breaker opened - using cached data only')
})

circuitBreaker.on('halfOpen', () => {
  logger.info('Provider circuit breaker half-open, testing connection...')
})
```

## Alternatives Considered

### Retry with Exponential Backoff Only
- ❌ Still waits for slow responses
- ❌ No protection against sustained failures
- ✅ Simpler implementation

### Custom Circuit Breaker
- ❌ More code to maintain
- ❌ Risk of bugs in critical path
- ✅ Full control over behavior

### No Circuit Breaker
- ❌ Service degrades when provider is slow
- ❌ Can't meet <300ms SLA
- ✅ Simpler architecture

## Metrics to Monitor
- Circuit state (open/closed/half-open)
- Error rate percentage
- Request volume
- Timeout occurrences
- Recovery success rate

## References
- [Opossum Documentation](https://github.com/nodeshift/opossum)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- Provider API analysis: 36% failure rate, 4+ second response times