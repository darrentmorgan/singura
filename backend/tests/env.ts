/**
 * Test environment configuration
 * Sets up environment variables for testing
 */

process.env.NODE_ENV = 'test';

// Database configuration - Using PostgreSQL test database (Docker)
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'saas_xray_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.TEST_DATABASE_URL = 'postgresql://postgres:password@localhost:5433/saas_xray_test';

// JWT configuration for testing - use simple secret for HMAC
process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-entropy-for-hmac-sha256-algorithm';
process.env.JWT_ALGORITHM = 'HS256';

// Encryption configuration
process.env.MASTER_ENCRYPTION_KEY = 'test_master_encryption_key_with_sufficient_length_for_aes_256_gcm_encryption';
process.env.ENCRYPTION_SALT = 'test-salt-for-key-derivation';

// OAuth configuration for testing
process.env.SLACK_CLIENT_ID = 'test_slack_client_id';
process.env.SLACK_CLIENT_SECRET = 'test_slack_client_secret';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_google_client_secret';
process.env.MICROSOFT_CLIENT_ID = 'test_microsoft_client_id';
process.env.MICROSOFT_CLIENT_SECRET = 'test_microsoft_client_secret';

// OAuth redirect URIs
process.env.SLACK_REDIRECT_URI = 'http://localhost:3001/auth/slack/callback';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';
process.env.MICROSOFT_REDIRECT_URI = 'http://localhost:3001/auth/microsoft/callback';

// Redis configuration for testing
process.env.REDIS_URL = 'redis://localhost:6380'; // Different port for test Redis

// Security configuration
process.env.SESSION_SECRET = 'test_session_secret_for_development_only';
process.env.API_RATE_LIMIT_WINDOW = '900000'; // 15 minutes
process.env.API_RATE_LIMIT_MAX_REQUESTS = '100';

// Logging level for tests
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests