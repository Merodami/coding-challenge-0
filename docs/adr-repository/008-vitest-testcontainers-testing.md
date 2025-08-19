# ADR-009: Vitest and Testcontainers Testing Stack

## Status
Accepted

## Context
The Event Service requires a comprehensive testing strategy that can:
- Validate complex business logic with unit tests
- Test integration scenarios with real databases and external services
- Ensure API contract compliance with actual HTTP requests
- Provide fast feedback during development
- Support CI/CD pipelines with reliable, isolated test environments
- Handle database state management and cleanup between tests
- Test resilience patterns (circuit breakers, retries, caching)

Traditional testing approaches either sacrifice speed (slower integration tests) or accuracy (mocked dependencies). We need a modern testing stack that provides both fast execution and realistic test environments.

## Decision
We will use **Vitest** as our primary testing framework combined with **Testcontainers** for integration testing with real infrastructure components.

## Alternatives Considered

### Testing Frameworks

#### 1. Jest
- **Pros**: Mature ecosystem, extensive mocking, snapshot testing
- **Cons**: Slower startup, CommonJS focus, complex ESM support

#### 2. Mocha + Chai
- **Pros**: Flexible, modular, mature
- **Cons**: Requires more setup, less opinionated, fragmented ecosystem

#### 3. Node.js Test Runner (built-in)
- **Pros**: No dependencies, native support
- **Cons**: Limited features, basic assertion library

#### 4. Ava
- **Pros**: Parallel by default, minimal API
- **Cons**: Different syntax, smaller ecosystem

### Integration Testing Approaches

#### 1. In-Memory Databases (SQLite)
- **Pros**: Fast, no setup required
- **Cons**: Different SQL dialect, doesn't test production scenarios

#### 2. Shared Test Database
- **Pros**: Real database engine
- **Cons**: Test isolation issues, state pollution, race conditions

#### 3. Database Per Test
- **Pros**: Perfect isolation
- **Cons**: Slow setup/teardown, resource intensive

#### 4. Docker Compose Setup
- **Pros**: Real services, controlled environment
- **Cons**: Manual lifecycle management, slower, port conflicts

#### 5. Mocked Database/Redis
- **Pros**: Fast, predictable
- **Cons**: Doesn't test real queries, integration bugs missed

## Rationale

### Vitest Selection

**Performance Advantages**:
- **Vite-powered**: Extremely fast HMR and module resolution
- **ESM Native**: Perfect alignment with our ES modules setup
- **TypeScript First**: Zero-config TypeScript support
- **Watch Mode**: Instant feedback during development

**Developer Experience**:
- **Jest-compatible API**: Easy migration and familiar syntax
- **Built-in Coverage**: Native coverage reporting with v8
- **Snapshot Testing**: Built-in snapshot capabilities
- **Parallel Execution**: Tests run in parallel by default

**Modern Features**:
- **Native ESM**: No transpilation overhead
- **Workspace Support**: Perfect for monorepo testing
- **Configuration**: Minimal setup, convention over configuration

### Testcontainers Selection

**Real Environment Benefits**:
- **Production Parity**: Tests run against actual PostgreSQL and Redis
- **Isolation**: Each test suite gets fresh containers
- **Consistency**: Same environment locally and in CI
- **Reliability**: No shared state between test runs

**Operational Advantages**:
- **Automatic Lifecycle**: Containers start/stop automatically
- **Port Management**: Handles port allocation and conflicts
- **Cleanup**: Guaranteed container cleanup after tests
- **Multi-service**: Can spin up complex service topologies

## Implementation Details

### Test Architecture
```typescript
// Unit Tests: Fast, isolated business logic
describe('PlanTransformer', () => {
  it('should transform provider data correctly', () => {
    // Pure function testing, no external dependencies
  })
})

// Integration Tests: Real infrastructure
describe('Event Service Integration', () => {
  let testDb: TestDatabaseResult
  let cacheService: MemoryCacheService
  
  beforeAll(async () => {
    testDb = await createTestDatabase({
      databaseName: 'event_service_test',
      initSqlPath: 'tests/fixtures/init.sql'
    })
    // Real PostgreSQL container running
  })
})
```

### Test Categories

#### 1. Unit Tests (`*.test.ts`)
- **Scope**: Pure functions, business logic, transformers
- **Speed**: < 5ms per test
- **Dependencies**: None (mocked where necessary)
- **Coverage**: 80%+ of business logic

#### 2. Integration Tests (`*.integration.test.ts`)
- **Scope**: Database operations, API endpoints, service interactions
- **Speed**: 50-200ms per test
- **Dependencies**: Real PostgreSQL, Redis via Testcontainers
- **Coverage**: All repository methods, service integrations

#### 3. End-to-End Tests (`*.e2e.test.ts`)
- **Scope**: Complete user journeys, API contracts
- **Speed**: 200-500ms per test
- **Dependencies**: Full application stack
- **Coverage**: Critical user paths

#### 4. Performance Tests (Artillery)
- **Scope**: Load testing, response times, throughput
- **Duration**: Minutes
- **Dependencies**: Full deployed environment

### Test Database Strategy
```typescript
// Testcontainers setup
const testDb = await createTestDatabase({
  databaseName: 'event_service_test',
  initSqlPath: 'tests/fixtures/init.sql'
})

// Fresh data per test
beforeEach(async () => {
  await clearTestDatabase(testDb.prisma)
  await seedTestData(testDb.prisma)
})
```

## Consequences

### Positive
- ✅ **Fast Development**: Vitest's HMR provides instant feedback
- ✅ **Real Integration Testing**: Testcontainers eliminate integration gaps
- ✅ **CI/CD Ready**: Reliable, isolated test environments
- ✅ **Type Safety**: Full TypeScript support throughout test stack
- ✅ **Modern Tooling**: ESM native, minimal configuration
- ✅ **Comprehensive Coverage**: Unit + Integration + E2E coverage

### Negative
- ❌ **Resource Usage**: Testcontainers require Docker and more memory
- ❌ **Setup Complexity**: More complex than pure unit testing
- ❌ **CI Dependencies**: Requires Docker support in CI environment
- ❌ **Learning Curve**: Team needs to understand container testing concepts

### Mitigation Strategies
- **Development Environment**: Docker Desktop provides easy container management
- **CI Optimization**: Use test-specific container images for faster startup
- **Test Categories**: Clear separation allows running unit tests without containers
- **Documentation**: Comprehensive testing guides and examples

## Testing Standards

### Test Organization
```
tests/
├── unit/                 # Fast unit tests
├── integration/          # Testcontainer-based tests
├── e2e/                 # End-to-end scenarios
├── performance/         # Artillery configurations
└── fixtures/            # Test data and SQL scripts
```

### Naming Conventions
- Unit tests: `ComponentName.test.ts`
- Integration tests: `feature-name.integration.test.ts`
- E2E tests: `user-journey.e2e.test.ts`
- Performance tests: `artillery-*.yml`

### Coverage Requirements
- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: 100% coverage of repository methods
- **E2E Tests**: All critical user paths
- **Performance Tests**: All public API endpoints

## Quality Gates

### Development
- All unit tests must pass before commit
- Integration tests run on feature branches
- Performance tests run before releases

### CI/CD Pipeline
1. **Fast Feedback**: Unit tests (< 30 seconds)
2. **Integration Validation**: Integration tests (< 2 minutes)
3. **Contract Validation**: E2E tests (< 5 minutes)
4. **Performance Validation**: Artillery tests (manual/scheduled)

## Related Decisions
- [ADR-006: Supertest Testcontainers Integration](006-supertest-testcontainers-integration.md) - API testing approach
- [ADR-008: Artillery Performance Testing](008-artillery-performance-testing.md) - Performance validation
- [ADR-005: Clean Architecture](005-clean-architecture.md) - Testable architecture patterns

## Implementation Status
- ✅ Vitest configuration optimized for monorepo
- ✅ Testcontainers setup with PostgreSQL and Redis
- ✅ Test utilities for database and cache management
- ✅ Integration test suite covering all major scenarios
- ✅ Performance testing integration
- ✅ CI/CD pipeline integration

## References
- [Vitest Documentation](https://vitest.dev/)
- [Testcontainers Node.js](https://testcontainers.com/modules/postgresql/)
- [Test Implementation Examples](../../packages/services/event-service/tests/)
- [Testing Strategy Documentation](../../packages/services/event-service/tests/PERFORMANCE_TESTING_STRATEGY.md)