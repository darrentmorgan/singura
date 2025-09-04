/**
 * SaaS X-Ray Backend Server with Socket.io Real-time Support
 * Express.js server with comprehensive security, OAuth integration, and real-time updates
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { securityMiddleware } from './security/middleware';
import { RealTimeService } from './services/realtime-service';
import { healthCheck } from './jobs/queue';
import authRoutes from './routes/auth';
import connectionRoutes from './routes/connections';
import automationRoutes from './routes/automations';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize real-time service
const realTimeService = new RealTimeService(httpServer);

// Trust proxy for accurate client IP addresses
app.set('trust proxy', NODE_ENV === 'production' ? 1 : false);

// Apply security middleware first
app.use(securityMiddleware.emergencyShutdownMiddleware());
app.use(securityMiddleware.securityHeadersMiddleware());
app.use(securityMiddleware.corsMiddleware());
app.use(securityMiddleware.rateLimitingMiddleware());
app.use(securityMiddleware.ipBlockingMiddleware());

// Standard middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request tracking middleware
app.use(securityMiddleware.requestLoggingMiddleware());

// Make real-time service available to routes
app.use((req, res, next) => {
  (req as any).realTimeService = realTimeService;
  next();
});

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    // Check job queue health
    const queueHealth = await healthCheck();
    
    // Check real-time service health
    const socketStats = realTimeService.getConnectionStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      services: {
        database: 'healthy', // Would check actual DB connection
        redis: queueHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        jobQueue: queueHealth.status,
        realTime: 'healthy'
      },
      realTimeConnections: socketStats.totalConnections,
      organizationsConnected: socketStats.organizationsConnected
    };

    // Determine overall health status
    const unhealthyServices = Object.values(health.services)
      .filter(status => status !== 'healthy').length;
    
    if (unhealthyServices > 0) {
      health.status = unhealthyServices >= 2 ? 'unhealthy' : 'degraded';
      res.status(unhealthyServices >= 2 ? 503 : 200);
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Real-time statistics endpoint
app.get('/api/realtime/stats', (req, res) => {
  try {
    const stats = realTimeService.getConnectionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get real-time statistics',
      code: 'STATS_ERROR'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', connectionRoutes);
app.use('/api/automations', automationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = NODE_ENV === 'development' ? err.message || 'Internal server error' : 'Internal server error';
  const stack = NODE_ENV === 'development' ? err.stack : undefined;
  
  res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
    requestId: req.requestId,
    stack
  });
});

// Start server
const server = httpServer.listen(PORT, () => {
  console.log(`🚀 SaaS X-Ray Backend Server with Real-time Support running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔒 Security middleware active`);
  console.log(`🌐 CORS origins: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`⚡ Socket.io real-time updates enabled`);
  
  if (NODE_ENV === 'development') {
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`📈 Real-time Stats: http://localhost:${PORT}/api/realtime/stats`);
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`🔄 ${signal} received, shutting down gracefully...`);
  
  try {
    // Close real-time service
    await realTimeService.close();
    console.log('✅ Real-time service closed');

    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.log('❌ Force closing server after timeout');
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Export app and real-time service for testing
export default app;
export { realTimeService };