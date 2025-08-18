# Performance Testing Guide

Quick and easy performance testing for the Event Service using Artillery.

## 🚀 Quick Start

```bash
# Run a quick smoke test (30 seconds)
npm run perf:quick

# Run full performance test suite (8 minutes)
npm run perf:full

# Run everything and open results automatically
npm run perf:all
```

## 📋 Available Commands

### Basic Tests

| Command | Description | Duration |
|---------|-------------|----------|
| `npm run perf:smoke` | Quick smoke test - validates endpoints work | 30 seconds |
| `npm run perf:load` | Full load test - all phases | 8 minutes |
| `npm run perf:quick` | Smoke test + HTML report | 30 seconds |
| `npm run perf:full` | Load test + HTML report | 8 minutes |

### Reports & Utilities

| Command | Description |
|---------|-------------|
| `npm run perf:report` | Generate HTML report from last test |
| `npm run perf:open` | Open HTML report in browser |
| `npm run perf:clean` | Clean all test results |
| `npm run perf:generate-data` | Generate large XML test datasets |
| `npm run perf:all` | Clean, run all tests, open report |

### Shortcuts

```bash
# Just want to test performance?
npm run test:performance

# Test everything (unit + integration + performance)?
npm test && npm run test:integration && npm run test:performance
```

## 📊 Understanding Results

After running tests, open the HTML report:

```bash
npm run perf:open
```

The report shows:
- **Response Time Graphs**: Visual representation over time
- **Throughput Charts**: Requests per second
- **Error Rates**: Any failures or timeouts
- **Percentiles**: P50, P95, P99 response times
- **Status Codes**: Distribution of HTTP responses

### Success Criteria

✅ **Good Results:**
- P95 < 300ms (requirement from CHALLENGE.md)
- P99 < 500ms
- Error rate < 1%
- No connection failures

⚠️ **Warning Signs:**
- P95 > 300ms
- High rate of 429s (rate limiting)
- Any 5xx errors
- Connection timeouts

## 🎯 Test Scenarios

### Smoke Test (`artillery-smoke.yml`)
- 5 req/sec for 30 seconds
- Basic endpoint validation
- Quick health check

### Load Test (`artillery-config.yml`)
- **Warm-up**: 30s @ 10 req/sec
- **Ramp-up**: 60s @ 50→100 req/sec
- **Sustained**: 5min @ 100 req/sec
- **Stress**: 2min @ 200 req/sec
- **Spike**: 30s @ 500 req/sec
- **Cool-down**: 30s @ 10 req/sec

## 🔧 Configuration

### Change Test Target

Default target is `http://localhost:5500`. To test a different server:

```bash
# Set environment variable
export ARTILLERY_TARGET=https://staging.example.com

# Run tests
npm run perf:full
```

### Modify API Key

Edit `artillery-config.yml` or `artillery-smoke.yml`:

```yaml
defaults:
  headers:
    x-api-key: 'your-api-key-here'
```

## 📈 Custom Test Data

Generate large datasets for testing:

```bash
# Generate 10,000 events with 100 zones each
npm run perf:generate-data -- --events 10000 --zones 100

# Output: tests/fixtures/provider-responses/generated-events.xml
```

## 🐛 Troubleshooting

### Service Not Running

```bash
# Start the service first
npm run dev

# In another terminal
npm run perf:quick
```

### Rate Limiting (429 errors)

This is expected! The service has rate limiting (100 req/min).
High 429 counts show rate limiting is working correctly.

### Can't Open Report

```bash
# Manually open the HTML file
# Mac: open tests/performance/report.html
# Linux: xdg-open tests/performance/report.html
# Windows: start tests/performance/report.html
```

## 🎉 Examples

### Daily Development Testing

```bash
# Quick smoke test during development
npm run perf:quick
```

### Pre-Deployment Validation

```bash
# Full test suite before deploying
npm run perf:all
```

### CI/CD Pipeline

```bash
# In your CI script
npm run perf:full
# Check exit code - Artillery returns non-zero on threshold violations
```

## 📚 More Information

- [Artillery Documentation](https://artillery.io/docs/)

---

**Pro Tip**: Run `npm run perf:quick` frequently during development to catch performance regressions early!
