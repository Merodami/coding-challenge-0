#!/usr/bin/env node

/**
 * Artillery Results Visualizer
 *
 * Creates an HTML dashboard from Artillery JSON results
 * Since Artillery deprecated their HTML reporter, this provides a modern alternative
 *
 * Usage:
 *   node visualize-results.js <json-file>
 *   npm run perf:visualize
 */

const fs = require('fs')
const path = require('path')

// Get input file from command line or default
const inputFile = process.argv[2] || 'tests/performance/results.json'

if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`)
  console.log('Usage: node visualize-results.js <json-file>')
  process.exit(1)
}

// Read and parse the Artillery JSON results
const results = JSON.parse(fs.readFileSync(inputFile, 'utf8'))

// Extract key metrics
const aggregate = results.aggregate || {}
const latency = aggregate.summaries?.['http.response_time'] || aggregate.histograms?.['http.response_time'] || {}
const counters = aggregate.counters || {}
const scenarios = results.scenarios || {}
const phases = results.phases || []

// Generate HTML dashboard
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artillery Test Results - ${new Date().toLocaleDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: transform 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }
        
        .metric-label {
            color: #888;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .metric-unit {
            color: #666;
            font-size: 14px;
        }
        
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        .chart-title {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        canvas {
            max-height: 400px;
        }
        
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        
        .test-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            color: #888;
            font-size: 12px;
            margin-bottom: 4px;
        }
        
        .info-value {
            color: #333;
            font-weight: 500;
        }
        
        .performance-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        
        .badge-excellent {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge-good {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .badge-warning {
            background: #fed7aa;
            color: #92400e;
        }
        
        .badge-poor {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                Artillery Performance Test Results
                ${getPerformanceBadge(aggregate)}
            </h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
            
            <div class="test-info">
                <div class="info-item">
                    <span class="info-label">Duration</span>
                    <span class="info-value">${formatDuration(aggregate.testDuration || 0)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Requests</span>
                    <span class="info-value">${(counters['http.requests'] || 0).toLocaleString()}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Scenarios</span>
                    <span class="info-value">${Object.keys(scenarios).length}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Test Phases</span>
                    <span class="info-value">${phases.length}</span>
                </div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">P95 Response Time</div>
                <div class="metric-value ${getMetricStatus(latency.p95 || 0)}">${Math.round(latency.p95 || 0)}</div>
                <div class="metric-unit">milliseconds</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">P99 Response Time</div>
                <div class="metric-value ${getMetricStatus(latency.p99 || 0)}">${Math.round(latency.p99 || 0)}</div>
                <div class="metric-unit">milliseconds</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Request Rate</div>
                <div class="metric-value">${Math.round(aggregate.rates?.['http.request_rate'] || 0)}</div>
                <div class="metric-unit">requests/sec</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value ${getSuccessStatus(aggregate)}">${getSuccessRate(aggregate)}%</div>
                <div class="metric-unit">of requests</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Min Response</div>
                <div class="metric-value">${latency.min || 0}</div>
                <div class="metric-unit">milliseconds</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Max Response</div>
                <div class="metric-value">${latency.max || 0}</div>
                <div class="metric-unit">milliseconds</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Response Time Distribution</h3>
            <canvas id="latencyChart"></canvas>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">HTTP Status Codes</h3>
            <canvas id="statusChart"></canvas>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Scenario Performance</h3>
            <canvas id="scenarioChart"></canvas>
        </div>
    </div>
    
    <script>
        // Response Time Distribution Chart
        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        new Chart(latencyCtx, {
            type: 'line',
            data: {
                labels: ['Min', 'P50', 'P75', 'P90', 'P95', 'P99', 'Max'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [
                        ${latency.min || 0},
                        ${latency.p50 || 0},
                        ${latency.p75 || 0},
                        ${latency.p90 || 0},
                        ${latency.p95 || 0},
                        ${latency.p99 || 0},
                        ${latency.max || 0}
                    ],
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.parsed.y + ' ms'
                        }
                    }
                }
            }
        });
        
        // HTTP Status Codes Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        const statusCodes = ${JSON.stringify(getStatusCodes(aggregate))};
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCodes),
                datasets: [{
                    data: Object.values(statusCodes),
                    backgroundColor: [
                        'rgb(34, 197, 94)',  // 2xx - green
                        'rgb(250, 204, 21)', // 3xx - yellow
                        'rgb(251, 146, 60)', // 4xx - orange
                        'rgb(239, 68, 68)'   // 5xx - red
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.label + ': ' + context.parsed + ' requests'
                        }
                    }
                }
            }
        });
        
        // Scenario Performance Chart
        const scenarioCtx = document.getElementById('scenarioChart').getContext('2d');
        const scenarioData = ${JSON.stringify(getScenarioData(aggregate))};
        new Chart(scenarioCtx, {
            type: 'bar',
            data: {
                labels: scenarioData.labels,
                datasets: [{
                    label: 'Requests',
                    data: scenarioData.counts,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>`

// Helper functions
function getMetricStatus(value) {
  if (value < 300) return 'status-good'
  if (value < 500) return 'status-warning'
  return 'status-error'
}

function getSuccessStatus(aggregate) {
  const rate = getSuccessRate(aggregate)
  if (rate >= 99) return 'status-good'
  if (rate >= 95) return 'status-warning'
  return 'status-error'
}

function getSuccessRate(aggregate) {
  const counters = aggregate.counters || {}
  const total = counters['http.requests'] || 0
  const codes = {}
  // Extract status codes from counters
  Object.keys(counters).forEach(key => {
    if (key.startsWith('http.codes.')) {
      const code = key.replace('http.codes.', '')
      codes[code] = counters[key]
    }
  })
  const success =
    (codes['200'] || 0) + (codes['201'] || 0) + (codes['204'] || 0)
  return total > 0 ? Math.round((success / total) * 100) : 0
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s`
}

function getPerformanceBadge(aggregate) {
  const latency = aggregate.summaries?.['http.response_time'] || aggregate.histograms?.['http.response_time'] || {}
  const p95 = latency.p95 || 0
  if (p95 < 100)
    return '<span class="performance-badge badge-excellent">EXCELLENT</span>'
  if (p95 < 300) return '<span class="performance-badge badge-good">GOOD</span>'
  if (p95 < 500)
    return '<span class="performance-badge badge-warning">NEEDS IMPROVEMENT</span>'
  return '<span class="performance-badge badge-poor">POOR</span>'
}

function getStatusCodes(aggregate) {
  const counters = aggregate.counters || {}
  const codes = {}
  // Extract status codes from counters
  Object.keys(counters).forEach(key => {
    if (key.startsWith('http.codes.')) {
      const code = key.replace('http.codes.', '')
      codes[code] = counters[key]
    }
  })
  const grouped = {
    '2xx Success': 0,
    '4xx Client Errors': 0,
    '5xx Server Errors': 0,
  }

  Object.entries(codes).forEach(([code, count]) => {
    if (code.startsWith('2')) grouped['2xx Success'] += count
    else if (code.startsWith('4')) grouped['4xx Client Errors'] += count
    else if (code.startsWith('5')) grouped['5xx Server Errors'] += count
  })

  return grouped
}

function getScenarioData(aggregate) {
  const counters = aggregate.counters || {}
  const scenarios = {}
  // Extract scenario data from counters
  Object.keys(counters).forEach(key => {
    if (key.startsWith('vusers.created_by_name.')) {
      const scenario = key.replace('vusers.created_by_name.', '')
      scenarios[scenario] = counters[key]
    }
  })
  return {
    labels: Object.keys(scenarios),
    counts: Object.values(scenarios),
  }
}

// Write the HTML file
const outputFile = inputFile.replace('.json', '-report.html')
fs.writeFileSync(outputFile, html)

console.log(`✅ HTML report generated: ${outputFile}`)
console.log(`📊 Open in browser: file://${path.resolve(outputFile)}`)

// Try to open in browser
const { exec } = require('child_process')
const platform = process.platform
const command =
  platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
exec(`${command} "${outputFile}"`, (err) => {
  if (!err) console.log('📈 Opening report in browser...')
})
