# SaaS X-Ray Cloud Infrastructure Migration Plan

## Executive Summary

This document outlines the complete migration strategy from local development (Docker PostgreSQL) to production cloud infrastructure (Vercel + Cloud Database), with careful consideration for zero-downtime deployment, cost optimization, and scalability.

**Target Architecture**: Vercel (Frontend + Serverless API) + Supabase (PostgreSQL Database)

---

## Table of Contents

1. [Cloud Database Evaluation](#cloud-database-evaluation)
2. [Recommended Architecture](#recommended-architecture)
3. [Migration Strategy](#migration-strategy)
4. [Phase 0 Integration](#phase-0-integration)
5. [Environment Configuration](#environment-configuration)
6. [Cost Analysis](#cost-analysis)
7. [Deployment Pipeline](#deployment-pipeline)
8. [Rollback Strategy](#rollback-strategy)

---

## Cloud Database Evaluation

### Option Comparison Matrix

| Feature | Supabase | Neon | PlanetScale | Railway |
|---------|----------|------|-------------|---------|
| **Database** | PostgreSQL | PostgreSQL | MySQL/PostgreSQL* | PostgreSQL |
| **Pricing Model** | Fixed tier | Compute hours | Branch-based | Fixed tier |
| **Free Tier** | 500MB, 2 projects | 191.9 compute hrs/mo | Limited | 500MB |
| **Branching** | GitHub integration | Advanced branching | Advanced branching | Basic |
| **Connection Pooling** | PgBouncer included | Built-in | Vitess (MySQL) | Manual setup |
| **Serverless Compatible** | ✅ Excellent | ✅ Excellent | ✅ Good | ✅ Good |
| **Additional Features** | Auth, Storage, Realtime | Auto-scaling | Global distribution | Docker support |
| **Vercel Integration** | Native | Native | Native | Manual |
| **TypeScript Support** | Excellent | Excellent | Good | Good |
| **Auto-scaling** | Manual tier upgrade | Automatic | Automatic | Manual tier upgrade |
| **Starting Price** | $25/month | $19/month | $0.014/hr/branch | $5/month |
| **Best For** | Full-stack apps | Serverless apps | Scaling MySQL apps | Simple projects |

*PlanetScale added PostgreSQL support in 2024 but is primarily MySQL-focused.

### Recommendation: **Supabase**

**Why Supabase?**

1. **PostgreSQL Native**: You're already using PostgreSQL locally - zero database engine migration
2. **Vercel Integration**: Native integration with Vercel (one-click setup)
3. **Connection Pooling**: PgBouncer included (critical for serverless functions)
4. **Built-in Features**:
   - Authentication (can replace your custom JWT implementation)
   - Row Level Security (enterprise-grade data isolation)
   - Realtime subscriptions (can enhance your Socket.io features)
   - Storage for file uploads
5. **Pricing Transparency**: Fixed tiers vs. complex compute-hour calculations
6. **Developer Experience**:
   - Local development with `supabase start`
   - Database branching with GitHub integration
   - Auto-generated TypeScript types
7. **Migration Path**: Straightforward PostgreSQL dump/restore
8. **Scalability**: Read replicas available for horizontal scaling

**Why NOT Neon?**

While Neon has excellent auto-scaling and compute-hour pricing, Supabase's additional features (Auth, Storage, Realtime) provide more value for an enterprise SaaS platform. Neon would be better if you only needed a pure database solution.

---

## Recommended Architecture

### Production Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION STACK                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│   Vercel Frontend    │          │   Vercel Functions   │
│   (React + Vite)     │◄─────────│   (Express API)      │
│                      │   API    │                      │
│ • Static hosting     │  Calls   │ • Serverless Edge    │
│ • CDN distribution   │          │ • Auto-scaling       │
│ • Environment vars   │          │ • Cold start optim.  │
└──────────────────────┘          └──────────────────────┘
                                            │
                                            │ Connection
                                            │ Pooling
                                            ▼
                              ┌─────────────────────────┐
                              │   Supabase PostgreSQL   │
                              │   (Database + Services) │
                              │                         │
                              │ • Connection pooler     │
                              │ • Automatic backups     │
                              │ • Point-in-time restore │
                              │ • Read replicas         │
                              └─────────────────────────┘
                                            │
                                            │
                              ┌─────────────────────────┐
                              │   Supabase Storage      │
                              │   (Optional)            │
                              │                         │
                              │ • OAuth credentials     │
                              │ • Audit log exports     │
                              │ • User uploads          │
                              └─────────────────────────┘

┌──────────────────────┐
│   Upstash Redis      │
│   (Optional)         │
│                      │
│ • Session storage    │
│ • Rate limiting      │
│ • Job queues (Bull)  │
└──────────────────────┘
```

### Development vs Production Comparison

| Component | Local Development | Production |
|-----------|------------------|------------|
| **Frontend** | Vite dev server (localhost:4200) | Vercel Edge Network |
| **Backend API** | ts-node (localhost:4201) | Vercel Serverless Functions |
| **Database** | Docker PostgreSQL (localhost:5433) | Supabase PostgreSQL (pooled) |
| **Redis** | Docker Redis (localhost:6379) | Upstash Redis (optional) |
| **Migrations** | `npm run migrate` | Supabase CLI / GitHub Actions |
| **Environment** | `.env` file | Vercel Environment Variables |

---

## Migration Strategy

### Migration Phases

```
Phase 0: Shared Types (Current)
    │
    ├─ Preparation Phase (Week 1)
    │   ├─ Set up Supabase project
    │   ├─ Configure connection pooling
    │   ├─ Adapt database pool for serverless
    │   └─ Environment variable mapping
    │
    ├─ Database Migration Phase (Week 2)
    │   ├─ Export local schema + data
    │   ├─ Import to Supabase
    │   ├─ Validate data integrity
    │   └─ Test migrations on Supabase
    │
    ├─ Backend Migration Phase (Week 3)
    │   ├─ Adapt Express for Vercel Functions
    │   ├─ Configure connection pooling (PgBouncer)
    │   ├─ Deploy staging environment
    │   └─ Integration testing
    │
    ├─ Frontend Migration Phase (Week 4)
    │   ├─ Update API endpoints
    │   ├─ Configure Vercel deployment
    │   ├─ Environment variable setup
    │   └─ Production deployment
    │
    └─ Validation & Cutover (Week 5)
        ├─ Performance testing
        ├─ Security audit
        ├─ DNS cutover (if applicable)
        └─ Monitor production metrics
```

### Zero-Downtime Strategy

**Approach**: Blue-Green Deployment with Read Replica

1. **Phase 1: Dual-Write Setup**
   - Continue writing to local PostgreSQL
   - Mirror writes to Supabase (async replication)
   - Read from local PostgreSQL

2. **Phase 2: Data Sync Verification**
   - Validate data consistency between local and Supabase
   - Run automated consistency checks
   - Fix any discrepancies

3. **Phase 3: Read Cutover**
   - Switch reads to Supabase
   - Continue dual-writes for safety
   - Monitor for errors

4. **Phase 4: Write Cutover**
   - Stop writes to local PostgreSQL
   - All writes go to Supabase
   - Keep local as read-only backup for 1 week

5. **Phase 5: Decommission**
   - Archive local database
   - Remove local PostgreSQL dependency
   - Update documentation

---

## Phase 0 Integration

### Database Adapter Pattern

To support both local and cloud databases during development, implement a database adapter pattern in Phase 0.

**File**: `shared-types/src/database/database-adapter.ts`

```typescript
/**
 * Database Adapter Interface
 * Supports both local PostgreSQL and Supabase
 */

export type DatabaseProvider = 'local' | 'supabase';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  local?: LocalDatabaseConfig;
  supabase?: SupabaseDatabaseConfig;
}

export interface LocalDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface SupabaseDatabaseConfig {
  url: string;           // Supabase project URL
  anonKey: string;       // Supabase anon/public key
  serviceKey?: string;   // Supabase service role key (backend only)
  connectionPoolUrl: string; // PgBouncer connection string
}

export interface DatabaseAdapter {
  provider: DatabaseProvider;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T>;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface TransactionClient {
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

**Implementation**: `backend/src/database/adapters/supabase-adapter.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import {
  DatabaseAdapter,
  SupabaseDatabaseConfig,
  QueryResult,
  TransactionClient
} from '@saas-xray/shared-types';

export class SupabaseDatabaseAdapter implements DatabaseAdapter {
  provider: 'supabase' = 'supabase';
  private supabase: SupabaseClient;
  private pool: Pool; // PostgreSQL connection pool for direct queries

  constructor(private config: SupabaseDatabaseConfig) {
    // Supabase client for Auth, Storage, Realtime
    this.supabase = createClient(
      config.url,
      config.serviceKey || config.anonKey
    );

    // Direct PostgreSQL pool for custom queries (uses PgBouncer)
    this.pool = new Pool({
      connectionString: config.connectionPoolUrl,
      max: 1, // Serverless: minimize connections (PgBouncer handles pooling)
      idleTimeoutMillis: 5000, // Close idle connections quickly
      connectionTimeoutMillis: 10000
    });
  }

  async connect(): Promise<void> {
    // Test connection
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Supabase PostgreSQL connection successful');
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    } finally {
      client.release();
    }
  }

  async transaction<T>(
    callback: (client: TransactionClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const transactionClient: TransactionClient = {
        query: async <R>(sql: string, params?: any[]) => {
          const result = await client.query(sql, params);
          return {
            rows: result.rows as R[],
            rowCount: result.rowCount || 0
          };
        },
        commit: async () => {
          await client.query('COMMIT');
        },
        rollback: async () => {
          await client.query('ROLLBACK');
        }
      };

      const result = await callback(transactionClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Supabase-specific features
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}
```

**Usage in Backend**:

```typescript
// backend/src/database/pool.ts (updated)
import { SupabaseDatabaseAdapter } from './adapters/supabase-adapter';
import { LocalDatabaseAdapter } from './adapters/local-adapter';
import { DatabaseAdapter } from '@saas-xray/shared-types';

export let db: DatabaseAdapter;

export async function initializeDatabase(): Promise<void> {
  const provider = process.env.DATABASE_PROVIDER as 'local' | 'supabase' || 'local';

  if (provider === 'supabase') {
    db = new SupabaseDatabaseAdapter({
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      connectionPoolUrl: process.env.SUPABASE_CONNECTION_POOL_URL!
    });
  } else {
    db = new LocalDatabaseAdapter({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'saas_xray',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
  }

  await db.connect();
}
```

### Migration Script Updates

**File**: `backend/src/database/migrate.ts` (updated for Supabase)

```typescript
import { db } from './pool';

export class MigrationRunner {
  // ... existing code ...

  /**
   * Run migrations on Supabase or local database
   */
  async migrate(): Promise<void> {
    console.log(`Starting database migration (provider: ${db.provider})...`);

    await this.initializeMigrationsTable();

    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    const pendingMigrations = migrationFiles.filter(file => {
      const id = this.parseMigrationId(file);
      return !appliedMigrations.some(m => m.id === id);
    });

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const file of pendingMigrations) {
      const id = this.parseMigrationId(file);
      const filePath = path.join(this.migrationsDir, file);

      console.log(`Applying migration ${id}: ${file}`);

      try {
        // Use transaction for atomicity
        await db.transaction(async (client) => {
          await this.executeSqlFile(filePath, client);

          // Record migration
          await client.query(
            'INSERT INTO schema_migrations (id, filename) VALUES ($1, $2)',
            [id, file]
          );
        });

        console.log(`✅ Applied migration ${id}: ${file}`);
      } catch (error) {
        console.error(`❌ Failed to apply migration ${id}:`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  private async executeSqlFile(
    filePath: string,
    client: TransactionClient
  ): Promise<void> {
    const sql = await fs.readFile(filePath, 'utf-8');

    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
  }
}
```

---

## Environment Configuration

### Local Development (.env)

```bash
# Database Provider
DATABASE_PROVIDER=local

# Local PostgreSQL (Docker)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=saas_xray
DB_USER=postgres
DB_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray

# Local Redis (Docker)
REDIS_URL=redis://localhost:6379

# Backend Server
PORT=4201
CORS_ORIGIN=http://localhost:4200

# Encryption
MASTER_ENCRYPTION_KEY=dev-master-encryption-key-with-sufficient-length-for-aes-256-gcm-encryption-2024-secure

# OAuth (Development)
SLACK_CLIENT_ID=your-dev-client-id
SLACK_CLIENT_SECRET=your-dev-client-secret
SLACK_REDIRECT_URI=http://localhost:4201/api/auth/callback/slack

GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4201/api/auth/callback/google
```

### Staging Environment (Vercel)

```bash
# Database Provider
DATABASE_PROVIDER=supabase

# Supabase PostgreSQL
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_CONNECTION_POOL_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true

# Legacy DATABASE_URL for backward compatibility
DATABASE_URL=${SUPABASE_CONNECTION_POOL_URL}

# Redis (Optional - Upstash)
REDIS_URL=rediss://default:[password]@xxxxx.upstash.io:6379

# Backend (Vercel Functions)
CORS_ORIGIN=https://staging-saas-xray.vercel.app

# Encryption (Production-grade)
MASTER_ENCRYPTION_KEY=prod-master-encryption-key-minimum-32-characters-long-for-aes-256-gcm-2025

# OAuth (Production)
SLACK_CLIENT_ID=production-client-id
SLACK_CLIENT_SECRET=production-client-secret
SLACK_REDIRECT_URI=https://api-staging.saas-xray.com/api/auth/callback/slack

GOOGLE_CLIENT_ID=production-client-id
GOOGLE_CLIENT_SECRET=production-client-secret
GOOGLE_REDIRECT_URI=https://api-staging.saas-xray.com/api/auth/callback/google

# AI Platform APIs (Phase 1-4)
OPENAI_ENTERPRISE_API_KEY=sk-proj-xxxxx
OPENAI_ORGANIZATION_ID=org-xxxxx
CLAUDE_ENTERPRISE_API_KEY=sk-ant-xxxxx
CLAUDE_ORGANIZATION_ID=org-xxxxx
GPT5_API_KEY=sk-proj-xxxxx
GPT5_MODEL=gpt-5-turbo
```

### Production Environment (Vercel)

Same as staging, but with:
- Production OAuth credentials
- Production Supabase project
- Production domain names

---

## Vercel Serverless Adaptation

### Current Backend Architecture Issue

Your current `backend/src/simple-server.ts` creates a long-running Express server, which doesn't work with Vercel's serverless functions (stateless, short-lived).

### Solution: Hybrid Approach

**Option 1: Vercel Serverless Functions** (Recommended for Phase 0+)

Convert Express routes to individual serverless functions:

```
backend/
├── api/                          # Vercel serverless functions
│   ├── auth/
│   │   ├── callback/
│   │   │   ├── slack.ts         # /api/auth/callback/slack
│   │   │   ├── google.ts        # /api/auth/callback/google
│   │   │   └── claude.ts        # /api/auth/callback/claude
│   │   └── login.ts             # /api/auth/login
│   ├── connections/
│   │   ├── index.ts             # /api/connections
│   │   └── [id].ts              # /api/connections/:id
│   ├── automations/
│   │   ├── index.ts             # /api/automations
│   │   └── discover.ts          # /api/automations/discover
│   ├── ai-platforms/            # NEW: Phase 1-4
│   │   ├── gemini/
│   │   │   ├── audit-logs.ts    # /api/ai-platforms/gemini/audit-logs
│   │   │   └── analytics.ts     # /api/ai-platforms/gemini/analytics
│   │   ├── chatgpt/
│   │   │   ├── audit-logs.ts    # /api/ai-platforms/chatgpt/audit-logs
│   │   │   └── analytics.ts     # /api/ai-platforms/chatgpt/analytics
│   │   ├── claude/
│   │   │   ├── audit-logs.ts    # /api/ai-platforms/claude/audit-logs
│   │   │   └── analytics.ts     # /api/ai-platforms/claude/analytics
│   │   └── analysis/
│   │       └── gpt5.ts          # /api/ai-platforms/analysis/gpt5
│   └── health.ts                # /api/health
├── src/                          # Shared utilities
│   ├── connectors/
│   ├── services/
│   ├── database/
│   └── middleware/
└── vercel.json                   # Vercel configuration
```

**Example Serverless Function**:

```typescript
// backend/api/auth/callback/slack.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../../../src/database/pool';
import { slackConnector } from '../../../src/connectors/slack';

// Initialize database connection (reused across warm invocations)
let dbInitialized = false;
async function ensureDatabase() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureDatabase();

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // OAuth callback logic
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI!
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      return res.status(400).json({ error: tokenData.error });
    }

    // Store credentials
    // ... (use your existing logic)

    return res.status(200).json({
      success: true,
      message: 'Slack integration successful'
    });
  } catch (error) {
    console.error('Slack OAuth error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

**Option 2: Express on Vercel** (Short-term compatibility)

Wrap your existing Express app for Vercel:

```typescript
// backend/api/index.ts
import { createServer } from '../src/simple-server';

// Create Express app (cached across warm invocations)
let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await createServer();
  }
  return app(req, res);
}
```

**Recommended**: Use Option 1 for new features (Phase 1-4), gradually migrate existing routes.

---

## Vercel Configuration

**File**: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"],
  "functions": {
    "backend/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

**Frontend Build Script** (frontend/package.json):

```json
{
  "scripts": {
    "build": "vite build",
    "vercel-build": "npm run build"
  }
}
```

---

## Cost Analysis

### Supabase Pricing (Recommended Tier: Pro)

| Tier | Monthly Cost | Database Size | Egress | Connection Pooling | Backups |
|------|--------------|---------------|--------|-------------------|---------|
| Free | $0 | 500 MB | 2 GB | ✅ | 7 days |
| Pro | **$25** | 8 GB | 50 GB | ✅ | 30 days |
| Team | $599 | 100 GB | 250 GB | ✅ | 90 days |
| Enterprise | Custom | Unlimited | Custom | ✅ | Custom |

**Recommended**: Start with **Pro ($25/month)**, upgrade to Team as you scale.

**Why Pro?**
- 8 GB database (sufficient for 10,000+ organizations)
- 50 GB egress (enough for moderate API traffic)
- Daily backups with 30-day retention
- Connection pooling (PgBouncer)
- Point-in-time recovery

### Vercel Pricing

| Tier | Monthly Cost | Bandwidth | Serverless Executions | Features |
|------|--------------|-----------|----------------------|----------|
| Hobby | $0 | 100 GB | Unlimited | Personal projects |
| Pro | **$20** | 1 TB | Unlimited | Custom domains, analytics |
| Enterprise | Custom | Custom | Unlimited | SLA, support |

**Recommended**: Start with **Pro ($20/month)**.

### Upstash Redis (Optional)

| Tier | Monthly Cost | Max Commands | Storage | Notes |
|------|--------------|-------------|---------|-------|
| Free | $0 | 10,000/day | 256 MB | Good for dev |
| Pay-as-you-go | **~$10-50** | Pay per request | Pay per GB | Production |

**Consideration**: Redis is optional. For Phase 0-4, you can defer Redis migration and use Vercel's built-in caching or Supabase for session storage.

### Total Monthly Cost Estimate

| Component | Tier | Cost |
|-----------|------|------|
| Supabase | Pro | $25 |
| Vercel | Pro | $20 |
| Upstash Redis (optional) | Pay-as-you-go | $10-20 |
| **Total** | | **$55-65/month** |

**Comparison to self-hosting**:
- AWS EC2 t3.medium + RDS: ~$100-150/month
- DigitalOcean Droplet + Managed DB: ~$80-120/month
- **Savings**: 35-60% cheaper + zero DevOps overhead

---

## Database Migration Procedure

### Step 1: Set Up Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project (or use dashboard)
# https://supabase.com/dashboard
# Project Name: saas-xray-production
# Database Password: [generate strong password]
# Region: us-east-1 (closest to Vercel iad1)
```

### Step 2: Export Local Database

```bash
# Export schema + data from local PostgreSQL
docker exec saas-xray-postgres-1 pg_dump \
  -U postgres \
  -d saas_xray \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f /tmp/saas_xray_backup.sql

# Copy backup to host
docker cp saas-xray-postgres-1:/tmp/saas_xray_backup.sql ./backup/saas_xray_backup.sql
```

### Step 3: Import to Supabase

```bash
# Option 1: Via Supabase CLI
supabase db push --db-url "postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres"

# Option 2: Direct psql
psql "postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres" \
  -f ./backup/saas_xray_backup.sql
```

### Step 4: Validate Migration

```bash
# Run validation script
npm run validate:db-migration
```

**Validation Script**: `backend/scripts/validate-migration.ts`

```typescript
import { Pool } from 'pg';

async function validateMigration() {
  const local = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5433/saas_xray'
  });

  const supabase = new Pool({
    connectionString: process.env.SUPABASE_CONNECTION_POOL_URL
  });

  try {
    // Compare table counts
    const localTables = await local.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const supabaseTables = await supabase.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log(`Local tables: ${localTables.rows.length}`);
    console.log(`Supabase tables: ${supabaseTables.rows.length}`);

    if (localTables.rows.length !== supabaseTables.rows.length) {
      throw new Error('Table count mismatch!');
    }

    // Compare row counts for each table
    for (const { table_name } of localTables.rows) {
      const localCount = await local.query(`SELECT COUNT(*) FROM ${table_name}`);
      const supabaseCount = await supabase.query(`SELECT COUNT(*) FROM ${table_name}`);

      console.log(`${table_name}: local=${localCount.rows[0].count}, supabase=${supabaseCount.rows[0].count}`);

      if (localCount.rows[0].count !== supabaseCount.rows[0].count) {
        throw new Error(`Row count mismatch in ${table_name}!`);
      }
    }

    console.log('✅ Migration validation successful!');
  } finally {
    await local.end();
    await supabase.end();
  }
}

validateMigration().catch(console.error);
```

### Step 5: Configure Supabase Connection Pooling

In Supabase Dashboard:
1. Go to **Settings** > **Database**
2. Copy **Connection Pooling** URL (uses PgBouncer)
3. Use this URL for `SUPABASE_CONNECTION_POOL_URL`

**Format**: `postgresql://postgres:[password]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true`

**Important**: Use port `6543` (pooler) not `5432` (direct) for serverless functions.

---

## Deployment Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # Job 1: Run Tests
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: saas_xray_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build shared-types
        run: cd shared-types && npm run build

      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/saas_xray_test
          NODE_ENV: test
        run: cd backend && npm test

      - name: Run frontend tests
        run: cd frontend && npm test

  # Job 2: Database Migration (Supabase)
  migrate:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Run migrations on Supabase
        env:
          DATABASE_PROVIDER: supabase
          SUPABASE_CONNECTION_POOL_URL: ${{ secrets.SUPABASE_CONNECTION_POOL_URL }}
        run: cd backend && npm run migrate

  # Job 3: Deploy to Vercel
  deploy:
    needs: [test, migrate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prod --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

      - name: Run E2E Tests
        env:
          PLAYWRIGHT_BASE_URL: https://saas-xray.com
        run: npm run test:e2e
```

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)

```bash
# Vercel: Rollback to previous deployment
vercel rollback [deployment-url]

# Supabase: Point-in-time recovery (if needed)
# Via Supabase Dashboard: Database > Backups > Restore
```

### Database Rollback

**Option 1: Point-in-Time Recovery** (Supabase Pro+)
- Restore database to any point within 30 days
- Zero data loss up to the recovery point

**Option 2: Manual Backup Restore**
```bash
# Restore from backup
psql "postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres" \
  -f ./backup/pre-migration-backup.sql
```

### Monitoring & Alerts

Set up alerts in Vercel + Supabase:

1. **Vercel**:
   - Error rate > 5%
   - Response time > 2s (p95)
   - Deployment failures

2. **Supabase**:
   - CPU > 80%
   - Disk usage > 80%
   - Connection pool exhaustion

---

## Phase-Specific Considerations

### Phase 0: Shared Types

**Database Changes**: None
**Deployment**: Types package only, no cloud migration needed yet

### Phase 1-4: AI Platform Detection

**Database Changes**: New tables for AI platform audit logs
- `ai_platform_audit_logs`
- `ai_analysis_results`
- `gpt5_analysis_cache`

**Migration Strategy**:
1. Create tables locally
2. Test with local data
3. Export migrations
4. Apply to Supabase staging
5. Validate in production

**Supabase Advantage**: Real-time subscriptions for live AI detection alerts

---

## Success Criteria

### Database Migration
- [ ] All tables migrated successfully
- [ ] Row counts match between local and Supabase
- [ ] All indexes recreated
- [ ] Foreign key constraints validated
- [ ] Performance benchmarks met (< 100ms query latency)

### Vercel Deployment
- [ ] Frontend deployed and accessible
- [ ] API functions responding correctly
- [ ] Environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### Integration Testing
- [ ] OAuth flows working (Slack, Google, ChatGPT, Claude, Gemini)
- [ ] Real-time discovery functional
- [ ] Dashboard loading with real data
- [ ] GPT-5 analysis service operational
- [ ] No connection pool exhaustion

### Performance
- [ ] P95 response time < 500ms
- [ ] Cold start time < 1s
- [ ] Database connection pooling working
- [ ] Zero connection leaks

---

## Timeline

| Week | Phase | Activities |
|------|-------|-----------|
| Week 1 | Preparation | Supabase setup, adapter implementation |
| Week 2 | Database Migration | Export, import, validate |
| Week 3 | Backend Adaptation | Serverless conversion, testing |
| Week 4 | Frontend Deployment | Vercel config, environment setup |
| Week 5 | Validation | E2E testing, performance tuning |

**Can run in parallel with AI Platform Detection development!**

---

## Next Steps

1. **Immediate**:
   - Create Supabase project
   - Implement database adapter (Phase 0)

2. **Week 1**:
   - Configure Vercel project
   - Set up environment variables

3. **Week 2+**:
   - Gradual migration as AI features are developed
   - Staging environment for testing

---

**Document Version**: 1.0
**Last Updated**: 2025-01-02
**Author**: SaaS X-Ray Infrastructure Team
