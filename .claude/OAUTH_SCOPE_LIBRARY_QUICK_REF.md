# OAuth Scope Library - Quick Reference

**Database Table**: `oauth_scope_library`  
**Migration**: `005_create_oauth_scope_library.sql`  
**Status**: ✅ Applied (2025-10-07)

---

## Table Schema

```sql
CREATE TABLE oauth_scope_library (
  id UUID PRIMARY KEY,
  scope_url VARCHAR(500) UNIQUE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  access_level VARCHAR(50) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  risk_score INTEGER CHECK (0-100),
  risk_level VARCHAR(20) CHECK ('LOW','MEDIUM','HIGH','CRITICAL'),
  data_types JSONB,
  common_use_cases TEXT,
  abuse_scenarios TEXT,
  alternatives TEXT,
  gdpr_impact TEXT,
  hipaa_impact TEXT,
  regulatory_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Indexes

- **Primary Key**: `id` (UUID)
- **Unique**: `scope_url` (fast lookup)
- **Indexed**: `platform`, `risk_level`, `scope_url`
- **Performance**: 0.017ms avg query time

---

## Seeded Scopes (15 Google OAuth)

### Critical Risk (90-95)
- `https://mail.google.com/` - Gmail Full Access (95)
- `admin.directory.user` - User Management (90)

### High Risk (65-85)
- `drive` - Full Drive Access (85)
- `drive.readonly` - Drive Read-Only (75)
- `gmail.readonly` - Gmail Read-Only (70)
- `calendar` - Full Calendar (65)

### Medium Risk (25-55)
- `admin.reports.audit.readonly` - Audit Logs (55)
- `script.projects.readonly` - Apps Script (50)
- `admin.directory.user.readonly` - User Directory (40)
- `calendar.readonly` - Calendar Read (35)
- `drive.file` - App Files Only (25)

### Low Risk (5-20)
- `drive.metadata.readonly` - Metadata (20)
- `userinfo.email` - Email Address (10)
- `userinfo.profile` - Profile (10)
- `openid` - OpenID Connect (5)

---

## Common Queries

### Find scope by URL
```sql
SELECT * FROM oauth_scope_library 
WHERE scope_url = 'https://www.googleapis.com/auth/drive';
```

### Filter by risk level
```sql
SELECT * FROM oauth_scope_library 
WHERE risk_level = 'CRITICAL' 
ORDER BY risk_score DESC;
```

### JSONB array search
```sql
SELECT * FROM oauth_scope_library 
WHERE data_types @> '["Emails"]'::jsonb;
```

### Batch lookup (for enrichment)
```sql
SELECT * FROM oauth_scope_library 
WHERE scope_url = ANY($1::text[]);
```

---

## Repository Pattern

```typescript
// backend/src/database/repositories/oauth-scope-library.ts

export class OAuthScopeLibraryRepository {
  async findByScopeUrl(url: string): Promise<OAuthScope | null> {
    const result = await db.query(
      'SELECT * FROM oauth_scope_library WHERE scope_url = $1',
      [url]
    );
    return result.rows[0] || null; // T | null pattern
  }
  
  async enrichScopes(scopes: string[]): Promise<EnrichedOAuthScope[]> {
    const result = await db.query(
      'SELECT * FROM oauth_scope_library WHERE scope_url = ANY($1::text[])',
      [scopes]
    );
    
    return scopes.map(scope => {
      const lib = result.rows.find(r => r.scope_url === scope);
      return lib ? this.mapToEnriched(lib) : this.createFallback(scope);
    });
  }
}

// Singleton export
export const oauthScopeLibraryRepository = new OAuthScopeLibraryRepository();
```

---

## JSONB Handling (CRITICAL)

```typescript
// ✅ CORRECT: Pass objects directly
await db.query(
  'INSERT INTO oauth_scope_library (data_types) VALUES ($1)',
  [['Documents', 'Spreadsheets']]  // Array passed directly
);

// ❌ WRONG: Stringifying breaks JSONB
await db.query(
  'INSERT INTO oauth_scope_library (data_types) VALUES ($1)',
  [JSON.stringify(['Documents'])]  // NO! Causes "invalid input syntax" error
);
```

**Why**: PostgreSQL `pg` library auto-converts objects to JSONB.

---

## Testing

### Verify migration
```bash
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d saas_xray \
  -c "SELECT COUNT(*) FROM oauth_scope_library;"
# Expected: 15
```

### Check performance
```sql
EXPLAIN ANALYZE SELECT * FROM oauth_scope_library 
WHERE scope_url = 'https://www.googleapis.com/auth/drive';
-- Expected: Index Scan, <1ms execution
```

### Risk distribution
```sql
SELECT risk_level, COUNT(*) 
FROM oauth_scope_library 
GROUP BY risk_level;
-- Expected: CRITICAL: 2, HIGH: 4, MEDIUM: 5, LOW: 4
```

---

## Next Steps

1. **Repository**: `oauth-scope-library.ts` - Implement findByScopeUrl, enrichScopes
2. **Service**: `oauth-scope-enrichment.service.ts` - Scope enrichment logic
3. **Types**: `shared-types/src/models/oauth-app-details.ts` - EnrichedOAuthScope
4. **API**: `routes/automations.ts` - GET /automations/:id/details endpoint
5. **Frontend**: `AutomationDetailsModal.tsx` - View details UI

---

## Key Files

- **Migration**: `backend/migrations/005_create_oauth_scope_library.sql`
- **Documentation**: `PHASE_1_OAUTH_SCOPE_LIBRARY_COMPLETE.md`
- **Implementation Guide**: `.claude/reports/OAUTH_VIEW_DETAILS_IMPLEMENTATION.md`

---

**Status**: Phase 1 Foundation Complete ✅  
**Next**: Repository + Service implementation
