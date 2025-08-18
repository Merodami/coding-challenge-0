# ADR-005: Clean Architecture Pattern

## Status
Accepted

## Context
The Event Service system needs a maintainable, testable architecture that:
- Separates business logic from infrastructure
- Enables easy testing at all levels
- Supports future changes to external dependencies
- Maintains clear boundaries between layers
- Allows independent scaling of API and background processing
- Enables service isolation for reliability and maintainability

## Decision
We will implement **Clean Architecture** with clear separation between Controllers, Services, and Repositories, distributed across two specialized services:
- **API Service** (`@fever/event-service`): Handles HTTP requests and responses
- **Worker Service** (`@fever/event-service-worker`): Handles background job processing

## Consequences

### Positive
- **Testability**: Each layer can be tested in isolation
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations (e.g., different databases)
- **Business logic protection**: Core logic independent of frameworks
- **Clear dependencies**: Unidirectional dependency flow
- **Service Isolation**: API and Worker services can evolve independently
- **Scalability**: Background processing separated from request handling
- **Fault Tolerance**: Worker failures don't affect API responsiveness

### Negative
- More boilerplate code
- Additional abstraction layers
- Steeper learning curve for new developers
- Potential over-engineering for simple features
- Service coordination complexity
- Inter-service communication overhead

## Implementation Details

### Layer Structure

```
Controller (HTTP Layer)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
```

### Controller Layer (`SearchController.ts`)
```typescript
export class SearchController {
  constructor(private readonly planService: IPlanService) {}

  async searchEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const query = getValidatedQuery<EventSearchQuery>(req)
      const response = await this.planService.searchEvents(query)
      res.json(response)
    } catch (error) {
      next(error)
    }
  }
}
```
- Handles HTTP concerns only
- Input validation
- Response formatting
- Error forwarding

### Service Layer (`PlanService.ts`)
```typescript
export class PlanService {
  constructor(
    private planRepository: PlanRepository,
    private cacheService: ICacheService
  ) {}

  async searchEvents(query: EventSearchQuery) {
    // Business logic
    // Caching logic
    // Orchestration
  }
}
```
- Business rules and logic
- Orchestrates between repositories
- Caching decisions
- No HTTP/framework dependencies

### Repository Layer (`PlanRepository.ts`)
```typescript
export class PlanRepository {
  constructor(private prisma: PrismaClient) {}

  async searchEvents(criteria: SearchCriteria) {
    // Database queries only
    // Data mapping
  }
}
```
- Data access only
- Query building
- Data transformation
- Database-specific logic

### Dependency Injection
- Manual DI without framework
- Dependencies passed through constructors
- Interfaces for testability

### Directory Structure

#### API Service (`@fever/event-service`)
```
packages/services/event-service/src/
├── controllers/       # HTTP layer
├── services/         # API business logic
├── repositories/     # Data access
├── mappers/         # Data transformation
├── types/           # Interfaces and types
├── routes/          # Route definitions
└── providers/       # External integrations
```

#### Worker Service (`@fever/event-service-worker`)
```
packages/services/event-service-worker/src/
├── services/         # Background job processing
├── repositories/     # Data access
├── mappers/         # Data transformation
├── types/           # Interfaces and types
└── providers/       # External integrations
```

## Alternatives Considered

### MVC Pattern
- ❌ Tighter coupling between layers
- ❌ Business logic often leaks into controllers
- ✅ Simpler, more familiar

### Hexagonal Architecture
- ❌ More complex for this use case
- ✅ Even better separation
- Similar benefits to Clean Architecture

### Simple Script
- ❌ Hard to maintain as it grows
- ❌ Difficult to test
- ✅ Faster initial development

## Testing Strategy

### API Service Testing
1. **Controllers**: Test HTTP handling, validation
2. **Services**: Test API business logic with mocked repositories
3. **Repositories**: Test with real database (integration)
4. **E2E**: Test complete API flows

### Worker Service Testing
1. **Worker Services**: Test job processing with mocked dependencies
2. **Queue Integration**: Test BullMQ job handling with TestContainers
3. **Provider Integration**: Test external provider synchronization
4. **Resilience**: Test failure recovery and error handling
5. **Performance**: Test memory usage and processing efficiency

## References
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Clean Architecture in Node.js](https://www.youtube.com/watch?v=CnailTcJV_U)
- SOLID Principles