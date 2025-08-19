# External Provider API Analysis

## 🔍 API Behavior Analysis

### Endpoint
- **URL**: `https://provider.code-challenge.feverup.com/api/events`
- **Method**: GET
- **Format**: XML
- **Authentication**: None required

### Response Patterns (25 requests tested)

#### Success Rate
- **Success**: 64% (16/25 requests)
- **503 Errors**: 36% (9/25 requests)
- **Other Errors**: 0%

#### Performance Characteristics
- **Average Response Time**: 1706ms
- **Minimum**: 165ms  
- **Maximum**: 4189ms
- **High Variability**: Response times vary from sub-200ms to over 4 seconds
- **Timeouts**: Some responses take 4+ seconds (simulating real-world conditions)

#### Error Behavior
- **503 Service Unavailable**: Frequent (36% of requests)
- **Empty Response Body**: 503 errors return no data
- **No Rate Limiting Detected**: 25 consecutive requests allowed
- **Random Failures**: API intentionally unreliable to test resilience

### Data Characteristics
- **Response Size**: 1729-1999 bytes
- **Content Variability**: Different events returned in different calls
- **Data Changes**: Events appear/disappear between calls (simulating updates)

## 📊 Data Model Analysis

### XML Structure
```xml
<planList>
  <output>
    <base_plan base_plan_id="291" sell_mode="online" title="Event Title" organizer_company_id="2">
      <plan plan_id="291" 
            plan_start_date="2021-06-30T21:00:00" 
            plan_end_date="2021-06-30T22:00:00"
            sell_from="2020-07-01T00:00:00"
            sell_to="2021-06-30T20:00:00"
            sold_out="false">
        <zone zone_id="40" 
              capacity="243" 
              price="20.00" 
              name="Platea" 
              numbered="true"/>
      </plan>
    </base_plan>
  </output>
</planList>
```

### Data Entities

#### Base Plan (Event)
- `base_plan_id`: Unique identifier (string)
- `sell_mode`: Always "online" for our purposes
- `title`: Event name
- `organizer_company_id`: Optional organizer reference

#### Plan (Event Instance/Session)
- `plan_id`: Unique identifier (note: can duplicate across base_plans)
- `plan_start_date`: Event start time (ISO 8601)
- `plan_end_date`: Event end time (ISO 8601)
- `sell_from`: Ticket sales start
- `sell_to`: Ticket sales end
- `sold_out`: Boolean as string

#### Zone (Seating Area)
- `zone_id`: Identifier (not unique across plans)
- `capacity`: Number of seats
- `price`: Decimal price
- `name`: Zone name
- `numbered`: Whether seats are numbered

## 🗄️ Database Selection Analysis

### PostgreSQL - ✅ RIGHT CHOICE

#### Reasons:
1. **ACID Compliance**: Critical for financial data (prices, capacities)
2. **JSON Support**: Can store raw XML as JSONB for flexibility
3. **Complex Queries**: Date range queries, aggregations
4. **Relationships**: Natural fit for event->plan->zone hierarchy
5. **Scalability**: Handles thousands of events easily
6. **Time-series**: Excellent timestamp handling for date ranges
7. **Indexing**: B-tree indexes perfect for date range queries

### Alternative Considerations

#### MongoDB
- ❌ Overkill for structured data
- ❌ Less efficient for date range queries
- ✅ Would work but PostgreSQL simpler

#### Redis Only
- ❌ Not persistent enough
- ❌ Complex queries difficult
- ✅ Use as cache layer only

## 🏗️ Architecture Decisions

### Data Storage Strategy

1. **Normalized Tables**:
   - `events` (base_plan)
   - `event_sessions` (plan)
   - `event_zones` (zone)
   - `sync_history` (track what we've seen)

2. **Denormalized Cache**:
   - Store computed search results in Redis
   - 5-minute TTL for provider data

3. **Historical Tracking**:
   - Never delete events
   - Track first_seen and last_seen timestamps
   - Soft delete with `deleted_at` field

### Sync Strategy

1. **Regular Polling**: Every 5 minutes
2. **Failure Handling**: Continue serving from cache/DB
3. **Deduplication**: Use composite keys
4. **Change Detection**: Compare with last sync

## 📝 Key Implementation Requirements

### From Challenge Requirements

1. **Date Range Search**: 
   - Query by `starts_at` and `ends_at`
   - Must be performant (< 300ms)

2. **Historical Data**:
   - Keep events even when provider removes them
   - Track "sell_mode=online" events

3. **Resilience**:
   - Work when provider is down (36% failure rate!)
   - Respond quickly regardless of provider latency

4. **Performance**:
   - Sub-second responses required
   - Handle 5k-10k requests/second potential

## 🎯 Implementation Plan

### Database Schema
```sql
-- Main event table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  organizer_company_id VARCHAR(255),
  sell_mode VARCHAR(50),
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP,
  UNIQUE(external_id)
);

-- Event sessions/instances
CREATE TABLE event_sessions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  external_id VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  sell_from TIMESTAMP,
  sell_to TIMESTAMP,
  sold_out BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  INDEX idx_date_range (starts_at, ends_at),
  INDEX idx_event_id (event_id)
);

-- Zones/pricing
CREATE TABLE event_zones (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES event_sessions(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  capacity INTEGER,
  price DECIMAL(10,2),
  numbered BOOLEAN,
  INDEX idx_session_id (session_id)
);
```

### Caching Strategy
```
Provider Data → PostgreSQL → Redis Cache → API Response
     ↓              ↓            ↓
  (5 min sync)  (persistent)  (5 min TTL)
```

## 🚨 Critical Observations

1. **Provider Instability**: 36% failure rate - MUST handle gracefully
2. **Response Time Variance**: 165ms to 4189ms - MUST cache aggressively  
3. **Data Volatility**: Events appear/disappear - MUST track history
4. **No Pagination**: All data in single response - may need to handle large datasets
5. **Duplicate IDs**: plan_id not globally unique - use composite keys

## ✅ Validation Checklist

- [x] API endpoint tested (25 times)
- [x] Error patterns documented
- [x] Response times analyzed
- [x] Data structure understood
- [x] Database choice validated (PostgreSQL ✅)
- [x] Caching strategy defined
- [x] Historical tracking planned
- [x] Performance requirements addressed