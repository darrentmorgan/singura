# Migration 006: Detection Feedback System - Design Documentation

## Overview
This migration introduces a reinforcement learning feedback system that enables users to provide feedback on AI detections, improving detection accuracy over time through user corrections.

**Created**: 2025-10-08
**Migration Files**:
- `006_add_detection_feedback.sql` - Forward migration
- `006_add_detection_feedback.down.sql` - Rollback migration

---

## Schema Design

### Table: `detection_feedback`

#### Core Columns
```sql
id                  UUID PRIMARY KEY        -- Auto-generated unique identifier
detection_id        VARCHAR(255) NOT NULL   -- Reference to detection (flexible format)
feedback_type       VARCHAR(50) NOT NULL    -- Classification (enum-like check constraint)
user_id             VARCHAR(255) NOT NULL   -- Clerk user ID (user_2xxx...)
organization_id     VARCHAR(255) NOT NULL   -- Clerk org ID (org_2xxx...)
comment             TEXT                    -- Optional user explanation
metadata            JSONB DEFAULT '{}'      -- Extensible ML features
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

#### Design Decisions

**1. detection_id as VARCHAR(255) instead of UUID + FK**
- **Rationale**: Supports multiple detection sources without coupling to specific table
- Allows references to:
  - `discovered_automations.id` (UUID as string)
  - External detection system IDs
  - Cross-platform correlation IDs
  - Future detection sources
- **Tradeoff**: No referential integrity enforcement at database level
- **Mitigation**: Application-level validation required

**2. feedback_type with CHECK constraint**
- **Options**:
  - `true_positive`: User confirms this IS shadow AI
  - `false_positive`: User confirms this is NOT shadow AI (legitimate tool)
  - `false_negative`: User reports a MISSED detection
  - `uncertain`: User is unsure or needs investigation
- **Rationale**: Enum-like behavior without creating separate enum type (easier to modify)
- **ML Usage**: Ground truth labels for training/validation datasets

**3. Clerk-based Multi-tenancy (VARCHAR IDs)**
- Uses Clerk's string-based IDs instead of UUIDs
- **Format**:
  - User IDs: `user_2NUllHtAOEbKqAQJMZoZ2JkJQ5h`
  - Org IDs: `org_2NUll8KqFKEpZtwGP6oN7EuSMuG`
- **Rationale**: Matches existing SaaS X-Ray authentication architecture
- **Security**: RLS policies enforce org boundaries (see below)

**4. metadata JSONB Column**
- **Purpose**: Extensible feature storage for ML model training
- **Example Features**:
  ```json
  {
    "confidence_score": 0.85,
    "user_role": "security_admin",
    "time_to_feedback_seconds": 45,
    "ui_context": "detection_detail_page",
    "device_info": "Chrome/Linux",
    "previous_feedback_type": "uncertain"
  }
  ```
- **Rationale**: Avoid schema changes as ML model evolves
- **Performance**: GIN index enables efficient JSONB queries

**5. UNIQUE Constraint (detection_id, user_id)**
- **Purpose**: One feedback per user per detection
- **Behavior**: Users can UPDATE existing feedback, but cannot create duplicates
- **Use Case**: User changes their mind after investigation
- **Database Enforcement**: Prevents double-counting in statistics

---

## Indexes - Performance Strategy

### Index Design Philosophy
1. **Query-driven**: Each index targets specific application query patterns
2. **Multi-tenant aware**: Organization-scoped indexes for efficient data isolation
3. **Time-series optimized**: DESC ordering on timestamps for recent-first queries
4. **JSONB support**: GIN index for metadata filtering

### Index Breakdown

#### 1. `idx_detection_feedback_detection_id` (B-tree)
```sql
CREATE INDEX ON detection_feedback(detection_id);
```
- **Query Pattern**: Display all feedback for a detection detail page
- **Use Case**: "Show me all feedback for detection ABC123"
- **Expected Cardinality**: Low (1-100 feedback per detection)
- **Performance**: O(log n) lookup, small result set

#### 2. `idx_detection_feedback_org_created` (B-tree composite, DESC)
```sql
CREATE INDEX ON detection_feedback(organization_id, created_at DESC);
```
- **Query Pattern**: Time-series queries per organization
- **Use Case**:
  - "Show me all feedback from last 30 days"
  - Recent feedback dashboard widget
  - Trend analysis over time
- **Optimization**: DESC ordering matches `ORDER BY created_at DESC` queries
- **Expected Cardinality**: Medium (100s-1000s per org per month)

#### 3. `idx_detection_feedback_org_type` (B-tree composite)
```sql
CREATE INDEX ON detection_feedback(organization_id, feedback_type);
```
- **Query Pattern**: Aggregate statistics by feedback type
- **Use Case**:
  - Dashboard metrics: "50% false positives this month"
  - ML training data selection: "Get all true_positive feedback"
  - Quality scoring: "Detection accuracy = TP / (TP + FP)"
- **Expected Cardinality**: Medium (groups feedback into 4 categories per org)

#### 4. `idx_detection_feedback_user_id` (B-tree composite, DESC)
```sql
CREATE INDEX ON detection_feedback(user_id, created_at DESC);
```
- **Query Pattern**: User activity tracking
- **Use Case**:
  - User profile: "Show all feedback by this user"
  - Contribution analytics: "Top 10 most active reviewers"
  - Audit trail: "What did this user mark as false positive?"
- **Expected Cardinality**: Low (10s-100s per user)

#### 5. `idx_detection_feedback_metadata` (GIN)
```sql
CREATE INDEX ON detection_feedback USING gin(metadata);
```
- **Query Pattern**: JSONB containment and key queries
- **Use Case**:
  - Filter by user role: `metadata @> '{"user_role": "security_admin"}'`
  - Find high-confidence feedback: `metadata->>'confidence_score' > 0.8`
  - ML feature extraction: Query by multiple metadata fields
- **Tradeoff**: Larger index size, but enables flexible queries
- **Performance**: Efficient for `@>`, `?`, and `?&` operators

---

## Row Level Security (RLS)

### Architecture
SaaS X-Ray uses session variables for multi-tenant isolation:
```sql
SET LOCAL app.current_organization_id = 'org_2xxx...';
SET LOCAL app.current_user_id = 'user_2xxx...';
```

Backend middleware MUST set these variables on EVERY request before database queries.

### Policy Breakdown

#### 1. SELECT Policy (Organization Isolation)
```sql
CREATE POLICY detection_feedback_org_isolation ON detection_feedback
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true));
```
- **Purpose**: Users can only see feedback from their organization
- **Security**: Prevents cross-org data leakage
- **Performance**: Index on `organization_id` ensures fast filtering

#### 2. INSERT Policy
```sql
CREATE POLICY detection_feedback_org_insert ON detection_feedback
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));
```
- **Purpose**: Users can only create feedback for their organization
- **Security**: Prevents inserting feedback into other orgs
- **Validation**: Application should also validate user_id matches session

#### 3. UPDATE Policy (User + Organization)
```sql
CREATE POLICY detection_feedback_org_update ON detection_feedback
  FOR UPDATE
  USING (
    organization_id = current_setting('app.current_organization_id', true)
    AND user_id = current_setting('app.current_user_id', true)
  );
```
- **Purpose**: Users can ONLY update their OWN feedback within their org
- **Security**: Prevents users from modifying other users' feedback
- **Use Case**: User changes feedback from "uncertain" to "false_positive"

#### 4. DELETE Policy (User + Organization)
```sql
CREATE POLICY detection_feedback_org_delete ON detection_feedback
  FOR DELETE
  USING (
    organization_id = current_setting('app.current_organization_id', true)
    AND user_id = current_setting('app.current_user_id', true)
  );
```
- **Purpose**: Users can only delete their OWN feedback
- **Security**: Prevents feedback deletion by other users
- **Note**: Consider disabling DELETE in application layer (keep audit trail)

### RLS Testing Checklist
- [ ] Org A cannot see Org B's feedback
- [ ] User 1 cannot update User 2's feedback (even in same org)
- [ ] Session variables are set on every request
- [ ] Queries fail gracefully if session variables missing

---

## Triggers

### Auto-update Timestamp Trigger
```sql
CREATE TRIGGER detection_feedback_updated_at
  BEFORE UPDATE ON detection_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_detection_feedback_updated_at();
```

**Purpose**: Automatically update `updated_at` timestamp on row modification

**Behavior**:
- Fires BEFORE UPDATE on each row
- Sets `NEW.updated_at = NOW()`
- No application logic required

**Use Cases**:
- Audit trail: "When did user change their feedback?"
- Conflict detection: "Has this feedback been modified since I loaded it?"
- Analytics: "How long between creation and first update?"

---

## Machine Learning Integration

### Training Data Pipeline

#### 1. Positive/Negative Label Extraction
```sql
SELECT
  detection_id,
  CASE
    WHEN feedback_type = 'true_positive' THEN 1
    WHEN feedback_type = 'false_positive' THEN 0
    ELSE NULL  -- Exclude uncertain/false_negative from training
  END as label,
  metadata
FROM detection_feedback
WHERE feedback_type IN ('true_positive', 'false_positive')
  AND created_at > NOW() - INTERVAL '90 days';  -- Fresh data only
```

#### 2. Consensus Labeling (Multiple Users)
```sql
SELECT
  detection_id,
  -- Majority vote (true_positive = 1, false_positive = 0)
  CASE
    WHEN SUM(CASE WHEN feedback_type = 'true_positive' THEN 1 ELSE 0 END)
         > COUNT(*) / 2.0 THEN 1
    ELSE 0
  END as consensus_label,
  -- Confidence based on agreement rate
  MAX(
    GREATEST(
      SUM(CASE WHEN feedback_type = 'true_positive' THEN 1 ELSE 0 END),
      SUM(CASE WHEN feedback_type = 'false_positive' THEN 1 ELSE 0 END)
    )
  ) * 1.0 / COUNT(*) as consensus_confidence
FROM detection_feedback
WHERE feedback_type IN ('true_positive', 'false_positive')
GROUP BY detection_id
HAVING COUNT(*) >= 3;  -- Require at least 3 votes for consensus
```

#### 3. Feature Engineering from Metadata
```sql
SELECT
  detection_id,
  feedback_type as label,
  (metadata->>'confidence_score')::float as detection_confidence,
  metadata->>'user_role' as reviewer_role,
  (metadata->>'time_to_feedback_seconds')::int as review_latency,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as time_to_revision
FROM detection_feedback
WHERE metadata ? 'confidence_score';  -- Has required feature
```

### Model Performance Monitoring
```sql
-- Calculate detection precision over time
WITH monthly_feedback AS (
  SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) FILTER (WHERE feedback_type = 'true_positive') as tp,
    COUNT(*) FILTER (WHERE feedback_type = 'false_positive') as fp
  FROM detection_feedback
  GROUP BY month
)
SELECT
  month,
  tp,
  fp,
  tp * 1.0 / NULLIF(tp + fp, 0) as precision,
  (tp + fp) as total_reviewed
FROM monthly_feedback
ORDER BY month DESC;
```

---

## Query Patterns & Examples

### 1. Get Feedback Summary for Detection
```sql
SELECT
  feedback_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(LENGTH(comment)) FILTER (WHERE comment IS NOT NULL) as avg_comment_length
FROM detection_feedback
WHERE detection_id = $1
GROUP BY feedback_type;
```

### 2. Organization Dashboard Metrics
```sql
-- Set session context
SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';

SELECT
  COUNT(DISTINCT detection_id) as total_detections_reviewed,
  COUNT(*) as total_feedback_submitted,
  COUNT(DISTINCT user_id) as active_reviewers,
  COUNT(*) FILTER (WHERE feedback_type = 'true_positive') as confirmed_threats,
  COUNT(*) FILTER (WHERE feedback_type = 'false_positive') as false_alarms,
  COUNT(*) FILTER (WHERE feedback_type = 'uncertain') as needs_review,
  ROUND(
    COUNT(*) FILTER (WHERE feedback_type = 'true_positive') * 100.0 /
    NULLIF(
      COUNT(*) FILTER (WHERE feedback_type IN ('true_positive', 'false_positive')),
      0
    ),
    2
  ) as precision_percentage
FROM detection_feedback
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 3. User Contribution Leaderboard
```sql
SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';

SELECT
  user_id,
  COUNT(*) as total_feedback,
  COUNT(*) FILTER (WHERE comment IS NOT NULL) as feedback_with_comments,
  COUNT(DISTINCT detection_id) as unique_detections_reviewed,
  MIN(created_at) as first_feedback_at,
  MAX(created_at) as latest_feedback_at
FROM detection_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_feedback DESC
LIMIT 10;
```

### 4. Find Conflicting Feedback (Needs Review)
```sql
WITH feedback_summary AS (
  SELECT
    detection_id,
    COUNT(DISTINCT feedback_type) as feedback_type_count,
    array_agg(DISTINCT feedback_type) as feedback_types,
    COUNT(*) as total_feedback,
    array_agg(user_id) as reviewers
  FROM detection_feedback
  GROUP BY detection_id
)
SELECT *
FROM feedback_summary
WHERE feedback_type_count > 1  -- Conflicting opinions
  AND 'uncertain' != ALL(feedback_types)  -- Exclude all-uncertain cases
ORDER BY total_feedback DESC;
```

### 5. Trend Analysis (Feedback Over Time)
```sql
SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';

SELECT
  DATE_TRUNC('week', created_at) as week,
  feedback_type,
  COUNT(*) as count
FROM detection_feedback
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY week, feedback_type
ORDER BY week DESC, feedback_type;
```

---

## Migration Execution

### Forward Migration
```bash
# Apply migration
psql $DATABASE_URL -f backend/migrations/006_add_detection_feedback.sql

# Expected output:
# NOTICE: SUCCESS: detection_feedback table created
# NOTICE: Indexes created: 5
# NOTICE: SUCCESS: All indexes created
# NOTICE: SUCCESS: RLS enabled on detection_feedback
# NOTICE: RLS policies created: 4
# NOTICE: SUCCESS: All RLS policies created
```

### Rollback Migration
```bash
# Rollback migration (WARNING: Deletes all feedback data!)
psql $DATABASE_URL -f backend/migrations/006_add_detection_feedback.down.sql

# Expected output:
# NOTICE: SUCCESS: detection_feedback table dropped
# NOTICE: SUCCESS: update_detection_feedback_updated_at function dropped
```

### Testing Migration
```bash
# Run automated migration runner
npm run migrate:dev

# Or manually test
psql $DATABASE_URL << EOF
\d detection_feedback
\di detection_feedback*
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'detection_feedback';
EOF
```

---

## Performance Considerations

### Expected Data Volume
- **Initial**: 10-100 feedback/day per organization
- **6 months**: ~2,000-20,000 rows per organization
- **12 months**: ~4,000-40,000 rows per organization
- **Multi-tenant scale**: 1M+ rows across all organizations

### Index Maintenance
- PostgreSQL auto-vacuums handle B-tree indexes efficiently
- GIN index on metadata may require periodic `REINDEX` (monitor bloat)
- Recommend monitoring with `pg_stat_user_indexes`

### Query Performance Targets
- Detection feedback lookup: < 10ms
- Organization dashboard metrics: < 100ms
- ML training data extraction: < 1s (even for 100K+ rows)

### Optimization Opportunities
1. **Partitioning**: Consider partitioning by `created_at` if > 10M rows
2. **Materialized Views**: For complex aggregate queries (e.g., monthly stats)
3. **Read Replicas**: For ML training queries (don't impact production)

---

## Security & Compliance

### Data Sensitivity
- **PII**: Contains user_id (Clerk ID), comments may contain names/identifiers
- **Audit Trail**: Timestamps track when users provided feedback
- **GDPR**: User feedback = personal data (requires data processing agreement)

### Data Retention Policy
- **Recommendation**: Retain feedback indefinitely for ML training
- **Alternative**: 2-year retention with archival to cold storage
- **User Rights**: Support data deletion requests (GDPR Article 17)

### Access Control
- **Database Level**: RLS policies enforce org boundaries
- **Application Level**: Validate user permissions before queries
- **API Endpoints**: Require authentication + org membership

---

## Integration with Existing Schema

### Related Tables
1. **`discovered_automations`** (from migration 002)
   - Stores detected shadow AI/automations
   - `detection_id` references `discovered_automations.id` (as string)
   - No FK constraint = loose coupling

2. **`organizations`** (from migration 001)
   - Organization master table
   - `organization_id` should match, but uses Clerk IDs (VARCHAR) instead of UUIDs

3. **`users`** (from migration 001)
   - User master table
   - `user_id` should match, but uses Clerk IDs (VARCHAR) instead of UUIDs

### Schema Evolution Path
- **Future**: Add `feedback_source` column (manual, api, bulk_import)
- **Future**: Add `detection_version` to track detection algorithm version
- **Future**: Add `review_status` (pending, approved, disputed)

---

## Testing Checklist

### Functional Tests
- [ ] Insert feedback for detection
- [ ] Update existing feedback (user changes opinion)
- [ ] Query feedback by detection_id
- [ ] Query feedback by organization_id
- [ ] Query feedback by user_id
- [ ] Query feedback by metadata fields
- [ ] Aggregate statistics (group by feedback_type)

### Security Tests
- [ ] RLS: Org A cannot see Org B's feedback
- [ ] RLS: User 1 cannot update User 2's feedback
- [ ] RLS: Insert with wrong org_id fails
- [ ] UNIQUE constraint: Duplicate (detection_id, user_id) fails
- [ ] CHECK constraint: Invalid feedback_type fails

### Performance Tests
- [ ] Index usage: EXPLAIN ANALYZE on all query patterns
- [ ] Bulk insert: Insert 10,000 rows in < 1 second
- [ ] Concurrent updates: 100 simultaneous updates (no deadlocks)
- [ ] JSONB queries: Metadata filtering uses GIN index

### Migration Tests
- [ ] Forward migration completes without errors
- [ ] Rollback migration completes without errors
- [ ] Re-apply forward migration (idempotent)
- [ ] Verify table, indexes, triggers, policies created

---

## Future Enhancements

### Phase 2: Advanced Features
1. **Collaborative Filtering**: Recommend detections for review based on user expertise
2. **Confidence Scoring**: Weight feedback by user expertise/accuracy history
3. **Automated Feedback**: AI-generated feedback from detection patterns
4. **Feedback Versioning**: Track feedback changes over time (audit log)

### Phase 3: ML Integration
1. **Real-time Model Updates**: Retrain on new feedback (incremental learning)
2. **Active Learning**: Prioritize detections with uncertain predictions for review
3. **Feedback Loop Metrics**: Track how feedback improves detection accuracy
4. **Explainable AI**: Show users why detection was flagged (build trust)

---

## Support & Troubleshooting

### Common Issues

**Issue**: RLS policies blocking all queries
**Cause**: Session variables not set
**Fix**: Ensure middleware sets `app.current_organization_id` and `app.current_user_id`

**Issue**: Duplicate key violation on (detection_id, user_id)
**Cause**: User trying to insert duplicate feedback
**Fix**: Use `UPDATE` instead of `INSERT`, or `INSERT ... ON CONFLICT DO UPDATE`

**Issue**: Slow queries on metadata
**Cause**: GIN index not being used
**Fix**: Use `@>` operator for containment queries, not `->>`

**Issue**: Migration fails with "relation already exists"
**Cause**: Migration already applied
**Fix**: Check `migrations` table, or use `CREATE TABLE IF NOT EXISTS`

---

## Contact & Maintenance

**Migration Author**: PostgreSQL Pro (AI Agent)
**Review Date**: 2025-10-08
**Next Review**: 2025-11-08 (1 month)

**Maintenance Tasks**:
- [ ] Monitor index bloat (monthly)
- [ ] Review RLS policy performance (quarterly)
- [ ] Analyze query patterns and add indexes as needed
- [ ] Review data retention policy (annually)
