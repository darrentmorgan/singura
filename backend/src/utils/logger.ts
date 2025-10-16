/**
 * Winston Logger Configuration
 * Production-grade logging with JSON formatting, file rotation, and correlation IDs
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for console logging
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Custom format for adding correlation IDs
const correlationFormat = winston.format((info) => {
  if (!info.correlationId) {
    info.correlationId = uuidv4();
  }
  return info;
});

// Format for development
const devFormat = winston.format.combine(
  correlationFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...metadata }) => {
    let msg = `${timestamp} [${correlationId?.substring(0, 8) || 'no-id'}] ${level}: ${message}`;

    // Add metadata if exists
    if (Object.keys(metadata).length > 0) {
      // Remove error stack from metadata display (it's already in the message for errors)
      const { stack, ...cleanMetadata } = metadata;
      if (Object.keys(cleanMetadata).length > 0) {
        msg += ` ${JSON.stringify(cleanMetadata)}`;
      }
    }

    return msg;
  })
);

// Format for production
const prodFormat = winston.format.combine(
  correlationFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// File transport for errors
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.json(),
});

// File transport for all logs
const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: winston.format.json(),
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: isProduction ? prodFormat : devFormat,
  silent: isTest, // Silence logs during tests
});

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels,
  format: isProduction ? prodFormat : devFormat,
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: winston.format.json(),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: winston.format.json(),
    }),
  ],
});

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logDatabaseEvent = (event: string, details?: any) => {
  logger.info('Database event', { category: 'database', event, ...details });
};

export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' :
                 severity === 'medium' ? 'warn' : 'info';

  logger.log(level, 'Security event', {
    category: 'security',
    event,
    severity,
    ...details
  });
};

export const logOAuthEvent = (event: string, platform: string, details?: any) => {
  logger.info('OAuth event', {
    category: 'oauth',
    event,
    platform,
    ...details
  });
};

export const logAPIRequest = (method: string, url: string, statusCode: number, duration: number, details?: any) => {
  const level = statusCode >= 500 ? 'error' :
                statusCode >= 400 ? 'warn' : 'info';

  logger.log(level, 'API request', {
    category: 'api',
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    ...details,
  });
};

export const logPerformance = (operation: string, duration: number, details?: any) => {
  const level = duration > 5000 ? 'warn' : 'info';

  logger.log(level, 'Performance metric', {
    category: 'performance',
    operation,
    duration: `${duration}ms`,
    ...details,
  });
};

// Create child logger with additional context
export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// Export default logger
export default logger;