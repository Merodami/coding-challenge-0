# ADR-002: Redis Caching with 5-Minute TTL

## Status
Accepted

## Context
The external provider API has significant reliability issues:
- 36% failure rate (503 errors)
- Response times vary from 165ms to 4189ms
- Challenge requires <300ms response times
- Must work when provider is completely down

## Decision
We will use **Redis 8** as our caching layer with a **5-minute TTL** for all search responses.

## Consequences

### Positive
- **Guaranteed <300ms responses**: Cache hits return in ~10ms
- **Provider independence**: Service works even when provider is down
- **Reduced provider load**: Fewer requests to unreliable endpoint
- **Simple invalidation**: TTL-based expiry is straightforward
- **Scalable**: Redis handles thousands of requests per second

### Negative
- Data can be up to 5 minutes stale
- Additional infrastructure component to manage
- Memory consumption for cached responses

## Implementation Details

### Cache Key Strategy
```typescript
const cacheKey = `event:search:${starts_at || 'null'}:${ends_at || 'null'}`
```

### Cache Service Implementation
- Using `@fever/redis` package with decorators
- MemoryCacheService for testing
- RedisCacheService for production
- Automatic serialization/deserialization

### Cache Flow
1. Check Redis cache first (FAST PATH)
2. If miss, query PostgreSQL database
3. Cache the response with 5-minute TTL
4. Return response

### Configuration
```typescript
export const REDIS_EVENT_CACHE_TTL = 300 // 5 minutes in seconds
```

### Cache Invalidation
- Automatic expiry after 5 minutes
- Manual invalidation on successful sync
- Pattern-based deletion: `event:search:*`

## Alternatives Considered

### In-Memory Cache Only
- ❌ Lost on restart
- ❌ Not shared across instances
- ✅ Simpler setup

### Longer TTL (30 minutes)
- ❌ Too stale for real-time events
- ✅ Fewer database queries

### Shorter TTL (1 minute)
- ❌ More database load
- ✅ Fresher data

### No Cache
- ❌ Can't meet <300ms requirement
- ❌ Database overload at scale

## Performance Metrics
- Cache hit rate target: >90%
- Cache response time: <50ms
- Memory usage: ~100MB for 10,000 cached responses

## References
- Redis documentation on TTL
- Challenge requirement: <300ms response times
- Provider API analysis showing 36% failure rate