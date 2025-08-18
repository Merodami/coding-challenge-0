# ADR-008: Artillery for Performance Testing

## Status
Accepted

## Context
The Event Service must meet strict performance requirements:
- Sub-300ms response times for the search API
- Handle high traffic loads (5k-10k requests/second potential)
- Maintain performance even when external providers are down or slow
- Validate performance under various load patterns (sustained, spike, stress)

We need a reliable, comprehensive performance testing strategy that can:
- Simulate realistic user behaviors and traffic patterns
- Test different endpoints with appropriate load distributions
- Validate response time requirements under load
- Provide detailed performance metrics and reports
- Integrate with CI/CD pipelines
- Work across different environments (local, staging, production)

## Decision
We will use **Artillery** as our primary performance testing tool for validating the Event Service's performance characteristics.

## Alternatives Considered

### 1. Apache Bench (ab)
- **Pros**: Simple, lightweight, built-in on most systems
- **Cons**: Limited scenarios, no complex workflows, basic reporting

### 2. JMeter
- **Pros**: Full-featured GUI, extensive protocol support
- **Cons**: Heavy Java dependency, complex setup, XML configuration

### 3. k6
- **Pros**: JavaScript-based, modern, good reporting
- **Cons**: Different syntax, smaller ecosystem, less mature plugins

### 4. Gatling
- **Pros**: High performance, detailed reports, Scala DSL
- **Cons**: JVM dependency, steep learning curve, complex setup

### 5. wrk
- **Pros**: Very fast, lightweight, scriptable with Lua
- **Cons**: Limited built-in functionality, requires Lua knowledge

### 6. Autocannon
- **Pros**: Node.js native, fast, simple
- **Cons**: Limited scenario capabilities, basic reporting

## Rationale

Artillery was selected because:

### Technical Advantages
- **JavaScript/Node.js Native**: Aligns with our TypeScript/Node.js stack
- **Scenario-Driven**: Supports complex user journeys and workflows
- **Performance**: High throughput with efficient resource usage
- **Flexibility**: YAML configuration with JavaScript processors
- **Real-world Simulation**: Think times, data from CSV, conditional logic

### Testing Capabilities
- **Multi-phase Testing**: Warm-up, ramp-up, sustained load, stress, spike testing
- **Weighted Scenarios**: Different user behaviors with realistic distributions
- **Response Validation**: Status codes, response times, JSON content validation
- **Data-driven**: CSV payload support for realistic test data

### Operational Benefits
- **Cross-platform**: Works on Windows, Mac, Linux
- **CI/CD Integration**: Easy integration with npm scripts and CI pipelines
- **Reporting**: Built-in metrics, custom processors, external integrations
- **Extensibility**: Plugin system for custom functionality

## Implementation Details

### Test Configuration Structure
```yaml
config:
  target: 'http://localhost:5500'
  phases:
    - duration: 30, arrivalRate: 10    # Warm-up
    - duration: 60, arrivalRate: 50    # Ramp-up
    - duration: 300, arrivalRate: 100  # Sustained Load
    - duration: 120, arrivalRate: 200  # Stress Test
    - duration: 30, arrivalRate: 500   # Spike Test

scenarios:
  - weight: 70, name: 'Search Events'     # Primary use case
  - weight: 15, name: 'Trigger Sync'     # Background operations
  - weight: 10, name: 'Health Check'     # Monitoring traffic
  - weight: 5, name: 'Mixed Operations'  # Edge cases
```

### Performance Validation
- **Response Time Expectations**: P95 < 300ms, P99 < 500ms, Max < 1000ms
- **Throughput Testing**: Up to 500 requests/second sustained
- **Realistic Load Distribution**: 70% search, 15% sync, 10% health, 5% mixed
- **Error Rate Monitoring**: < 1% error rate under normal load

### Test Suite Organization
1. **Smoke Tests** (`artillery-smoke.yml`): Quick validation, 30 seconds
2. **Performance Tests** (`artillery-config.yml`): Full load testing, 8+ minutes
3. **Custom Processors** (`artillery-processor.js`): Response validation logic
4. **Test Data** (`test-data.csv`): Realistic date ranges and parameters

## Consequences

### Positive
- ✅ **Comprehensive Testing**: Multi-phase testing covers all load scenarios
- ✅ **Realistic Simulation**: Weighted scenarios mirror real user behavior
- ✅ **Performance Validation**: Enforces sub-300ms response time requirements
- ✅ **Developer Friendly**: JavaScript/YAML configuration familiar to team
- ✅ **CI/CD Ready**: npm scripts integrate with existing build pipeline
- ✅ **Scalability Validation**: Tests system limits and scaling characteristics

### Negative
- ❌ **Learning Curve**: Team needs to understand Artillery concepts and YAML syntax
- ❌ **Resource Requirements**: Performance tests require significant CPU/memory
- ❌ **Environment Dependency**: Requires full system setup (app, database, Redis)

### Mitigation Strategies
- **Documentation**: Comprehensive testing guide in `STRESS_TESTING_INSTRUCTIONS.md`
- **Automation**: npm scripts simplify test execution
- **Environment Setup**: Docker Compose ensures consistent test environments
- **Staged Testing**: Smoke tests provide quick feedback, full tests for validation

## Testing Strategy

### Load Patterns
1. **Warm-up Phase**: Ensure JIT compilation and cache warming
2. **Ramp-up Phase**: Gradual load increase to identify bottlenecks
3. **Sustained Load**: Validate steady-state performance
4. **Stress Testing**: Identify breaking points and error handling
5. **Spike Testing**: Validate auto-scaling and burst handling
6. **Cool-down Phase**: Verify system recovery

### Success Criteria
- Search API: P95 response time < 300ms under 100 RPS
- Internal APIs: P95 response time < 100ms
- Health endpoints: P95 response time < 50ms
- Error rate < 1% under normal load
- No memory leaks during sustained load
- Graceful degradation under extreme load

## Related Decisions
- [ADR-002: Redis Caching Strategy](002-caching-strategy.md) - Performance optimization
- [ADR-003: Circuit Breaker Pattern](003-circuit-breaker-pattern.md) - Resilience under load
- [ADR-007: BullMQ Queue System](007-bullmq-queue-system.md) - Background processing impact

## Implementation Status
- ✅ Artillery configuration files created
- ✅ Multi-phase test scenarios implemented
- ✅ Custom processors for response validation
- ✅ npm scripts for test execution
- ✅ Performance requirements documentation
- ✅ CI/CD integration ready

## References
- [Artillery Documentation](https://artillery.io/docs/)
- [Performance Testing Strategy](../../packages/services/event-service/tests/PERFORMANCE_TESTING_STRATEGY.md)
- [Stress Testing Instructions](../../packages/services/event-service/STRESS_TESTING_INSTRUCTIONS.md)
- [Challenge Performance Requirements](../../.docs/CHALLENGE/CHALLENGE.md)