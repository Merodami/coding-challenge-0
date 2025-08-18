/**
 * Event Service Worker Entry Point
 * Background worker for syncing events from provider
 */

import { startWorker } from './worker.js'

// Start the worker
startWorker().catch((error) => {
  console.error('Fatal error starting worker:', error)
  process.exit(1)
})
