-- ============================================================================
-- SaaS X-Ray Supabase Seed Data
-- Purpose: Seed data for demo, staging, and development environments
-- ============================================================================

-- ============================================================================
-- DEMO ENVIRONMENT DATA (Professional Sales Demonstrations)
-- ============================================================================

-- Demo organization data with enterprise scenarios
DO $$
DECLARE
    demo_org_id UUID;
    acme_slack_conn_id UUID;
    acme_google_conn_id UUID;
    demo_discovery_run_id UUID;
    automation_id_1 UUID;
    automation_id_2 UUID;
    automation_id_3 UUID;
BEGIN
    -- Get demo organization ID
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-org';

    IF demo_org_id IS NOT NULL THEN
        -- Create realistic demo platform connections
        INSERT INTO platform_connections (
            id, organization_id, platform_type, platform_user_id, platform_workspace_id,
            display_name, status, permissions_granted, last_sync_at, metadata
        ) VALUES
        (
            uuid_generate_v4(), demo_org_id, 'slack', 'U12345DEMO', 'T12345DEMO',
            'Acme Corp Slack Workspace', 'active',
            '["channels:read", "channels:history", "users:read", "apps:read", "workflow.steps:execute"]',
            NOW() - INTERVAL '2 hours',
            '{"workspace_name": "Acme Corp", "user_count": 247, "channel_count": 156, "app_count": 23}'
        ),
        (
            uuid_generate_v4(), demo_org_id, 'google', 'demo.user@acmecorp.com', 'acmecorp.com',
            'Acme Corp Google Workspace', 'active',
            '["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/admin.directory.user.readonly"]',
            NOW() - INTERVAL '1 hour',
            '{"domain": "acmecorp.com", "user_count": 312, "drive_files": 45000, "apps_script_projects": 18}'
        )
        RETURNING id INTO acme_slack_conn_id, acme_google_conn_id;

        -- Get the connection IDs for demo data
        SELECT id INTO acme_slack_conn_id FROM platform_connections
        WHERE organization_id = demo_org_id AND platform_type = 'slack' LIMIT 1;

        SELECT id INTO acme_google_conn_id FROM platform_connections
        WHERE organization_id = demo_org_id AND platform_type = 'google' LIMIT 1;

        -- Create demo discovery run
        INSERT INTO discovery_runs (
            id, organization_id, platform_connection_id, status, started_at, completed_at,
            duration_ms, automations_found, errors_count, warnings_count, metadata
        ) VALUES (
            uuid_generate_v4(), demo_org_id, acme_slack_conn_id, 'completed',
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 45 minutes',
            900000, 12, 0, 2,
            '{"scan_depth": "comprehensive", "ai_validation": "gpt-5", "detection_confidence": 94}'
        ) RETURNING id INTO demo_discovery_run_id;

        -- Create realistic discovered automations for demo
        INSERT INTO discovered_automations (
            id, organization_id, platform_connection_id, discovery_run_id, external_id,
            name, description, automation_type, status, trigger_type, actions,
            permissions_required, data_access_patterns, owner_info,
            last_modified_at, last_triggered_at, execution_frequency, platform_metadata
        ) VALUES
        (
            uuid_generate_v4(), demo_org_id, acme_slack_conn_id, demo_discovery_run_id,
            'slack_workflow_sales_lead_processing',
            'Sales Lead Auto-Processor',
            'Automatically processes incoming sales leads from #leads channel, enriches with company data, and creates HubSpot records',
            'workflow', 'active', 'message_received',
            '["extract_lead_info", "enrich_company_data", "create_hubspot_record", "notify_sales_team"]',
            '["channels:read", "channels:history", "chat:write", "users:read"]',
            '["customer_emails", "company_data", "contact_information", "sales_pipeline_data"]',
            '{"creator": "sarah.wilson@acmecorp.com", "department": "Sales Operations", "role": "Sales Ops Manager"}',
            NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour',
            'real_time', '{"workflow_id": "Ft12345ABC", "step_count": 6, "success_rate": 94.7}'
        ),
        (
            uuid_generate_v4(), demo_org_id, acme_google_conn_id, demo_discovery_run_id,
            'google_apps_script_expense_automation',
            'Expense Report Auto-Approval',
            'Google Apps Script that auto-approves expense reports under $500 and routes higher amounts for manager approval',
            'script', 'active', 'form_submission',
            '["validate_receipt", "extract_amount", "check_policy", "auto_approve_or_route"]',
            '["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.send"]',
            '["expense_receipts", "employee_data", "approval_workflows", "financial_data"]',
            '{"creator": "finance.team@acmecorp.com", "department": "Finance", "role": "Finance Manager"}',
            NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 hours',
            'on_demand', '{"project_id": "apps-script-expense-automation", "execution_count": 1247, "avg_runtime": "2.3s"}'
        ),
        (
            uuid_generate_v4(), demo_org_id, acme_slack_conn_id, demo_discovery_run_id,
            'slack_bot_hr_assistant',
            'AI HR Assistant Bot',
            'GPT-powered bot that answers employee HR questions, schedules meetings, and provides policy information',
            'bot', 'active', 'mention',
            '["natural_language_processing", "query_hr_database", "schedule_meetings", "provide_policy_info"]',
            '["chat:write", "users:read", "channels:read", "im:write"]',
            '["employee_records", "hr_policies", "calendar_data", "personal_information"]',
            '{"creator": "hr.admin@acmecorp.com", "department": "Human Resources", "role": "HR Technology Lead"}',
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes',
            'real_time', '{"bot_user_id": "B98765XYZ", "monthly_interactions": 847, "satisfaction_score": 4.2}'
        )
        RETURNING id INTO automation_id_1, automation_id_2, automation_id_3;

        -- Create risk assessments for demo automations
        INSERT INTO risk_assessments (
            automation_id, organization_id, risk_level, risk_score,
            permission_risk_score, data_access_risk_score, activity_risk_score, ownership_risk_score,
            risk_factors, compliance_issues, security_concerns, recommendations,
            confidence_level
        ) VALUES
        (
            automation_id_1, demo_org_id, 'medium', 65,
            70, 80, 45, 65,
            '["accesses_customer_data", "external_api_calls", "high_execution_frequency"]',
            '["data_retention_policy", "customer_consent_tracking"]',
            '["unencrypted_api_calls", "broad_channel_access"]',
            '["implement_data_encryption", "reduce_permission_scope", "add_audit_logging"]',
            92
        ),
        (
            automation_id_2, demo_org_id, 'high', 78,
            85, 90, 60, 70,
            '["financial_data_access", "auto_approval_authority", "elevated_permissions"]',
            '["sox_compliance", "financial_controls"]',
            '["automatic_financial_approvals", "limited_audit_trail"]',
            '["implement_dual_approval", "enhance_audit_logging", "regular_policy_review"]',
            89
        ),
        (
            automation_id_3, demo_org_id, 'medium', 58,
            60, 75, 40, 50,
            '["personal_data_access", "ai_powered_responses", "employee_interaction"]',
            '["gdpr_compliance", "data_privacy"]',
            '["ai_hallucination_risk", "personal_data_exposure"]',
            '["implement_response_filtering", "regular_ai_model_updates", "privacy_controls"]',
            87
        );

        -- Create cross-platform integration
        INSERT INTO cross_platform_integrations (
            organization_id, name, integration_type, source_automation_id, target_automation_id,
            data_flow, data_types, confidence_score, detection_method, risk_level, risk_factors
        ) VALUES (
            demo_org_id, 'Sales Lead to HubSpot Pipeline',
            'data_sync', automation_id_1, NULL,
            '[{"source": "slack_leads", "destination": "hubspot_crm", "data_transformation": "lead_enrichment"}]',
            '["customer_contact_info", "company_data", "lead_scoring", "sales_pipeline_stage"]',
            94, 'api_call_analysis', 'medium',
            '["cross_platform_data_flow", "customer_data_transfer", "external_api_dependency"]'
        );

        -- Add automation activities for realistic usage patterns
        INSERT INTO automation_activities (
            automation_id, organization_id, platform_connection_id, activity_type,
            activity_timestamp, execution_duration_ms, execution_status,
            records_processed, data_volume_bytes
        ) VALUES
        (automation_id_1, demo_org_id, acme_slack_conn_id, 'execution', NOW() - INTERVAL '1 hour', 1247, 'success', 3, 2048),
        (automation_id_1, demo_org_id, acme_slack_conn_id, 'execution', NOW() - INTERVAL '2 hours', 1156, 'success', 1, 1024),
        (automation_id_2, demo_org_id, acme_google_conn_id, 'execution', NOW() - INTERVAL '3 hours', 2341, 'success', 1, 5120),
        (automation_id_3, demo_org_id, acme_slack_conn_id, 'execution', NOW() - INTERVAL '30 minutes', 892, 'success', 1, 512);

        RAISE NOTICE 'Demo organization data seeded successfully';
    END IF;
END $$;

-- ============================================================================
-- USER FEEDBACK DEMO DATA
-- ============================================================================

DO $$
DECLARE
    demo_org_id UUID;
BEGIN
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-org';

    IF demo_org_id IS NOT NULL THEN
        INSERT INTO user_feedback (
            organization_id, user_id, feedback_type, title, description,
            priority, page_url, status
        ) VALUES
        (
            demo_org_id, 'demo.user@acmecorp.com', 'feature_request',
            'Add Slack Workflow Risk Scoring',
            'Would love to see more granular risk scoring for Slack workflows, especially around data access patterns',
            'medium', 'https://demo.saasxray.com/automations', 'acknowledged'
        ),
        (
            demo_org_id, 'sarah.wilson@acmecorp.com', 'improvement',
            'Discovery Performance Enhancement',
            'The discovery process is thorough but could be faster for large workspaces with 500+ channels',
            'low', 'https://demo.saasxray.com/discovery', 'in_progress'
        );
    END IF;
END $$;

-- ============================================================================
-- AUDIT LOG SAMPLE DATA
-- ============================================================================

DO $$
DECLARE
    demo_org_id UUID;
    slack_conn_id UUID;
BEGIN
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-org';
    SELECT id INTO slack_conn_id FROM platform_connections
    WHERE organization_id = demo_org_id AND platform_type = 'slack' LIMIT 1;

    IF demo_org_id IS NOT NULL AND slack_conn_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            organization_id, platform_connection_id, event_type, event_category,
            actor_id, actor_type, resource_type, resource_id, event_data
        ) VALUES
        (
            demo_org_id, slack_conn_id, 'discovery_completed', 'sync',
            'system', 'system', 'discovery_run', slack_conn_id::text,
            '{"automations_found": 12, "duration_ms": 900000, "success_rate": 100}'
        ),
        (
            demo_org_id, slack_conn_id, 'risk_assessment_updated', 'analysis',
            'system', 'system', 'automation', 'slack_workflow_sales_lead_processing',
            '{"old_risk_score": 62, "new_risk_score": 65, "factors_changed": ["data_access_patterns"]}'
        );
    END IF;
END $$;

-- ============================================================================
-- STAGING ENVIRONMENT PREPARATION
-- ============================================================================

-- Staging org will be populated with real customer test data during beta testing
DO $$
DECLARE
    staging_org_id UUID;
BEGIN
    SELECT id INTO staging_org_id FROM organizations WHERE slug = 'staging-org';

    IF staging_org_id IS NOT NULL THEN
        -- Add initial staging setup data
        INSERT INTO audit_logs (
            organization_id, event_type, event_category,
            actor_type, resource_type, resource_id, event_data
        ) VALUES (
            staging_org_id, 'environment_initialized', 'admin',
            'system', 'organization', staging_org_id::text,
            '{"environment": "staging", "purpose": "customer_beta_testing"}'
        );

        RAISE NOTICE 'Staging organization prepared for customer beta testing';
    END IF;
END $$;

-- ============================================================================
-- DEVELOPMENT ENVIRONMENT DATA
-- ============================================================================

-- Dev org already has basic setup from migration, add development-specific data
DO $$
DECLARE
    dev_org_id UUID;
BEGIN
    SELECT id INTO dev_org_id FROM organizations WHERE slug = 'dev-org';

    IF dev_org_id IS NOT NULL THEN
        -- Add development environment marker
        INSERT INTO audit_logs (
            organization_id, event_type, event_category,
            actor_type, resource_type, resource_id, event_data
        ) VALUES (
            dev_org_id, 'environment_initialized', 'admin',
            'system', 'organization', dev_org_id::text,
            '{"environment": "development", "purpose": "local_development"}'
        );

        RAISE NOTICE 'Development organization configured';
    END IF;
END $$;

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Supabase seed data completed successfully:';
    RAISE NOTICE 'Organizations: %', (SELECT COUNT(*) FROM organizations);
    RAISE NOTICE 'Platform Connections: %', (SELECT COUNT(*) FROM platform_connections);
    RAISE NOTICE 'Discovered Automations: %', (SELECT COUNT(*) FROM discovered_automations);
    RAISE NOTICE 'Risk Assessments: %', (SELECT COUNT(*) FROM risk_assessments);
    RAISE NOTICE 'User Feedback: %', (SELECT COUNT(*) FROM user_feedback);
    RAISE NOTICE 'Audit Logs: %', (SELECT COUNT(*) FROM audit_logs);
END $$;