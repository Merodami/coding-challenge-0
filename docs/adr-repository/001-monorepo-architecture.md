# ADR-004: Monorepo with Nx and Yarn Workspaces

## Status
Accepted

## Context
The Fever Event Service needs a scalable architecture that supports:
- Multiple packages with shared dependencies
- Consistent tooling and configuration
- Fast builds and testing
- Future growth to multiple services
- Code sharing between packages

## Decision
We will use a **monorepo architecture** managed by **Nx** with **Yarn workspaces**.

## Consequences

### Positive
- **Single source of truth**: All code in one repository
- **Code sharing**: Easy to share utilities, types, and configurations
- **Atomic changes**: Can update multiple packages in one commit
- **Consistent tooling**: Single set of linting, testing, formatting rules
- **Smart builds**: Nx caches and only rebuilds what changed
- **Dependency graph**: Visualize and understand package relationships

### Negative
- Larger repository size over time
- More complex initial setup
- Requires understanding of monorepo concepts
- Potential for circular dependencies if not careful

## Implementation Details

### Package Structure
```
packages/
├── api/              # OpenAPI schemas and validation
├── api-gateway/      # API routing and aggregation
├── database/         # Prisma ORM and migrations
├── environment/      # Configuration management
├── http/            # Express server abstraction
├── redis/           # Caching implementation
├── sdk/             # Domain models and mappers
├── shared/          # Common utilities
├── tests/           # Test helpers
├── types/           # TypeScript definitions
└── services/
    ├── event-service/        # API endpoints and HTTP layer
    └── event-service-worker/ # Background sync worker
```

### Package Naming Convention
- All packages use `@fever/` namespace
- Example: `@fever/database`, `@fever/shared`

### Dependency Management
```json
{
  "workspaces": ["packages/**", "tools/**"],
  "packageManager": "yarn@4.9.1"
}
```

### Nx Configuration
```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  }
}
```

### Build Optimization
- Nx computation caching
- Incremental builds
- Parallel execution
- Affected commands for PR validation

## Alternatives Considered

### Multiple Repositories
- ❌ Complex dependency management
- ❌ Version synchronization issues
- ✅ Simpler individual repos

### Lerna
- ❌ Less feature-rich than Nx
- ❌ No computation caching
- ✅ Simpler setup

### Rush
- ❌ Steeper learning curve
- ❌ Less community adoption
- ✅ Enterprise-focused features

### No Monorepo Tool
- ❌ Manual dependency management
- ❌ No build optimization
- ✅ Simpler for small projects

## Best Practices
1. Keep packages focused and single-purpose
2. Avoid circular dependencies
3. Use `nx graph` to visualize dependencies
4. Run `nx affected` for PR validation
5. Use consistent versioning across packages

## References
- [Nx Documentation](https://nx.dev)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [Monorepo Best Practices](https://monorepo.tools)