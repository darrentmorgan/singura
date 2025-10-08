# Detection Feedback API - Developer Quick Reference

## Overview
The `detection_feedback` table enables users to provide feedback on AI detections for reinforcement learning. This guide shows you how to integrate it into your application.

---

## Table Structure (Quick Reference)

```typescript
interface DetectionFeedback {
  id: string;                    // UUID (auto-generated)
  detection_id: string;          // Reference to detection (VARCHAR)
  feedback_type: 'true_positive' | 'false_positive' | 'false_negative' | 'uncertain';
  user_id: string;               // Clerk user ID (user_2xxx...)
  organization_id: string;       // Clerk org ID (org_2xxx...)
  comment?: string;              // Optional user explanation
  metadata: Record<string, any>; // Extensible JSONB field
  created_at: Date;
  updated_at: Date;
}
```

---

## Quick Start

### 1. Setting Session Context (REQUIRED!)

**Before ANY query**, set the session variables for RLS enforcement:

```typescript
// In your database middleware or connection wrapper
async function setSessionContext(client: PoolClient, userId: string, orgId: string) {
  await client.query(`SET LOCAL app.current_organization_id = $1`, [orgId]);
  await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
}

// Example usage in Express middleware
app.use(async (req, res, next) => {
  if (req.auth?.userId && req.auth?.orgId) {
    const client = await pool.connect();
    await setSessionContext(client, req.auth.userId, req.auth.orgId);
    req.dbClient = client;
  }
  next();
});
```

### 2. Insert Feedback (Create)

```typescript
// TypeScript example
async function createFeedback(
  client: PoolClient,
  detectionId: string,
  feedbackType: 'true_positive' | 'false_positive' | 'false_negative' | 'uncertain',
  userId: string,
  organizationId: string,
  comment?: string,
  metadata?: Record<string, any>
) {
  const query = `
    INSERT INTO detection_feedback
      (detection_id, feedback_type, user_id, organization_id, comment, metadata)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const result = await client.query(query, [
    detectionId,
    feedbackType,
    userId,
    organizationId,
    comment || null,
    metadata || {}
  ]);

  return result.rows[0];
}
```

### 3. Update Feedback (User Changes Mind)

```typescript
async function updateFeedback(
  client: PoolClient,
  detectionId: string,
  userId: string,
  feedbackType: 'true_positive' | 'false_positive' | 'false_negative' | 'uncertain',
  comment?: string
) {
  // RLS automatically enforces user_id match
  const query = `
    UPDATE detection_feedback
    SET
      feedback_type = $1,
      comment = $2,
      updated_at = NOW()
    WHERE detection_id = $3 AND user_id = $4
    RETURNING *;
  `;

  const result = await client.query(query, [feedbackType, comment, detectionId, userId]);
  return result.rows[0] || null;
}
```

### 4. Get Feedback for Detection

```typescript
async function getFeedbackForDetection(client: PoolClient, detectionId: string) {
  const query = `
    SELECT
      id,
      detection_id,
      feedback_type,
      user_id,
      organization_id,
      comment,
      metadata,
      created_at,
      updated_at
    FROM detection_feedback
    WHERE detection_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await client.query(query, [detectionId]);
  return result.rows;
}
```

### 5. Get Feedback Summary

```typescript
interface FeedbackSummary {
  feedback_type: string;
  count: number;
  unique_users: number;
}

async function getFeedbackSummary(
  client: PoolClient,
  detectionId: string
): Promise<FeedbackSummary[]> {
  const query = `
    SELECT
      feedback_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM detection_feedback
    WHERE detection_id = $1
    GROUP BY feedback_type;
  `;

  const result = await client.query(query, [detectionId]);
  return result.rows;
}
```

---

## Common Use Cases

### Dashboard Metrics

```typescript
async function getOrganizationMetrics(
  client: PoolClient,
  days: number = 30
) {
  const query = `
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
    WHERE created_at > NOW() - INTERVAL '${days} days';
  `;

  const result = await client.query(query);
  return result.rows[0];
}
```

### User Contribution Tracking

```typescript
async function getUserContributions(
  client: PoolClient,
  userId: string
) {
  const query = `
    SELECT
      COUNT(*) as total_feedback,
      COUNT(*) FILTER (WHERE comment IS NOT NULL) as feedback_with_comments,
      COUNT(DISTINCT detection_id) as unique_detections_reviewed,
      MIN(created_at) as first_feedback_at,
      MAX(created_at) as latest_feedback_at
    FROM detection_feedback
    WHERE user_id = $1;
  `;

  const result = await client.query(query, [userId]);
  return result.rows[0];
}
```

### Find Conflicting Feedback

```typescript
interface ConflictingFeedback {
  detection_id: string;
  feedback_types: string[];
  total_feedback: number;
  reviewers: string[];
}

async function getConflictingFeedback(
  client: PoolClient
): Promise<ConflictingFeedback[]> {
  const query = `
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
    WHERE feedback_type_count > 1
      AND 'uncertain' != ALL(feedback_types)
    ORDER BY total_feedback DESC;
  `;

  const result = await client.query(query);
  return result.rows;
}
```

---

## Using Metadata for ML Features

### Store Rich Context

```typescript
async function createFeedbackWithContext(
  client: PoolClient,
  detectionId: string,
  feedbackType: string,
  userId: string,
  organizationId: string,
  options: {
    comment?: string;
    detectionConfidence?: number;
    userRole?: string;
    timeToReview?: number; // seconds
    uiContext?: string;
  }
) {
  const metadata = {
    confidence_score: options.detectionConfidence,
    user_role: options.userRole,
    time_to_feedback_seconds: options.timeToReview,
    ui_context: options.uiContext,
    timestamp: new Date().toISOString()
  };

  return await createFeedback(
    client,
    detectionId,
    feedbackType as any,
    userId,
    organizationId,
    options.comment,
    metadata
  );
}
```

### Query by Metadata

```typescript
// Find feedback from security admins
async function getFeedbackByRole(client: PoolClient, role: string) {
  const query = `
    SELECT *
    FROM detection_feedback
    WHERE metadata @> $1::jsonb;
  `;

  const result = await client.query(query, [
    JSON.stringify({ user_role: role })
  ]);

  return result.rows;
}

// Find high-confidence feedback
async function getHighConfidenceFeedback(
  client: PoolClient,
  minConfidence: number = 0.8
) {
  const query = `
    SELECT *
    FROM detection_feedback
    WHERE (metadata->>'confidence_score')::float >= $1;
  `;

  const result = await client.query(query, [minConfidence]);
  return result.rows;
}
```

---

## API Endpoint Examples

### Express.js REST API

```typescript
import { Router } from 'express';
import { requireAuth, requireOrg } from './middleware/auth';
import { pool } from './db';

const router = Router();

// POST /api/detections/:detectionId/feedback
router.post('/api/detections/:detectionId/feedback',
  requireAuth,
  requireOrg,
  async (req, res) => {
    const { detectionId } = req.params;
    const { feedback_type, comment } = req.body;
    const { userId, orgId } = req.auth;

    // Validate feedback_type
    const validTypes = ['true_positive', 'false_positive', 'false_negative', 'uncertain'];
    if (!validTypes.includes(feedback_type)) {
      return res.status(400).json({ error: 'Invalid feedback_type' });
    }

    const client = await pool.connect();
    try {
      // Set session context for RLS
      await client.query(`SET LOCAL app.current_organization_id = $1`, [orgId]);
      await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);

      // Insert or update feedback (upsert)
      const query = `
        INSERT INTO detection_feedback
          (detection_id, feedback_type, user_id, organization_id, comment)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (detection_id, user_id)
        DO UPDATE SET
          feedback_type = EXCLUDED.feedback_type,
          comment = EXCLUDED.comment,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await client.query(query, [
        detectionId,
        feedback_type,
        userId,
        orgId,
        comment || null
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to create feedback' });
    } finally {
      client.release();
    }
  }
);

// GET /api/detections/:detectionId/feedback
router.get('/api/detections/:detectionId/feedback',
  requireAuth,
  requireOrg,
  async (req, res) => {
    const { detectionId } = req.params;
    const { orgId } = req.auth;

    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL app.current_organization_id = $1`, [orgId]);

      const result = await client.query(
        `SELECT * FROM detection_feedback WHERE detection_id = $1 ORDER BY created_at DESC`,
        [detectionId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    } finally {
      client.release();
    }
  }
);

// GET /api/feedback/summary
router.get('/api/feedback/summary',
  requireAuth,
  requireOrg,
  async (req, res) => {
    const { orgId } = req.auth;
    const days = parseInt(req.query.days as string) || 30;

    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL app.current_organization_id = $1`, [orgId]);

      const query = `
        SELECT
          feedback_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT detection_id) as unique_detections
        FROM detection_feedback
        WHERE created_at > NOW() - INTERVAL '${days} days'
        GROUP BY feedback_type;
      `;

      const result = await client.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    } finally {
      client.release();
    }
  }
);

export default router;
```

---

## Testing

### Unit Test Example (Jest + pg-mem)

```typescript
import { newDb } from 'pg-mem';

describe('Detection Feedback', () => {
  let db: any;
  let client: any;

  beforeEach(async () => {
    // Create in-memory PostgreSQL database
    db = newDb();

    // Apply migration
    await db.public.none(`
      CREATE TABLE detection_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        detection_id VARCHAR(255) NOT NULL,
        feedback_type VARCHAR(50) NOT NULL
          CHECK (feedback_type IN ('true_positive', 'false_positive', 'false_negative', 'uncertain')),
        user_id VARCHAR(255) NOT NULL,
        organization_id VARCHAR(255) NOT NULL,
        comment TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (detection_id, user_id)
      );
    `);

    client = db.adapters.createPg().Client;
  });

  test('should insert feedback successfully', async () => {
    const result = await client.query(`
      INSERT INTO detection_feedback
        (detection_id, feedback_type, user_id, organization_id, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, ['det-1', 'true_positive', 'user-1', 'org-1', 'Test comment']);

    expect(result.rows[0].feedback_type).toBe('true_positive');
    expect(result.rows[0].detection_id).toBe('det-1');
  });

  test('should enforce unique constraint', async () => {
    // Insert first feedback
    await client.query(`
      INSERT INTO detection_feedback
        (detection_id, feedback_type, user_id, organization_id)
      VALUES ($1, $2, $3, $4);
    `, ['det-1', 'true_positive', 'user-1', 'org-1']);

    // Try to insert duplicate
    await expect(
      client.query(`
        INSERT INTO detection_feedback
          (detection_id, feedback_type, user_id, organization_id)
        VALUES ($1, $2, $3, $4);
      `, ['det-1', 'false_positive', 'user-1', 'org-1'])
    ).rejects.toThrow(/unique constraint/);
  });
});
```

---

## Best Practices

### 1. Always Set Session Context
```typescript
// ✅ CORRECT
await client.query(`SET LOCAL app.current_organization_id = $1`, [orgId]);
await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
const result = await client.query(`SELECT * FROM detection_feedback WHERE detection_id = $1`, [id]);

// ❌ WRONG - RLS will block queries!
const result = await client.query(`SELECT * FROM detection_feedback WHERE detection_id = $1`, [id]);
```

### 2. Use Upsert for Feedback Updates
```typescript
// ✅ CORRECT - Handles both insert and update
const query = `
  INSERT INTO detection_feedback (detection_id, feedback_type, user_id, organization_id, comment)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (detection_id, user_id)
  DO UPDATE SET
    feedback_type = EXCLUDED.feedback_type,
    comment = EXCLUDED.comment,
    updated_at = NOW()
  RETURNING *;
`;
```

### 3. Validate feedback_type in Application
```typescript
// ✅ CORRECT
const VALID_FEEDBACK_TYPES = ['true_positive', 'false_positive', 'false_negative', 'uncertain'] as const;
type FeedbackType = typeof VALID_FEEDBACK_TYPES[number];

function validateFeedbackType(type: string): type is FeedbackType {
  return VALID_FEEDBACK_TYPES.includes(type as any);
}
```

### 4. Store Structured Metadata
```typescript
// ✅ CORRECT - Structured metadata
const metadata = {
  confidence_score: 0.95,
  user_role: 'security_admin',
  time_to_feedback_seconds: 45
};

// ❌ WRONG - Unstructured metadata
const metadata = {
  misc: 'some random data',
  x: 123
};
```

---

## Troubleshooting

### Issue: "permission denied for table detection_feedback"
**Cause**: Session variables not set before query
**Fix**: Always set `app.current_organization_id` before queries

### Issue: "duplicate key value violates unique constraint"
**Cause**: User already submitted feedback for this detection
**Fix**: Use `ON CONFLICT DO UPDATE` (upsert) instead of INSERT

### Issue: "new row violates check constraint"
**Cause**: Invalid feedback_type value
**Fix**: Use only: `true_positive`, `false_positive`, `false_negative`, `uncertain`

### Issue: RLS policies not working (superuser bypass)
**Cause**: PostgreSQL superuser (e.g., `postgres`) bypasses RLS
**Fix**: Use non-superuser role in production (e.g., `saas_xray_app`)

---

## Performance Tips

1. **Use indexes wisely**: All common query patterns are already indexed
2. **Batch inserts**: Use `COPY` or multi-row INSERT for bulk data
3. **Avoid SELECT ***: Only query columns you need
4. **Use JSONB operators**: `@>` is faster than `->>` for metadata queries
5. **Monitor query performance**: Use `EXPLAIN ANALYZE` to check index usage

---

## Security Checklist

- [ ] Always set session variables for RLS enforcement
- [ ] Validate user_id matches authenticated user
- [ ] Validate organization_id matches user's org
- [ ] Sanitize user input (especially comments)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Log all feedback creation/updates for audit trail
- [ ] Implement rate limiting on feedback endpoints

---

## Migration Commands

```bash
# Apply migration
npm run migrate:dev

# Or manually:
psql $DATABASE_URL -f backend/migrations/006_add_detection_feedback.sql

# Rollback migration
psql $DATABASE_URL -f backend/migrations/006_add_detection_feedback.down.sql

# Verify migration
psql $DATABASE_URL -c "\d detection_feedback"
```

---

## Support

**Migration Files**:
- `006_add_detection_feedback.sql` - Forward migration
- `006_add_detection_feedback.down.sql` - Rollback migration
- `006_MIGRATION_NOTES.md` - Detailed design documentation

**Questions?** See migration notes for detailed design decisions and ML integration patterns.
