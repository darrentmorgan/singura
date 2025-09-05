# SaaS X-Ray OAuth Backend Implementation

This document provides a comprehensive overview of the OAuth backend implementation for SaaS X-Ray Stage 1, including setup instructions, API documentation, and security features.

## Architecture Overview

The OAuth backend provides a secure, enterprise-grade implementation with the following components:

### Core Components

1. **OAuth Security Service** (`/src/security/oauth.ts`)
   - PKCE flow implementation (RFC 7636)
   - State parameter validation (CSRF protection)
   - Token exchange and refresh
   - Secure token revocation

2. **Platform Connectors** (`/src/connectors/`)
   - Slack connector with automation discovery
   - Extensible interface for additional platforms
   - Standardized API across all platforms

3. **Security Middleware** (`/src/security/middleware.ts`)
   - Rate limiting (general and auth-specific)
   - Input validation and sanitization
   - Security headers and CORS
   - Request logging and monitoring

4. **Audit System** (`/src/security/audit.ts`)
   - Comprehensive event logging
   - Threat detection and alerting
   - Compliance reporting (SOC 2, GDPR)
   - Real-time security monitoring

## API Endpoints

### OAuth Flow Endpoints

#### 1. Initiate OAuth Flow
```http
GET /api/auth/oauth/:platform/authorize
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "authorizationUrl": "https://slack.com/oauth/v2/authorize?client_id=...",
  "state": "secure-state-parameter"
}
```

#### 2. OAuth Callback Handler  
```http
GET /api/auth/oauth/:platform/callback?code=<auth_code>&state=<state>
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "connection": {
    "connectionId": "uuid",
    "platform": "slack",
    "displayName": "Slack - John Doe (Acme Corp)",
    "permissions": ["channels:read", "users:read", "team:read"]
  }
}
```

### Connection Management Endpoints

#### 3. List Connections
```http
GET /api/connections?platform=slack&status=active&page=1&limit=20
Authorization: Bearer <access_token>
```

#### 4. Get Connection Details
```http
GET /api/connections/:connectionId
Authorization: Bearer <access_token>
```

#### 5. Refresh Connection Tokens
```http
POST /api/connections/:connectionId/refresh
Authorization: Bearer <access_token>
```

#### 6. Validate Connection
```http
POST /api/connections/:connectionId/validate
Authorization: Bearer <access_token>
```

#### 7. Disconnect Platform
```http
DELETE /api/connections/:connectionId
Authorization: Bearer <access_token>
```

#### 8. Discover Automations
```http
POST /api/connections/:connectionId/discover
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "discovery": {
    "platform": "slack",
    "connectionId": "uuid",
    "automations": [
      {
        "id": "slack-bot-B12345",
        "name": "Support Bot",
        "type": "bot",
        "status": "active",
        "trigger": "message",
        "actions": ["respond", "process"]
      }
    ],
    "metadata": {
      "executionTimeMs": 1234,
      "automationsFound": 5,
      "riskScore": 42
    }
  }
}
```

## Security Features

### 1. OAuth Security (PKCE)
- **PKCE Implementation**: Full RFC 7636 compliance with S256 code challenge
- **State Validation**: Cryptographically secure state parameters
- **Token Security**: Encrypted storage with automatic rotation
- **Redirect URI Validation**: Strict allowlist-based validation

### 2. Rate Limiting
- **General API**: 100 requests per 15 minutes per user/IP
- **Auth Endpoints**: 5 attempts per 15 minutes per IP
- **Adaptive Controls**: Escalating restrictions for suspicious activity

### 3. Security Headers
- **Helmet.js Integration**: Comprehensive security headers
- **CORS Configuration**: Strict origin validation
- **CSP Policy**: Content Security Policy implementation
- **HSTS**: HTTP Strict Transport Security

### 4. Input Validation
- **Injection Prevention**: SQL, XSS, and command injection detection
- **Schema Validation**: Express-validator integration
- **Request Sanitization**: Automatic input cleaning

### 5. Audit Logging
- **Event Tracking**: All security-relevant events logged
- **Threat Detection**: Real-time pattern analysis
- **Compliance Reports**: SOC 2, GDPR, OWASP reporting
- **Alert System**: Configurable security alerts

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/saas_xray

# JWT & Encryption
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/api/auth/callback/slack

# Security
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://app.saas-xray.com
```

See `.env.example` for complete configuration options.

## Database Integration

### Schema Usage
- **Organizations**: Multi-tenant organization management
- **Platform Connections**: OAuth connection metadata
- **Encrypted Credentials**: Secure token storage with encryption
- **Audit Logs**: Comprehensive security event logging

### Key Features
- **Automatic Migrations**: Database schema versioning
- **Connection Pooling**: Optimized database connections
- **Transaction Support**: ACID compliance for critical operations

## Platform Support

### Current Implementation: Slack

**Scopes Required:**
- `channels:read` - Access public channel information
- `groups:read` - Access private channel information  
- `users:read` - View workspace members
- `team:read` - Access workspace information
- `bots:read` - View bot information
- `apps:read` - View installed applications

**Discovery Capabilities:**
- ✅ Workflow Builder automations
- ✅ Bots and AI assistants  
- ✅ Installed applications and integrations
- ✅ Webhook configurations
- ✅ Slash commands
- ✅ Audit logs (Enterprise Grid)

### Planned Platforms
- **Google Workspace**: Apps Script, Drive automation, Gmail filters
- **Microsoft 365**: Power Automate, Logic Apps, SharePoint workflows
- **HubSpot**: Workflows, sequences, integrations
- **Salesforce**: Process Builder, Flow, Apex triggers

## Testing

### OAuth Flow Testing
```bash
# Run comprehensive OAuth tests
npm run test:oauth

# Test specific environment configuration
npm run test:oauth -- --env-only

# Run full test suite  
npm test
```

### Manual Testing Flow

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test OAuth initiation:**
   ```bash
   curl -X GET "http://localhost:3001/api/auth/oauth/slack/authorize" \
     -H "Authorization: Bearer <your-jwt-token>"
   ```

3. **Complete OAuth flow:**
   - Visit the authorization URL from step 2
   - Grant permissions in Slack
   - Verify callback handling

## Deployment Considerations

### Production Requirements

1. **Environment Security**
   - Use environment-specific secrets
   - Enable HTTPS for all endpoints
   - Configure proper CORS origins
   - Set up monitoring and alerting

2. **Database Configuration**
   - Connection pooling optimization
   - Read replicas for analytics
   - Backup and recovery procedures
   - Migration deployment strategy

3. **Monitoring & Observability**
   - Security event monitoring
   - Performance metrics collection
   - Error tracking and alerting
   - Compliance audit trails

### Scaling Considerations

- **Horizontal Scaling**: Stateless design supports multiple instances
- **Load Balancing**: Session affinity not required
- **Caching Strategy**: Redis integration for rate limiting and sessions
- **Database Optimization**: Connection pooling and query optimization

## Security Compliance

### SOC 2 Controls
- ✅ CC6.1: Logical and physical access controls
- ✅ CC6.2: Authentication and authorization
- ✅ CC6.3: System users and access management
- ✅ CC6.7: Data transmission and disposal

### GDPR Compliance
- ✅ Data encryption at rest and in transit
- ✅ Access logging and audit trails  
- ✅ User consent and permission management
- ✅ Data retention and deletion policies

### OWASP Security
- ✅ A01: Broken Access Control - JWT + RBAC
- ✅ A02: Cryptographic Failures - AES-256-GCM encryption
- ✅ A03: Injection - Input validation and sanitization
- ✅ A05: Security Misconfiguration - Secure headers
- ✅ A07: Identification and Authentication Failures - MFA support

## Support and Documentation

### Additional Resources
- [OAuth Setup Guide](../docs/OAUTH_SETUP.md)
- [Security Architecture](../docs/SECURITY_ARCHITECTURE.md)
- [API Documentation](http://localhost:3001/api/docs)
- [Database Schema](./src/database/README.md)

### Getting Help

For issues or questions:

1. Check the [troubleshooting section](../docs/OAUTH_SETUP.md#troubleshooting)
2. Review error logs in `./logs/`
3. Run diagnostic tests: `npm run test:oauth`
4. Check security audit logs in the dashboard

---

**Last Updated**: August 2025  
**Version**: 1.0.0  
**Compliance**: SOC 2 Type II, GDPR, OWASP Top 10