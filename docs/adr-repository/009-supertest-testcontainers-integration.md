# ADR-006: SuperTest with TestContainers for End-to-End API Testing

## Status

Accepted

## Context

Our Event Service requires comprehensive end-to-end API testing to ensure:

1. **API Contract Compliance**: All endpoints behave according to OpenAPI specifications
2. **Database Integration**: Verify complete data flow from HTTP requests to database persistence
3. **External Provider Integration**: Test real interactions with provider endpoints
4. **Error Handling**: Validate error responses and status codes under various failure scenarios
5. **Performance Characteristics**: Ensure response times meet the <300ms requirement

Currently, our testing strategy includes:
- Unit tests for individual components
- Integration tests with mocked dependencies
- Component integration tests with real services

However, we lack true end-to-end testing that validates the complete HTTP request/response cycle with real infrastructure.

## Decision

We will implement **SuperTest** with **TestContainers** for comprehensive end-to-end API testing of the Event Service.

### Technology Choices

#### SuperTest
- **HTTP Testing Framework**: Provides high-level abstraction for testing HTTP assertions
- **Express Integration**: Native support for testing Express applications
- **Fluent API**: Chainable assertions for request/response validation
- **Built-in Expectations**: Status codes, headers, response body validation

#### TestContainers
- **Real Infrastructure**: Spin up actual PostgreSQL and Redis containers for tests
- **Isolation**: Each test suite gets fresh database instances
- **Reproducibility**: Identical testing environment across all machines
- **CI/CD Ready**: Works seamlessly in GitHub Actions and other CI systems

### Implementation Architecture

```typescript
// Test setup with TestContainers
beforeAll(async () => {
  // Start PostgreSQL container
  postgresContainer = await new PostgreSQLContainer()
    .withDatabase('event_service_test')
    .withUsername('testuser')
    .withPassword('testpass')
    .start()

  // Start Redis container
  redisContainer = await new GenericContainer('redis:8-alpine')
    .withExposedPorts(6379)
    .start()

  // Configure application with test containers
  process.env.DATABASE_URL = postgresContainer.getConnectionString()
  process.env.REDIS_URL = `redis://localhost:${redisContainer.getMappedPort(6379)}`

  // Initialize application
  app = await createTestApp()
})

// SuperTest integration
test('GET /search should return events within date range', async () => {
  await request(app)
    .get('/search')
    .query({
      starts_at: '2024-01-01T00:00:00Z',
      ends_at: '2024-12-31T23:59:59Z'
    })
    .expect(200)
    .expect('Content-Type', /json/)
    .expect((res) => {
      expect(res.body).toMatchSchema(SearchSuccessResponseSchema)
      expect(res.body.data.events).toBeArray()
    })
})
```

## Benefits

### 1. **True Integration Testing**
- Tests actual HTTP requests/responses through the full application stack
- Validates serialization/deserialization of request/response bodies
- Ensures middleware execution order and behavior

### 2. **Real Infrastructure Testing**
- Database operations tested against actual PostgreSQL instances
- Redis caching behavior validated with real Redis containers
- Network interactions tested realistically

### 3. **API Contract Validation**
- Automatically validates responses against OpenAPI schemas
- Ensures status codes match specifications
- Verifies header behavior and content types

### 4. **Performance Validation**
- Measure actual response times under realistic conditions
- Identify performance bottlenecks in the full request pipeline
- Validate caching effectiveness

### 5. **Error Scenario Testing**
- Test database connection failures
- Validate circuit breaker behavior with real timeouts
- Verify error response formats and status codes

### 6. **CI/CD Integration**
- TestContainers work seamlessly in GitHub Actions
- No external service dependencies for test execution
- Parallelizable test execution

## Drawbacks

### 1. **Test Execution Time**
- Container startup adds ~5-10 seconds per test suite
- Slightly slower than pure unit tests
- Mitigated by running containers once per test file

### 2. **Resource Requirements**
- Requires Docker runtime for test execution
- Higher memory usage during test runs
- Additional complexity in test setup

### 3. **Debugging Complexity**
- Multiple moving parts (app + containers)
- Container logs may need inspection for failures
- Network issues more difficult to diagnose

## Implementation Plan

### Phase 1: Foundation Setup
1. Add SuperTest and TestContainers dependencies
2. Create test utilities for container management
3. Implement base test setup and teardown

### Phase 2: Core API Testing
1. Test `/search` endpoint with various query parameters
2. Validate error responses (400, 500 status codes)
3. Test request validation and error handling

### Phase 3: Database Integration
1. Test data persistence and retrieval
2. Validate database transaction behavior
3. Test concurrent request handling

### Phase 4: External Provider Integration
1. Mock external provider responses
2. Test circuit breaker behavior
3. Validate cache hit/miss scenarios

### Phase 5: Performance and Load Testing
1. Response time validation
2. Concurrent request testing
3. Cache performance validation

## Alternatives Considered

### 1. **Jest + Supertest (without TestContainers)**
- **Pros**: Faster test execution, simpler setup
- **Cons**: Requires external database setup, less realistic testing
- **Rejected**: Doesn't provide true integration testing benefits

### 2. **Playwright/Cypress E2E Testing**
- **Pros**: Full browser-based testing
- **Cons**: Overkill for API-only service, slower execution
- **Rejected**: Service doesn't have frontend components

### 3. **Newman (Postman CLI)**
- **Pros**: Can reuse Postman collections
- **Cons**: Less integration with TypeScript ecosystem
- **Rejected**: Doesn't provide the same level of test integration

## Success Metrics

### 1. **Test Coverage**
- 100% of public API endpoints covered
- All error scenarios tested
- Database integration validated

### 2. **Test Reliability**
- <1% flaky test rate
- Consistent test execution times
- Reliable container startup/teardown

### 3. **Development Velocity**
- Fast feedback loop for API changes
- Easy debugging of test failures
- Clear test failure messages

## Conclusion

SuperTest with TestContainers provides the optimal balance of realistic testing with manageable complexity. This approach ensures our Event Service APIs are thoroughly tested against real infrastructure while maintaining fast feedback loops for developers.

The implementation will complement our existing unit and integration tests, providing comprehensive test coverage across all layers of the application stack.

## References

- [SuperTest Documentation](https://github.com/ladjs/supertest)
- [TestContainers Node.js](https://node.testcontainers.org/)
- [Testing Node.js Applications Best Practices](https://blog.risingstack.com/node-js-testing-guide/)
- [API Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)