# ADR-010: Zod for API Validation and Type Safety

## Status
Accepted

## Context
The Event Service API needs robust input validation and type safety across multiple layers:
- HTTP request validation (query parameters, request bodies, headers)
- External provider data validation (XML responses, data transformation)
- Database model validation and type enforcement
- OpenAPI documentation generation from code
- Runtime type checking for critical business logic

Traditional approaches either compromise on type safety (runtime-only validation) or developer experience (separate validation schemas and TypeScript types). We need a solution that provides both compile-time and runtime safety while maintaining a single source of truth for data models.

## Decision
We will use **Zod** as our primary validation library for schema definition, runtime validation, and TypeScript type inference throughout the application.

## Alternatives Considered

### 1. Joi
- **Pros**: Mature, feature-rich, extensive validation rules
- **Cons**: No TypeScript integration, separate type definitions required

### 2. Yup
- **Pros**: Popular, good React integration
- **Cons**: Inconsistent TypeScript support, complex async validation

### 3. Ajv + JSON Schema
- **Pros**: JSON Schema standard, high performance, extensive ecosystem
- **Cons**: Verbose schema definitions, poor TypeScript integration

### 4. io-ts
- **Pros**: Functional programming approach, strong type safety
- **Cons**: Steep learning curve, verbose syntax, smaller ecosystem

### 5. Class Validator + Class Transformer
- **Pros**: Decorator-based, OOP approach
- **Cons**: Runtime type information required, complex setup

### 6. Pure TypeScript Interfaces
- **Pros**: No runtime overhead, native TypeScript
- **Cons**: No runtime validation, no automatic API documentation

## Rationale

Zod was selected because:

### Type Safety Benefits
- **Infer Types**: TypeScript types automatically inferred from schemas
- **Compile-time Safety**: Type errors caught during development
- **Runtime Validation**: Schema validation ensures data integrity
- **Single Source of Truth**: One schema definition for both types and validation

### Developer Experience
- **Intuitive API**: Chainable, fluent interface for schema building
- **Excellent Error Messages**: Detailed validation error reporting
- **TypeScript First**: Built specifically for TypeScript projects
- **IDE Support**: Excellent autocomplete and type inference

### Integration Capabilities
- **OpenAPI Generation**: Direct integration with `@asteasolutions/zod-to-openapi`
- **Framework Agnostic**: Works with Express, Fastify, Next.js, etc.
- **Parsing and Validation**: Combined parsing and validation in one step
- **Transformation**: Built-in data transformation capabilities

## Implementation Details

### API Schema Definition
```typescript
// Event search query schema
export const EventSearchQuery = z.object({
  starts_at: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Return events starting after this date (ISO 8601)'),
  ends_at: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Return events ending before this date (ISO 8601)')
})

// Automatic TypeScript type inference
export type EventSearchQuery = z.infer<typeof EventSearchQuery>
```

### OpenAPI Integration
```typescript
// OpenAPI documentation generation
export const EventSearchQuerySchema = EventSearchQuery.openapi(
  'EventSearchQuery',
  {
    description: 'Query parameters for event search',
    example: {
      starts_at: '2017-07-21T17:32:28Z',
      ends_at: '2021-07-21T17:32:28Z'
    }
  }
)
```

### Request Validation Middleware
```typescript
// Express middleware integration
export function validateQuery() {
  return (req: any, res: any, next: any) => {
    try {
      const parsed = EventSearchQuerySchema.parse(req.query)
      // Override request.query with validated data
      Object.defineProperty(req, 'query', {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true
      })
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETERS',
            message: error.issues.map(e => e.message).join(', ')
          }
        })
      } else {
        next(error)
      }
    }
  }
}
```

### Data Transformation
```typescript
// Provider data validation and transformation
const ProviderEventSchema = z.object({
  base_plan_id: z.string().transform(String),
  title: z.string().default('Untitled Event'),
  sell_mode: z.enum(['online', 'offline']).default('online'),
  plan_start_date: z.string().transform(date => new Date(date)),
  price: z.string().transform(str => parseFloat(str))
})
```

## Usage Patterns

### 1. API Validation Layer
- **Request Validation**: Query parameters, path parameters, request bodies
- **Response Validation**: Ensure API responses match declared schemas
- **Error Handling**: Structured error responses with detailed field-level errors

### 2. Data Transformation Layer
- **Provider Integration**: Validate and transform external API responses
- **Database Operations**: Ensure data integrity before persistence
- **Business Logic**: Validate domain models and business rules

### 3. Type Generation Layer
- **TypeScript Types**: Automatic type inference from schemas
- **OpenAPI Documentation**: Generate API documentation from schemas
- **Client SDK Generation**: Type-safe client libraries from schemas

### 4. Testing Layer
- **Test Data Validation**: Ensure test fixtures match production schemas
- **Contract Testing**: Validate API contracts in integration tests
- **Mock Data Generation**: Generate valid test data from schemas

## Schema Organization Strategy

### File Structure
```
src/schemas/
├── shared/           # Common types (pagination, responses, errors)
├── event/           # Event-specific schemas
│   ├── public/      # Public API schemas
│   └── internal/    # Internal API schemas
└── provider/        # External provider schemas
```

### Schema Composition
- **Base Schemas**: Common patterns (UUID, timestamps, pagination)
- **Composed Schemas**: Complex objects built from base schemas
- **Versioned Schemas**: API version management
- **Environment-specific**: Different validation rules per environment

## Error Handling Strategy

### Validation Error Processing
```typescript
// Standardized error formatting
function formatZodError(error: z.ZodError): ValidationError {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input parameters',
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      received: issue.received
    }))
  }
}
```

### Client-Friendly Errors
- **Field-level Errors**: Specific field validation failures
- **Human-readable Messages**: Clear error descriptions
- **Error Codes**: Consistent error classification
- **Debugging Information**: Detailed error context in development

## Consequences

### Positive
- ✅ **Type Safety**: Compile-time and runtime type checking
- ✅ **Developer Productivity**: Single schema definition for types and validation
- ✅ **API Documentation**: Automatic OpenAPI generation from schemas
- ✅ **Error Quality**: Detailed, actionable validation error messages
- ✅ **Maintainability**: Changes to schemas automatically update types
- ✅ **Integration**: Seamless TypeScript and framework integration

### Negative
- ❌ **Bundle Size**: Runtime validation adds to application bundle
- ❌ **Performance**: Validation overhead on every request
- ❌ **Learning Curve**: Team needs to understand Zod API and patterns
- ❌ **Schema Complexity**: Complex validation rules can become verbose

### Mitigation Strategies
- **Performance**: Cache parsed schemas, optimize validation for hot paths
- **Bundle Size**: Tree-shake unused validation rules, consider runtime-only validation
- **Documentation**: Comprehensive schema examples and patterns
- **Testing**: Validate schemas themselves to ensure correctness

## Quality Standards

### Schema Quality Requirements
- **Documentation**: All schemas must have descriptions and examples
- **Testing**: Schema validation must be tested with valid/invalid data
- **Versioning**: API changes require schema versioning strategy
- **Performance**: Critical path validations must be benchmarked

### Code Review Checklist
- [ ] Schema includes proper TypeScript type inference
- [ ] Validation errors provide helpful messages
- [ ] Schema is tested with edge cases
- [ ] OpenAPI documentation is generated correctly
- [ ] Performance impact is acceptable

## Related Decisions
- [ADR-005: Clean Architecture](005-clean-architecture.md) - Validation layer placement
- [ADR-009: Vitest Testing Stack](009-vitest-testcontainers-testing-stack.md) - Schema testing
- [OpenAPI Documentation Strategy](../../packages/api/src/schemas/) - API documentation

## Implementation Status
- ✅ Base schema definitions for all API endpoints
- ✅ Request/response validation middleware
- ✅ OpenAPI documentation generation
- ✅ TypeScript type inference setup
- ✅ Error handling and formatting
- ✅ Integration with testing framework

## References
- [Zod Documentation](https://zod.dev/)
- [Zod to OpenAPI Integration](https://github.com/asteasolutions/zod-to-openapi)
- [Schema Implementations](../../packages/api/src/schemas/)
- [Validation Middleware](../../packages/http/src/infrastructure/express/middleware/validation.ts)