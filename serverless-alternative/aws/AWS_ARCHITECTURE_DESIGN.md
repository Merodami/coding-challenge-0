# AWS Serverless Architecture Design - Fever Event Service

## Architecture Overview

A clean, event-driven serverless architecture designed specifically for the Fever challenge requirements. This solution prioritizes simplicity, reliability, and performance.

### Core Design Principles
**Event-Driven Architecture** with clear separation of concerns  
**Cache-Aside Pattern** for optimal performance  
**Fail-Silent Resilience** - simple but effective  
**Regional Architecture** with heavy caching for scale  

---

## Complete Architecture Diagram

![AWS Architecture](../../docs/diagrams/aws/SERVERLESS_ARCHITECTURE.png)

```mermaid
graph TB
    subgraph External
        CLIENT[Client Applications]
        PROVIDER["Provider API<br/>XML Events<br/>36% Failure Rate<br/>4+ sec latency"]
    end
    
    subgraph AWS["AWS Cloud - Regional Architecture"]
        subgraph API_Layer["API Layer"]
            APIGW["API Gateway<br/>REST API<br/>Regional Endpoint"]
            APIGW_CACHE["API Gateway Cache<br/>60 second TTL<br/>Key: starts_at + ends_at"]
        end
        
        subgraph Compute["Compute Layer - Lambda Functions"]
            SEARCH_LAMBDA["Search Lambda<br/>GET /search Handler<br/>Cache-Aside Pattern"]
            SYNC_LAMBDA["Sync Lambda<br/>Provider Fetcher<br/>XML Parser<br/>Fail-Silent"]
        end
        
        subgraph Orchestration["Event-Driven Orchestration"]
            EVENTBRIDGE["EventBridge<br/>Schedule Rule<br/>Every 5 minutes"]
            SQS_SYNC["SQS Queue<br/>Sync Tasks<br/>Retry with DLQ"]
            SQS_DLQ["Dead Letter Queue<br/>Failed Syncs"]
        end
        
        subgraph Storage["Data Storage Layer"]
            DDB_EVENTS["DynamoDB<br/>Events Table<br/>On-Demand Billing"]
            DDB_GSI["Global Secondary Index<br/>PK: yearMonth<br/>SK: startTimestamp"]
            REDIS["ElastiCache Redis<br/>Single Node<br/>t4g.small<br/>5 min TTL"]
            S3_RAW["S3 Bucket<br/>Raw XML Storage<br/>30 day lifecycle"]
            CW_LOGS["CloudWatch Logs<br/>Sync History<br/>Search Metrics"]
        end
        
        subgraph Monitoring
            CW_METRICS["CloudWatch Metrics<br/>Custom Metrics"]
            CW_DASHBOARD["CloudWatch Dashboard<br/>Real-time Monitoring"]
            CW_ALARMS["CloudWatch Alarms<br/>Error Rates<br/>Latency"]
        end
    end
    
    CLIENT -->|HTTPS| APIGW
    APIGW --> APIGW_CACHE
    APIGW_CACHE -->|Cache Miss| SEARCH_LAMBDA
    APIGW_CACHE -->|Cache Hit| CLIENT
    
    SEARCH_LAMBDA -->|Check Cache| REDIS
    REDIS -->|Cache Hit| SEARCH_LAMBDA
    REDIS -->|Cache Miss| SEARCH_LAMBDA
    SEARCH_LAMBDA -->|Query DB| DDB_EVENTS
    DDB_EVENTS --> DDB_GSI
    DDB_GSI --> SEARCH_LAMBDA
    SEARCH_LAMBDA -->|Update Cache| REDIS
    SEARCH_LAMBDA -->|Return| CLIENT
    
    EVENTBRIDGE -->|Trigger| SQS_SYNC
    SQS_SYNC -->|Message| SYNC_LAMBDA
    SYNC_LAMBDA -->|Fetch XML| PROVIDER
    PROVIDER -->|Success or Fail| SYNC_LAMBDA
    
    SYNC_LAMBDA -->|Store Raw| S3_RAW
    SYNC_LAMBDA -->|Update Events| DDB_EVENTS
    SYNC_LAMBDA -->|Invalidate| REDIS
    SYNC_LAMBDA -->|Log Result| CW_LOGS
    
    SQS_SYNC -->|Max Retries| SQS_DLQ
    
    SEARCH_LAMBDA --> CW_METRICS
    SYNC_LAMBDA --> CW_METRICS
    CW_METRICS --> CW_DASHBOARD
    CW_METRICS --> CW_ALARMS
    
    style APIGW fill:#4ecdc4
    style DDB_EVENTS fill:#95e77e
    style REDIS fill:#ffe66d
    style SEARCH_LAMBDA fill:#88d8b0
    style SYNC_LAMBDA fill:#88d8b0
    style EVENTBRIDGE fill:#ff6b6b
    style PROVIDER fill:#ff9999
```

---

## Data Flow Patterns

![AWS Search Request Flow](../../docs/diagrams/aws/SEARCH_REQUEST_FLOW.png)

### 1. Search Request Flow (Cache-Aside Pattern)

```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant Search Lambda
    participant Redis Cache
    participant DynamoDB
    
    Client->>API Gateway: GET /search?starts_at=X&ends_at=Y
    
    alt API Gateway Cache Hit
        API Gateway-->>Client: Cached Response (60s TTL)
    else API Gateway Cache Miss
        API Gateway->>Search Lambda: Invoke
        
        Note over Search Lambda: Cache-Aside Pattern
        Search Lambda->>Redis Cache: GET cache_key
        
        alt Redis Cache Hit
            Redis Cache-->>Search Lambda: Cached Data
            Search Lambda-->>Client: Response (<100ms)
        else Redis Cache Miss
            Search Lambda->>DynamoDB: Query by Date Range
            DynamoDB-->>Search Lambda: Events Data
            Search Lambda->>Redis Cache: SET with 5min TTL
            Search Lambda-->>Client: Response (<300ms)
        end
    end
```

### 2. Provider Sync Flow (Event-Driven + Fail-Silent)

![AWS Provider Sync Flow](../../docs/diagrams/aws/PROVIDER_SYNC_FLOW.png)

```mermaid
sequenceDiagram
    participant EventBridge
    participant SQS
    participant Sync Lambda
    participant Provider API
    participant DynamoDB
    participant Redis
    participant S3
    
    EventBridge->>SQS: Schedule Trigger (every 5 min)
    SQS->>Sync Lambda: Sync Message
    
    Sync Lambda->>Provider API: Fetch XML Events
    
    alt Provider Success
        Provider API-->>Sync Lambda: XML Data
        Sync Lambda->>S3: Store Raw XML
        Sync Lambda->>DynamoDB: Upsert Events
        Sync Lambda->>Redis: Invalidate Cache Keys
        Sync Lambda->>CloudWatch: Log Success
    else Provider Failure (36% chance)
        Provider API-->>Sync Lambda: Error/Timeout
        Note over Sync Lambda: Fail-Silent Pattern
        Sync Lambda->>CloudWatch: Log Failure
        Note over Sync Lambda: Continue Serving from DB
    end
    
    Sync Lambda-->>SQS: Complete Message
```

---

## Component Specifications

### API Gateway
**Type**: Regional REST API (simpler than Edge-optimized)  
**Caching**: 60 second TTL at gateway level  
**Throttling**: 10,000 requests/second burst  
**Integration**: Lambda proxy integration

### Lambda Functions

#### Search Lambda
**Purpose**: Handle GET /search requests  
**Pattern**: Cache-Aside for optimal performance  
**Memory**: 512 MB  
**Timeout**: 10 seconds  
**Concurrency**: Auto-scaling to 1000

#### Sync Lambda
**Purpose**: Fetch from provider and update database  
**Pattern**: Fail-Silent (log and continue on failure)  
**Memory**: 256 MB  
**Timeout**: 30 seconds  
**Reserved Concurrency**: 1 (don't overwhelm provider)

### DynamoDB Design

**Events Table**: Single denormalized table for all event data  
**Partition Strategy**: Optimized for event lookups  
**Global Secondary Index**: Enables efficient date range queries  
**Billing Mode**: On-demand for automatic scaling

### ElastiCache Redis
**Node Type**: cache.t4g.small (1.5 GB RAM)  
**Deployment**: Single node (simpler for PoC)  
**Eviction Policy**: allkeys-lru  
**TTL**: 5 minutes for all cached searches

### EventBridge + SQS
**Schedule**: Rate(5 minutes)  
**Queue Type**: Standard SQS (not FIFO)  
**Visibility Timeout**: 60 seconds  
**Max Retries**: 3  
**DLQ**: After 3 failures

---

## Resilience Strategy

### Fail-Silent Pattern Implementation

```
Provider Fetch Attempt
         ↓
    Success?
    ↙       ↘
  Yes        No
   ↓          ↓
Update DB   Log Error
   ↓          ↓
Clear Cache  Continue
   ↓          ↓
  Done      Done

Note: System continues serving from existing data
```

### Why This Works
**1. Provider Failures Don't Impact Users**: API always serves from cache/database  
**2. No Complex Circuit Breaker State**: Simple try-catch is enough  
**3. Natural Recovery**: Next scheduled sync attempts again  
**4. Zero Downtime**: System never stops serving requests

---

## Scalability Design

### Regional Architecture Benefits
**Simpler**: No cross-region replication complexity  
**Cost-Effective**: Single region reduces data transfer costs  
**Fast**: All components in same region  
**Sufficient**: Can handle 10k+ requests/second

### Caching Strategy for Scale
```
Layer 1: API Gateway Cache (60s)
  ↓ Reduces Lambda invocations by ~70%
Layer 2: Redis Cache (5 min)
  ↓ Reduces DynamoDB reads by ~90%
Layer 3: DynamoDB
  ↓ Auto-scales on-demand
```

### Performance Targets
**P50 Latency**: <50ms (cache hits)  
**P95 Latency**: <200ms (cache miss, DB hit)  
**P99 Latency**: <300ms (worst case)  
**Throughput**: 10,000+ req/s capability

---

## Cost Optimization

### Estimated Monthly Costs

| Service | Configuration | Cost | Notes |
|---------|--------------|------|-------|
| Lambda | 10M requests | $50 | Auto-scaling |
| DynamoDB | On-demand, 1GB | $25 | Pay per request |
| ElastiCache | t4g.small | $20 | Single node |
| API Gateway | 10M requests | $35 | With caching |
| EventBridge | 8,640 invocations | $1 | Every 5 min |
| SQS | 10k messages | $1 | Minimal usage |
| S3 | 10GB storage | $1 | Raw XML storage |
| CloudWatch | Logs & metrics | $10 | Basic monitoring |
| **Total** | **Simple but solid** | **~$143/month** | Highly scalable |

---

## Implementation Simplicity

### Why This Architecture is Simple Yet Professional

**1. Minimal Components**: Only essential AWS services  
**2. Clear Patterns**: Cache-Aside and Fail-Silent are well-understood  
**3. No Over-Engineering**: No Step Functions, no multiple Lambdas  
**4. Standard Practices**: EventBridge for scheduling, SQS for decoupling  
**5. Easy to Debug**: Clear data flow, simple error handling

### Infrastructure as Code Approach

**Framework**: AWS SAM (Serverless Application Model)  
**Structure**: Single template with all resources  
**Deployment**: Simple CLI commands  
**Benefits**: Native AWS support, minimal configuration

---

## Key Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture Style** | Event-Driven | Clean separation, scalable |
| **Data Flow** | Cache-Aside | Simple, effective caching |
| **Resilience** | Fail-Silent | Simple, no state management |
| **Scale Strategy** | Regional + Cache | Cost-effective, sufficient |
| **Database** | DynamoDB | Serverless, auto-scaling |
| **Cache** | ElastiCache Redis | Managed, reliable |
| **Orchestration** | EventBridge + SQS | Simple, decoupled |
| **Monitoring** | CloudWatch | Native AWS integration |

---

## Meeting Challenge Requirements

✅ **Single Endpoint**: GET /search with date range parameters  
✅ **<300ms Response**: Multi-layer caching ensures fast responses  
✅ **36% Provider Failure**: Fail-silent pattern handles gracefully  
✅ **Historical Data**: Events never deleted, lastSeenAt tracking  
✅ **5k-10k req/s Scale**: DynamoDB + caching handles easily  
✅ **XML Processing**: Sync Lambda parses and stores  
✅ **Clean Architecture**: Event-driven with clear separation  
✅ **Cost-Effective**: ~$143/month for production load  
