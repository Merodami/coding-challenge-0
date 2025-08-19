# ADR-001: PostgreSQL as Primary Database

## Status
Accepted

## Context
The Fever Event Service needs to store event data from external providers with the following requirements:
- Store historical event data (events that are no longer available from provider)
- Support complex date range queries for event filtering
- Handle thousands of events with hundreds of zones per event
- Maintain data integrity for critical business data
- Support sub-300ms response times

## Decision
We will use **PostgreSQL 17** as our primary database.

## Consequences

### Positive
- **ACID Compliance**: Guarantees data integrity for critical event data
- **Excellent Date Range Query Support**: Native timestamp indexing with B-tree indexes
- **JSON Support**: Can store raw XML data as JSONB for audit trail
- **Proven Scale**: Handles thousands of events easily with proper indexing
- **Complex Aggregations**: Built-in support for MIN/MAX price calculations
- **Soft Deletes**: Easy implementation with boolean flags
- **Mature Ecosystem**: Extensive tooling, monitoring, and operational knowledge

### Negative
- Requires more operational overhead than NoSQL solutions
- Vertical scaling has limits (though unlikely to hit them)
- Schema migrations needed for structural changes

## Implementation Details

### Schema Design (Prisma)
We use a normalized structure with four main tables:

#### BasePlan Table
- Stores the main event information (title, organizer, sell_mode)
- Uses UUID with `gen_random_uuid()` for primary key
- Tracks first_seen_at, last_seen_at, and deleted_at for soft deletes
- Indexed on sell_mode, last_seen_at, deleted_at, and title

#### Plan Table  
- Represents specific instances/sessions of an event
- Links to BasePlan via foreign key
- Stores date ranges (plan_start_date, plan_end_date)
- Caches min_price and max_price for performance
- Stores raw XML data as JSONB
- Composite unique constraint on (base_plan_id, plan_id)
- **Critical indexes for date range queries**: `[planStartDate, planEndDate]`

#### Zone Table
- Stores pricing and capacity information
- Links to Plan via foreign key
- Each zone has price, capacity, name, and numbered flag

#### SyncHistory Table
- Tracks all synchronization attempts with the provider
- Records performance metrics (response_time_ms, processing_time_ms)
- Stores error details and raw responses for debugging
- Tracks events created/updated/deleted counts

### Performance Optimizations
- Composite indexes on date ranges
- Connection pooling for high concurrency
- Prepared statements for common queries
- Partitioning ready for future scale

## Alternatives Considered

### MongoDB
- ❌ Weaker consistency guarantees
- ❌ More complex date range queries
- ✅ Better for unstructured data (not our case)

### DynamoDB
- ❌ Poor date range query support
- ❌ Higher operational cost
- ✅ Serverless scaling (not needed for our scale)

### Elasticsearch
- ❌ Overkill for our search requirements
- ❌ Higher operational complexity
- ✅ Better for full-text search (not needed)

## References
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [B-tree Index Performance](https://www.postgresql.org/docs/current/btree-intro.html)
- Challenge requirement: Sub-300ms response times with date filtering