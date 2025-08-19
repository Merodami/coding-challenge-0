# Architecture Decision Records (ADRs)

This directory contains the Architecture Decision Records for the Fever Event Service project. ADRs document the key architectural decisions made during development, including the context, decision, and consequences.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. It helps future developers understand why certain decisions were made.

## ADR Index (In Implementation Order)

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [001](001-monorepo-architecture.md) | Monorepo with Nx and Yarn Workspaces | Accepted | Monorepo structure for code sharing, consistent tooling, and optimized builds |
| [002](002-clean-architecture.md) | Clean Architecture Pattern | Accepted | Controller → Service → Repository pattern for maintainability and testability |
| [003](003-zod-validation-strategy.md) | Zod Validation Strategy | Accepted | Type-safe runtime validation for API contracts and data integrity |
| [004](004-postgresql-database.md) | PostgreSQL as Primary Database | Accepted | Using PostgreSQL for ACID compliance, date range queries, and proven scalability |
| [005](005-redis-caching-strategy.md) | Redis Caching with 5-Minute TTL | Accepted | Redis caching layer to ensure <300ms response times despite unreliable provider |
| [006](006-circuit-breaker-pattern.md) | Circuit Breaker for Provider Resilience | Accepted | Opossum circuit breaker to handle 36% provider failure rate gracefully |
| [007](007-bullmq-queue-system.md) | BullMQ Queue System | Accepted | Robust async job processing for provider synchronization |
| [008](008-vitest-testcontainers-testing.md) | Vitest with TestContainers | Accepted | Modern testing stack with real infrastructure for integration tests |
| [009](009-supertest-testcontainers-integration.md) | SuperTest with TestContainers | Accepted | End-to-end API testing with real infrastructure for comprehensive validation |
| [010](010-artillery-performance-testing.md) | Artillery Performance Testing | Accepted | Load testing to validate <300ms response times under high traffic |

## ADR Template

When creating a new ADR, use this template:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Describe the issue or problem that needs to be addressed]

## Decision
[Describe the decision that was made]

## Consequences

### Positive
- [Positive consequence 1]
- [Positive consequence 2]

### Negative
- [Negative consequence 1]
- [Negative consequence 2]

## Alternatives Considered
[List and briefly describe alternatives that were considered]

## References
[Links to relevant documentation, articles, or discussions]
```

## How to Add a New ADR

1. Create a new file: `docs/adr/XXX-decision-title.md`
2. Use the template above
3. Update this README's index table
4. Link from relevant documentation

## Related Documentation

- [Implementation Summary](../../.docs/IMPLEMENTATION_SUMMARY.md)
- [Circuit Breaker Architecture](../../.docs/CIRCUIT_BREAKER_ARCHITECTURE.md)
- [Retry Strategy](../../.docs/RETRY_STRATEGY_FOR_CHALLENGE.md)
- [Project Plan](../../.docs/PROJECT_PLAN.md)