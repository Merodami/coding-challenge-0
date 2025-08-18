#!/usr/bin/env tsx

/**
 * Performance Test Runner
 *
 * Orchestrates Artillery performance tests with pre/post validation
 */

import { execSync, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

interface TestConfig {
  name: string
  config: string
  reportDir: string
  duration: string
}

const TEST_CONFIGS: TestConfig[] = [
  {
    name: 'Smoke Test',
    config: 'artillery-smoke.yml',
    reportDir: 'smoke-test-results',
    duration: '30 seconds',
  },
  {
    name: 'Load Test',
    config: 'artillery-config.yml',
    reportDir: 'load-test-results',
    duration: '8 minutes',
  },
]

const BASE_URL = process.env.BASE_URL || 'http://localhost:5500'

/**
 * Check if service is healthy
 */
async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`)

    return response.ok
  } catch (error) {
    console.error('❌ Service health check failed:', error)

    return false
  }
}

/**
 * Run a single Artillery test
 */
async function runArtilleryTest(config: TestConfig): Promise<void> {
  const configPath = join(__dirname, config.config)
  const reportPath = join(__dirname, 'reports', config.reportDir)

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }

  console.log(`\n🚀 Running ${config.name} (${config.duration})`)
  console.log(`📊 Config: ${config.config}`)
  console.log(`📈 Report: ${reportPath}`)

  // Create reports directory
  execSync(`mkdir -p "${reportPath}"`, { stdio: 'inherit' })

  // Run Artillery with JSON and HTML reports
  const command = [
    'artillery',
    'run',
    configPath,
    '--output',
    join(reportPath, 'artillery-report.json'),
    '--environment',
    process.env.NODE_ENV || 'test',
  ]

  console.log(`⚡ Command: ${command.join(' ')}`)

  return new Promise((resolve, reject) => {
    const child = spawn('npx', command, {
      stdio: 'inherit',
      cwd: __dirname,
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${config.name} completed successfully`)

        // Generate HTML report
        try {
          execSync(
            [
              'npx artillery report',
              join(reportPath, 'artillery-report.json'),
              '--output',
              join(reportPath, 'artillery-report.html'),
            ].join(' '),
            {
              stdio: 'inherit',
              cwd: __dirname,
            },
          )

          console.log(
            `📊 HTML report generated: ${join(reportPath, 'artillery-report.html')}`,
          )
        } catch (htmlError) {
          console.warn('⚠️  Could not generate HTML report:', htmlError)
        }

        resolve()
      } else {
        reject(new Error(`${config.name} failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🎯 Event Service Performance Testing')
  console.log('=====================================')
  console.log(`📍 Target: ${BASE_URL}`)
  console.log(`⏰ Started: ${new Date().toISOString()}`)

  // Check service health
  console.log('\n🔍 Checking service health...')

  const isHealthy = await checkServiceHealth()

  if (!isHealthy) {
    console.error('❌ Service is not healthy. Please start the service first.')
    process.exit(1)
  }

  console.log('✅ Service is healthy')

  // Run tests
  for (const config of TEST_CONFIGS) {
    try {
      await runArtilleryTest(config)
    } catch (error) {
      console.error(`❌ ${config.name} failed:`, error)
      process.exit(1)
    }
  }

  console.log('\n🎉 All performance tests completed!')
  console.log('📊 Check the reports directory for detailed results')
  console.log(`⏰ Finished: ${new Date().toISOString()}`)
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Performance tests interrupted')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n⚠️  Performance tests terminated')
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Performance test runner failed:', error)
    process.exit(1)
  })
}
