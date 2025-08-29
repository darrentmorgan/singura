#!/usr/bin/env node

/**
 * Background Job Worker Process
 * Processes background jobs from Redis queues using Bull
 * This should be run as a separate process from the main web server
 */

import dotenv from 'dotenv';
import { jobQueue, healthCheck } from './jobs/queue';

// Load environment variables
dotenv.config();

// Initialize database connections and other dependencies
import './database/pool'; // Initialize database pool

/**
 * Worker process main function
 */
async function startWorker() {
  console.log('🚀 Starting SaaS X-Ray Background Worker...');
  
  try {
    // Perform health check
    const health = await healthCheck();
    if (health.status !== 'healthy') {
      console.error('❌ Health check failed:', health.details);
      process.exit(1);
    }
    
    console.log('✅ Health check passed - Redis and queues are healthy');
    console.log('📊 Queue stats:', health.details.queues);
    
    // The job processors are already set up in the JobQueueManager constructor
    console.log('🔧 Job processors initialized and ready');
    
    // Set up process monitoring
    setupProcessMonitoring();
    
    console.log('✅ Background worker is running and processing jobs');
    console.log('📝 Logs will show job processing activity...\n');

    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

/**
 * Setup process monitoring and graceful shutdown
 */
function setupProcessMonitoring() {
  // Log memory usage periodically
  const logMemoryUsage = () => {
    const memUsage = process.memoryUsage();
    console.log(`📊 Memory Usage - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  };
  
  // Log memory every 5 minutes
  setInterval(logMemoryUsage, 5 * 60 * 1000);
  
  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', async () => {
    console.log('📢 SIGTERM received, initiating graceful shutdown...');
    
    try {
      // Close job queues gracefully
      console.log('🔄 Closing job queues...');
      // The queues will be closed by the JobQueueManager's event handlers
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n📢 SIGINT received, shutting down...');
    process.kill(process.pid, 'SIGTERM');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Log process start info
  console.log(`🆔 Worker PID: ${process.pid}`);
  console.log(`📁 Working Directory: ${process.cwd()}`);
  console.log(`🌍 Node Environment: ${process.env.NODE_ENV || 'development'}`);
}

/**
 * CLI command processing
 */
function processCLICommands() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
SaaS X-Ray Background Worker

Usage: node worker.js [options]

Options:
  --help, -h       Show this help message
  --health-check   Run health check and exit
  --stats          Show queue statistics and exit

Environment Variables:
  REDIS_HOST       Redis server host (default: localhost)
  REDIS_PORT       Redis server port (default: 6379) 
  REDIS_PASSWORD   Redis server password
  REDIS_DB         Redis database number (default: 0)
  NODE_ENV         Node environment (default: development)
    `);
    process.exit(0);
  }

  if (args.includes('--health-check')) {
    (async () => {
      try {
        const health = await healthCheck();
        console.log('Health Check Result:', JSON.stringify(health, null, 2));
        process.exit(health.status === 'healthy' ? 0 : 1);
      } catch (error) {
        console.error('Health check failed:', error);
        process.exit(1);
      }
    })();
    return true;
  }

  if (args.includes('--stats')) {
    (async () => {
      try {
        const stats = await jobQueue.getQueueStats();
        console.log('Queue Statistics:', JSON.stringify(stats, null, 2));
        process.exit(0);
      } catch (error) {
        console.error('Failed to get stats:', error);
        process.exit(1);
      }
    })();
    return true;
  }

  return false;
}

// Check for CLI commands first
if (!processCLICommands()) {
  // Start the worker
  startWorker().catch((error) => {
    console.error('💥 Worker startup failed:', error);
    process.exit(1);
  });
}

// Export for testing purposes
export { startWorker, healthCheck };