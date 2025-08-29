/**
 * Test environment configuration
 * Sets up environment variables for testing
 */

process.env.NODE_ENV = 'test';

// Database configuration
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433'; // Different port for test database
process.env.DB_NAME = 'saas_xray_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// JWT configuration for testing
process.env.JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5f8QqKpnUj9yE
test_private_key_content_would_be_here_in_production
-----END PRIVATE KEY-----`;

process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuX/EKiqZ1I/chE
test_public_key_content_would_be_here_in_production
-----END PUBLIC KEY-----`;

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