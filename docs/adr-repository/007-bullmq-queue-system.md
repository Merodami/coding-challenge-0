# ADR-007: BullMQ for Background Job Processing

## Status
Accepted

## Context
The Event Service needs to synchronize data from external providers that are unreliable (36% failure rate, 4+ second response times). The core API must maintain sub-300ms response times while handling background synchronization tasks that should not block user requests.

Key requirements:
- Background processing of provider synchronization
- Resilience to provider failures and slow responses
- Scalability for high-volume event processing
- Reliable job execution with retry mechanisms
- Observability and monitoring capabilities
- Integration with existing Redis infrastructure

## Decision
We will use **BullMQ** as our background job processing system for handling provider synchronization tasks.

## Alternatives Considered

### 1. Direct Synchronous Processing
- **Pros**: Simple implementation
- **Cons**: Blocks API responses, fails to meet 300ms requirement, no retry mechanism

### 2. Simple setTimeout/setInterval
- **Pros**: No external dependencies
- **Cons**: No persistence, no retry logic, doesn't survive restarts, poor monitoring

### 3. Agenda.js
- **Pros**: MongoDB-based, mature
- **Cons**: Requires additional database, less performant, not Redis-native

### 4. Kue (Redis-based)
- **Pros**: Redis-based, mature
- **Cons**: Not actively maintained, fewer features than BullMQ

### 5. Bee-Queue
- **Pros**: Lightweight, Redis-based
- **Cons**: Limited features, no built-in UI, less active development

## Rationale

BullMQ was selected because:

### Technical Advantages
- **Redis-native**: Leverages existing Redis infrastructure, reducing operational complexity
- **High Performance**: Optimized for throughput and low latency
- **Reliability**: Built-in retry mechanisms with exponential backoff
- **Scalability**: Supports multiple workers and horizontal scaling
- **Persistence**: Jobs survive application restarts
- **Rate Limiting**: Built-in rate limiting to respect provider constraints

### Operational Benefits
- **Monitoring**: Rich job statistics and observability
- **Dead Letter Queue**: Failed jobs are preserved for debugging
- **Job Priority**: Support for prioritizing critical sync operations
- **Delayed Jobs**: Can schedule syncs at optimal times
- **Concurrency Control**: Prevents overwhelming external providers

### Implementation Details
```typescript
// Queue Configuration
const queue = new Queue('event-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 500, age: 7 * 24 * 3600 }
  }
})

// Worker Configuration
const worker = new Worker('event-sync', jobProcessor, {
  connection: redisConnection,
  concurrency: 1, // Single sync to avoid overwhelming provider
  limiter: { max: 10, duration: 60000 } // Rate limiting
})
```

## Consequences

### Positive
- ✅ **Performance**: API responses remain fast (<300ms) regardless of provider status
- ✅ **Reliability**: Automatic retries with exponential backoff handle provider failures
- ✅ **Scalability**: Can scale workers independently of API servers
- ✅ **Observability**: Rich job statistics for monitoring and debugging
- ✅ **Operational Excellence**: Jobs survive restarts and can be prioritized
- ✅ **Resource Efficiency**: Single Redis instance serves both caching and queuing

### Negative
- ❌ **Complexity**: Additional moving parts compared to synchronous processing
- ❌ **Dependency**: Requires Redis to be operational for job processing
- ❌ **Learning Curve**: Team needs to understand queue concepts and BullMQ APIs

### Mitigation Strategies
- **Monitoring**: Implement comprehensive queue health checks and alerting
- **Graceful Degradation**: API continues serving cached data even if queue is down
- **Documentation**: Maintain clear runbooks for queue operations
- **Testing**: Comprehensive integration tests for queue scenarios

## Related Decisions
- [ADR-002: Redis Caching Strategy](002-caching-strategy.md) - Redis infrastructure
- [ADR-003: Circuit Breaker Pattern](003-circuit-breaker-pattern.md) - Provider resilience

## Implementation Status
- ✅ Queue system moved to dedicated `event-service-worker` package for scalability
- ✅ `SyncWorkerService` with proper job processing
- ✅ `QueueService` for queue management and development sync
- ✅ Integration tests covering queue scenarios
- ✅ Monitoring and observability features  
- ✅ Independent service deployment capability

## Service Separation
The BullMQ implementation has been moved to a dedicated `event-service-worker` package, enabling:
- **Independent Scaling**: Worker can scale separately from API service
- **Isolation**: Worker failures don't affect API responsiveness
- **Specialization**: Each service focuses on its core responsibility

## References
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Provider Challenge Requirements](../../.docs/CHALLENGE/CHALLENGE.md)
- [Worker Implementation](../../packages/services/event-service-worker/src/services/SyncWorkerService.ts)
- [Queue Service](../../packages/services/event-service-worker/src/services/QueueService.ts)