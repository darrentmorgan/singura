/**
 * SaaS X-Ray Backend Server
 * Express.js server with comprehensive security and OAuth integration
 */

import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { securityMiddleware } from './security/middleware';
import authRoutes from './routes/auth';
import connectionRoutes from './routes/connections';
import automationRoutes from './routes/automations';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

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

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  });
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
const server = app.listen(PORT, () => {
  console.log(`🚀 SaaS X-Ray Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔒 Security middleware active`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  
  if (NODE_ENV === 'development') {
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  process.exit(1);
});

export default app;