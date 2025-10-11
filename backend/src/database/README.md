# Singura Database Foundation

## Overview

This directory contains the complete database foundation for Singura, providing secure, scalable multi-tenant support with proper encryption and relationship modeling.

## Architecture

### Core Tables

1. **organizations** - Multi-tenant organization management
   - UUID primary keys
   - Unique slug and domain constraints
   - Plan-based connection limits
   - Flexible JSONB settings

2. **platform_connections** - SaaS platform connections
   - Links to organizations with cascade deletes
   - Supports 8 major platforms (Slack, Google, Microsoft, etc.)
   - Status tracking with audit trail
   - Flexible metadata storage

3. **encrypted_credentials** - Secure token storage
   - AES-256-GCM encryption with authentication
   - Key rotation support
   - Automatic expiration tracking
   - Immutable design (replace, don't update)

4. **audit_logs** - Comprehensive event tracking
   - All system events tracked automatically
   - Supports compliance and security monitoring
   - Immutable design with data retention features

### Security Features

- **Row Level Security (RLS)** enabled on all sensitive tables
- **AES-256-GCM encryption** for all credentials with authentication tags
- **Key rotation support** with encryption key ID tracking
- **Comprehensive audit logging** with automatic triggers
- **Multi-tenant isolation** with proper foreign key constraints

### Performance Optimizations

- **Strategic indexes** on commonly queried fields
- **Composite indexes** for multi-column queries
- **Partial indexes** on conditional fields (expires_at, etc.)
- **Connection pooling** with health monitoring
- **Query performance monitoring** with slow query detection

## Usage

### Initialize Database

```typescript
import { initializeDatabase } from './database';

await initializeDatabase();
```

### Repository Pattern

```typescript
import { repositories } from './database';

// Create organization
const org = await repositories.organization.create({
  name: 'Acme Corp',
  slug: 'acme-corp',
  domain: 'acme.com'
});

// Create platform connection
const connection = await repositories.platformConnection.create({
  organization_id: org.id,
  platform_type: 'slack',
  platform_user_id: 'U12345',
  display_name: 'Acme Slack Workspace',
  permissions_granted: ['channels:read', 'users:read']
});

// Store encrypted credentials
await repositories.encryptedCredential.create({
  platform_connection_id: connection.id,
  credential_type: 'access_token',
  encrypted_value: 'xoxb-1234567890...'
});
```

### Migration Management

```bash
# Run pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create "add_new_feature"

# Validate migrations
npm run migrate:validate
```

## Files Structure

```
database/
├── index.ts              # Main exports
├── pool.ts               # Connection pooling
├── migrate.ts            # Migration runner
├── repositories/
│   ├── index.ts          # Repository exports
│   ├── base.ts           # Base repository class
│   ├── organization.ts   # Organization repository
│   ├── platform-connection.ts
│   ├── encrypted-credential.ts
│   └── audit-log.ts
└── README.md            # This file

migrations/
├── 001_initial_schema.sql # Initial database schema
└── init.sql              # Docker initialization
```

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5433/singura
ENCRYPTION_KEY=your-32-character-encryption-key-here
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_CONNECT_TIMEOUT=10000
DB_IDLE_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000
```

## Security Considerations

1. **Credential Encryption**: All sensitive data is encrypted using AES-256-GCM
2. **Key Rotation**: Supports seamless key rotation without downtime
3. **Audit Trail**: Comprehensive logging of all system events
4. **Row-Level Security**: Multi-tenant data isolation
5. **Connection Security**: SSL/TLS enforced in production
6. **Input Validation**: Parameterized queries prevent SQL injection

## Monitoring & Health Checks

```typescript
import { getDatabaseHealth } from './database';

const health = await getDatabaseHealth();
console.log('Database status:', health.status);
```

## Data Retention & Compliance

- Audit logs support automated cleanup with configurable retention periods
- Export functionality for compliance reporting
- Immutable audit trail ensures data integrity
- GDPR-compatible design with proper data relationships