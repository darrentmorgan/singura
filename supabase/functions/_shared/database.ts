// ============================================================================
// Shared Database Utilities for Supabase Edge Functions
// Provides consistent database access patterns across all functions
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  Organization,
  PlatformConnection,
  DiscoveredAutomation,
  RiskAssessment,
  DiscoveryRun,
  DatabaseFilters,
  PaginatedResponse,
  SupabaseResponse
} from './types.ts';

// Initialize Supabase client for Edge Functions
export function createSupabaseClient(serviceKey: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export class OrganizationRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async findById(id: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  async findByDomain(domain: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('domain', domain)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  async create(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .insert(org)
      .select()
      .single();

    if (error || !data) return null;
    return data as Organization;
  }
}

// ============================================================================
// PLATFORM CONNECTIONS
// ============================================================================

export class PlatformConnectionRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async findById(id: string): Promise<PlatformConnection | null> {
    const { data, error } = await this.supabase
      .from('platform_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as PlatformConnection;
  }

  async findByOrganization(
    organizationId: string,
    filters: DatabaseFilters = {}
  ): Promise<PlatformConnection[]> {
    let query = this.supabase
      .from('platform_connections')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.platform_type) {
      query = query.eq('platform_type', filters.platform_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data as PlatformConnection[];
  }

  async create(
    conn: Omit<PlatformConnection, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PlatformConnection | null> {
    const { data, error } = await this.supabase
      .from('platform_connections')
      .insert(conn)
      .select()
      .single();

    if (error || !data) return null;
    return data as PlatformConnection;
  }

  async updateStatus(
    id: string,
    status: string,
    lastError?: string
  ): Promise<PlatformConnection | null> {
    const updateData: any = { status };
    if (lastError !== undefined) {
      updateData.last_error = lastError;
    }

    const { data, error } = await this.supabase
      .from('platform_connections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return data as PlatformConnection;
  }
}

// ============================================================================
// DISCOVERED AUTOMATIONS
// ============================================================================

export class AutomationRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async findById(id: string): Promise<DiscoveredAutomation | null> {
    const { data, error } = await this.supabase
      .from('discovered_automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as DiscoveredAutomation;
  }

  async findByOrganization(
    organizationId: string,
    filters: DatabaseFilters = {}
  ): Promise<PaginatedResponse<DiscoveredAutomation>> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = this.supabase
      .from('discovered_automations')
      .select('*, risk_assessments(*)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (filters.platform_type) {
      query = query.eq('platform_type', filters.platform_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return {
        data: [],
        total: 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        has_more: false,
      };
    }

    return {
      data: data as DiscoveredAutomation[],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async create(
    automation: Omit<DiscoveredAutomation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DiscoveredAutomation | null> {
    const { data, error } = await this.supabase
      .from('discovered_automations')
      .insert(automation)
      .select()
      .single();

    if (error || !data) return null;
    return data as DiscoveredAutomation;
  }

  async updateLastSeen(id: string): Promise<DiscoveredAutomation | null> {
    const { data, error } = await this.supabase
      .from('discovered_automations')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return data as DiscoveredAutomation;
  }
}

// ============================================================================
// DISCOVERY RUNS
// ============================================================================

export class DiscoveryRunRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async findById(id: string): Promise<DiscoveryRun | null> {
    const { data, error } = await this.supabase
      .from('discovery_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as DiscoveryRun;
  }

  async create(
    run: Omit<DiscoveryRun, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DiscoveryRun | null> {
    const { data, error } = await this.supabase
      .from('discovery_runs')
      .insert(run)
      .select()
      .single();

    if (error || !data) return null;
    return data as DiscoveryRun;
  }

  async updateStatus(
    id: string,
    status: string,
    completedAt?: Date,
    errorDetails?: string
  ): Promise<DiscoveryRun | null> {
    const updateData: any = { status };

    if (completedAt) {
      updateData.completed_at = completedAt.toISOString();
    }

    if (errorDetails !== undefined) {
      updateData.error_details = errorDetails;
    }

    const { data, error } = await this.supabase
      .from('discovery_runs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return data as DiscoveryRun;
  }
}

// ============================================================================
// RISK ASSESSMENTS
// ============================================================================

export class RiskAssessmentRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async findByAutomation(automationId: string): Promise<RiskAssessment | null> {
    const { data, error } = await this.supabase
      .from('risk_assessments')
      .select('*')
      .eq('automation_id', automationId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as RiskAssessment;
  }

  async create(
    assessment: Omit<RiskAssessment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RiskAssessment | null> {
    const { data, error } = await this.supabase
      .from('risk_assessments')
      .insert(assessment)
      .select()
      .single();

    if (error || !data) return null;
    return data as RiskAssessment;
  }

  async findHighRiskByOrganization(
    organizationId: string,
    limit: number = 10
  ): Promise<RiskAssessment[]> {
    const { data, error } = await this.supabase
      .from('risk_assessments')
      .select('*, discovered_automations(*)')
      .eq('organization_id', organizationId)
      .gte('risk_score', 70)
      .order('risk_score', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as RiskAssessment[];
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export class AuditLogRepository {
  constructor(private supabase: ReturnType<typeof createSupabaseClient>) {}

  async log(
    organizationId: string,
    eventType: string,
    eventCategory: string,
    eventData: any,
    actorId?: string,
    actorType: string = 'system',
    resourceType?: string,
    resourceId?: string
  ): Promise<void> {
    await this.supabase
      .from('audit_logs')
      .insert({
        organization_id: organizationId,
        event_type: eventType,
        event_category: eventCategory,
        actor_id: actorId,
        actor_type: actorType,
        resource_type: resourceType,
        resource_id: resourceId,
        event_data: eventData,
      });
  }
}

// ============================================================================
// DATABASE FACTORY
// ============================================================================

export class DatabaseFactory {
  private supabase: ReturnType<typeof createSupabaseClient>;

  constructor(serviceKey: string) {
    this.supabase = createSupabaseClient(serviceKey);
  }

  get organizations() {
    return new OrganizationRepository(this.supabase);
  }

  get platformConnections() {
    return new PlatformConnectionRepository(this.supabase);
  }

  get automations() {
    return new AutomationRepository(this.supabase);
  }

  get discoveryRuns() {
    return new DiscoveryRunRepository(this.supabase);
  }

  get riskAssessments() {
    return new RiskAssessmentRepository(this.supabase);
  }

  get auditLogs() {
    return new AuditLogRepository(this.supabase);
  }

  get client() {
    return this.supabase;
  }
}