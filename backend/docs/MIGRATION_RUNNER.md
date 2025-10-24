# Migration Runner Documentation

## Overview

The Migration Runner provides robust database schema management with a dedicated connection pool, transaction support, and proper cleanup mechanisms.

## Key Features

1. **Dedicated Migration Pool**
   - Isolated from main application pool
   - Single connection (max: 1) for migration safety
   - Prevents pool state conflicts
   - Automatic cleanup after operations

2. **Transaction Support**
   - Each migration runs in a transaction
   - Automatic rollback on failure
   - Records failed migrations for debugging
   - Atomic schema changes

3. **Migration Tracking**
   - SHA-256 checksums for integrity verification
   - Execution time tracking
   - Success/failure status
   - Detailed error messages

4. **CLI Tools**
   - `pnpm run migrate` - Apply pending migrations
   - `pnpm run migrate:status` - Show migration status
   - `pnpm run migrate:validate` - Verify checksums

## Architecture

### Pool Isolation

```typescript
// Migration pool (dedicated, max: 1 connection)
const migrationPool = new Pool({
  max: 1,
  application_name: 'singura-migrations'
});

// Application pool (shared, max: 20 connections)
const appPool = new Pool({
  max: 20,
  application_name: 'singura-backend'
});
```

### Transaction Flow

```
1. Initialize migration pool
2. Create migrations table (if not exists)
3. Get applied migrations
4. For each pending migration:
   a. BEGIN transaction
   b. Execute migration SQL
   c. Record success in migrations table
   d. COMMIT transaction
   e. (On error: ROLLBACK + record failure)
5. Cleanup pool
```

## Usage

### Running Migrations

```bash
# Apply pending migrations
pnpm run migrate

# Show migration status
pnpm run migrate:status

# Validate checksums
pnpm run migrate:validate
```

### Programmatic Usage

```typescript
import { MigrationRunner } from './database/migrate';

const runner = new MigrationRunner();

try {
  // Initialize dedicated pool
  await runner.initialize();

  // Apply migrations
  const result = await runner.migrate();
  console.log(`Applied ${result.applied} migrations`);

} finally {
  // Always cleanup
  await runner.cleanup();
}
```

### Server Startup

```typescript
// simple-server.ts
import { runMigrations } from './database/migrate';

async function startServer() {
  // Run migrations with automatic cleanup
  await runMigrations();

  // Start HTTP server
  httpServer.listen(PORT);
}
```

## Migration Files

### Naming Convention

```
YYYYMMDDHHMMSS_description.sql

Examples:
  000_create_migration_table.sql
  001_initial_schema.sql
  002_discovery_schema.sql
  003_clerk_complete_migration.sql
```

### File Structure

```sql
-- Migration: Add user roles
-- Created: 2025-10-16

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_roles_name ON user_roles(name);
```

## Migration Table Schema

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  checksum VARCHAR(64),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Error Handling

### Migration Failure

When a migration fails:
1. Transaction is rolled back (no partial changes)
2. Failure is recorded in `schema_migrations` table
3. Error message and stack trace are logged
4. Server startup is aborted (fail-fast)

### Checksum Mismatch

If applied migration checksums don't match files:
1. Validation fails with detailed error
2. Lists all mismatched migrations
3. Prevents accidental schema changes
4. Requires manual intervention

## Best Practices

### 1. Atomic Migrations

```sql
-- ✅ GOOD: Single responsibility
CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR);

-- ❌ BAD: Multiple unrelated changes
CREATE TABLE users (...);
CREATE TABLE products (...);
ALTER TABLE orders ...;
```

### 2. Idempotent Operations

```sql
-- ✅ GOOD: Safe to re-run
CREATE TABLE IF NOT EXISTS users (...);

-- ❌ BAD: Fails on re-run
CREATE TABLE users (...);
```

### 3. Rollback Safety

```sql
-- ✅ GOOD: Can be rolled back
ALTER TABLE users ADD COLUMN age INTEGER;

-- ❌ BAD: Cannot be easily rolled back
DROP TABLE users;
```

### 4. Data Migrations

```sql
-- ✅ GOOD: Handle edge cases
UPDATE users SET status = 'active'
WHERE status IS NULL OR status = '';

-- ❌ BAD: Assumes data state
UPDATE users SET status = 'active';
```

## Troubleshooting

### Migration Stuck

```bash
# Check current migrations
pnpm run migrate:status

# Manually mark migration as failed (if safe)
psql -d singura -c "UPDATE schema_migrations SET success = false WHERE migration_name = '001_stuck';"

# Re-run migrations
pnpm run migrate
```

### Checksum Mismatch

```bash
# Validate migrations
pnpm run migrate:validate

# If intentional change, update checksum
psql -d singura -c "UPDATE schema_migrations SET checksum = NULL WHERE migration_name = '001_changed';"

# Re-validate
pnpm run migrate:validate
```

### Pool Connection Issues

```bash
# Test database connection
psql -h localhost -p 5433 -U postgres -d singura

# Check active connections
psql -d singura -c "SELECT * FROM pg_stat_activity WHERE application_name LIKE 'singura%';"
```

## Testing

### Unit Tests

```bash
# Run migration runner tests
pnpm run test:migrations

# Run all database tests
pnpm run test:database
```

### Integration Tests

```typescript
describe('MigrationRunner', () => {
  it('should apply migrations in transaction', async () => {
    const runner = new MigrationRunner(testMigrationsDir);
    await runner.initialize();

    const result = await runner.migrate();

    expect(result.applied).toBe(1);
    await runner.cleanup();
  });
});
```

## Security Considerations

1. **Dedicated Pool**: Prevents migration interference with application queries
2. **Transaction Isolation**: Ensures atomic schema changes
3. **Checksum Verification**: Detects unauthorized migration changes
4. **Fail-Fast**: Aborts server startup on migration errors
5. **Audit Trail**: Complete migration history with timestamps

## Performance

- **Single Connection**: Prevents concurrent migration conflicts
- **Checksum Caching**: Avoids redundant file reads
- **Indexed Queries**: Fast migration status lookups
- **Connection Pooling**: Efficient resource usage

## Future Enhancements

1. Migration rollback support
2. Dry-run mode for testing
3. Migration dependency graph
4. Parallel migration execution (for independent migrations)
5. Migration version branches

## Related Documentation

- [Database Architecture](./DATABASE.md)
- [Testing Strategy](./TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
