/**
 * Behavioral Baseline Repository
 * Manages storage and retrieval of organization-specific behavioral baselines
 * Implements repository pattern with standardized null handling
 */

import { BaseRepository } from './base';
import { db } from '../pool';

/**
 * Behavioral statistics for anomaly detection
 */
export interface BehavioralStats {
  meanEventsPerDay: number;
  stdDevEventsPerDay: number;
  typicalWorkHours: {
    start: number;
    end: number;
  };
  commonActions: Array<{
    action: string;
    frequency: number;
  }>;
}

/**
 * Behavioral baseline entity
 */
export interface BehavioralBaseline {
  id: string;
  userId: string;
  organizationId: string;
  stats: BehavioralStats;
  trainingDataSize: number;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Database row representation
 */
interface BehavioralBaselineRow {
  id: string;
  user_id: string;
  organization_id: string;
  stats: any; // JSONB
  training_data_size: number;
  updated_at: Date;
  created_at: Date;
}

/**
 * Create baseline input
 */
export interface CreateBaselineInput {
  userId: string;
  organizationId: string;
  stats: BehavioralStats;
  trainingDataSize: number;
}

/**
 * Update baseline input
 */
export interface UpdateBaselineInput {
  stats?: BehavioralStats;
  trainingDataSize?: number;
  updatedAt?: Date;
}

/**
 * Behavioral Baseline Repository
 * Handles CRUD operations for behavioral_baselines table
 */
export class BehavioralBaselineRepository extends BaseRepository<
  BehavioralBaseline,
  CreateBaselineInput & Record<string, unknown>,
  UpdateBaselineInput & Record<string, unknown>,
  Record<string, unknown>
> {
  protected db = db;

  constructor() {
    super('behavioral_baselines');
  }

  /**
   * Find baseline by user ID
   * @param userId - User identifier
   * @returns Baseline or null if not found
   */
  async findByUserId(userId: string): Promise<BehavioralBaseline | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      LIMIT 1
    `;

    const result = await this.db.query<BehavioralBaselineRow>(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]!);
  }

  /**
   * Find baselines by organization ID
   * @param organizationId - Organization identifier
   * @returns Array of baselines
   */
  async findByOrganizationId(organizationId: string): Promise<BehavioralBaseline[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1
      ORDER BY updated_at DESC
    `;

    const result = await this.db.query<BehavioralBaselineRow>(query, [organizationId]);

    return result.rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Get all baselines
   * @returns Array of all baselines
   */
  async getAllBaselines(): Promise<BehavioralBaseline[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY updated_at DESC
    `;

    const result = await this.db.query<BehavioralBaselineRow>(query);

    return result.rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Create new behavioral baseline
   * @param input - Baseline data
   * @returns Created baseline
   */
  async create(input: CreateBaselineInput): Promise<BehavioralBaseline> {
    const query = `
      INSERT INTO ${this.tableName} (
        user_id,
        organization_id,
        stats,
        training_data_size
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.organizationId,
      JSON.stringify(input.stats),
      input.trainingDataSize
    ];

    const result = await this.db.query<BehavioralBaselineRow>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to create behavioral baseline');
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Update existing baseline by user ID
   * @param userId - User identifier
   * @param updates - Fields to update
   * @returns Updated baseline
   */
  async updateByUserId(userId: string, updates: UpdateBaselineInput): Promise<BehavioralBaseline | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.stats !== undefined) {
      setClauses.push(`stats = $${paramIndex++}`);
      values.push(JSON.stringify(updates.stats));
    }

    if (updates.trainingDataSize !== undefined) {
      setClauses.push(`training_data_size = $${paramIndex++}`);
      values.push(updates.trainingDataSize);
    }

    // Always update timestamp
    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(updates.updatedAt || new Date());

    if (setClauses.length === 1) {
      // Only updated_at, nothing to update
      const existing = await this.findByUserId(userId);
      return existing;
    }

    values.push(userId);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query<BehavioralBaselineRow>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]!);
  }

  /**
   * Update baseline by ID (implements base repository interface)
   * @param id - Baseline ID
   * @param updates - Fields to update
   * @returns Updated baseline
   */
  async update(id: string, updates: UpdateBaselineInput & Record<string, unknown>): Promise<BehavioralBaseline> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.stats !== undefined) {
      setClauses.push(`stats = $${paramIndex++}`);
      values.push(JSON.stringify(updates.stats));
    }

    if (updates.trainingDataSize !== undefined) {
      setClauses.push(`training_data_size = $${paramIndex++}`);
      values.push(updates.trainingDataSize);
    }

    // Always update timestamp
    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query<BehavioralBaselineRow>(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Behavioral baseline with ID ${id} not found`);
    }

    return this.mapRowToEntity(result.rows[0]!);
  }

  /**
   * Get organizational aggregate statistics
   * Used for calculating organizational baselines
   * @param organizationId - Organization identifier
   * @returns Aggregate statistics
   */
  async getOrganizationalAggregates(organizationId: string): Promise<{
    meanEventsPerDay: number;
    stdDevEventsPerDay: number;
    meanOffHoursActivity: number;
    stdDevOffHoursActivity: number;
    sampleSize: number;
  } | null> {
    const query = `
      SELECT
        AVG((stats->>'meanEventsPerDay')::numeric) as mean_events,
        STDDEV((stats->>'meanEventsPerDay')::numeric) as stddev_events,
        AVG(
          CASE
            WHEN (stats->'typicalWorkHours'->>'start')::int > 9
              OR (stats->'typicalWorkHours'->>'end')::int < 17
            THEN 0.8
            ELSE 0.2
          END
        ) as mean_off_hours,
        STDDEV(
          CASE
            WHEN (stats->'typicalWorkHours'->>'start')::int > 9
              OR (stats->'typicalWorkHours'->>'end')::int < 17
            THEN 0.8
            ELSE 0.2
          END
        ) as stddev_off_hours,
        COUNT(*) as sample_size
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND updated_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.db.query<{
      mean_events: string | null;
      stddev_events: string | null;
      mean_off_hours: string | null;
      stddev_off_hours: string | null;
      sample_size: string;
    }>(query, [organizationId]);

    const row = result.rows[0];
    if (!row || !row.mean_events) {
      return null;
    }

    return {
      meanEventsPerDay: parseFloat(row.mean_events),
      stdDevEventsPerDay: parseFloat(row.stddev_events || '0'),
      meanOffHoursActivity: parseFloat(row.mean_off_hours || '0'),
      stdDevOffHoursActivity: parseFloat(row.stddev_off_hours || '0'),
      sampleSize: parseInt(row.sample_size, 10)
    };
  }

  /**
   * Delete old baselines (cleanup)
   * @param daysOld - Age threshold in days
   * @returns Number of deleted records
   */
  async deleteOldBaselines(daysOld: number = 90): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE updated_at < NOW() - ($1 || ' days')::INTERVAL
      RETURNING id
    `;

    const result = await this.db.query(query, [daysOld]);
    return result.rows.length;
  }

  /**
   * Map database row to entity
   */
  private mapRowToEntity(row: BehavioralBaselineRow): BehavioralBaseline {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats,
      trainingDataSize: row.training_data_size,
      updatedAt: row.updated_at,
      createdAt: row.created_at
    };
  }
}

// Export singleton instance
export const behavioralBaselineRepository = new BehavioralBaselineRepository();
