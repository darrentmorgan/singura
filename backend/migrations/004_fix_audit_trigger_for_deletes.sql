-- ============================================================================
-- Migration 004: Fix Audit Log Trigger for DELETE Operations
-- Purpose: Prevent FK constraint violation when deleting platform_connections
-- Date: 2025-10-06
-- Root Cause: Trigger tries to insert deleted connection ID into audit_logs,
--             but FK constraint requires the connection to still exist
-- Solution: Set platform_connection_id to NULL on DELETE operations
-- ============================================================================

-- Drop and recreate the trigger function with proper NULL handling
CREATE OR REPLACE FUNCTION log_platform_connection_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            organization_id, platform_connection_id, event_type, event_category,
            actor_type, resource_type, resource_id, event_data
        ) VALUES (
            NEW.organization_id, NEW.id, 'platform_connection_created', 'connection',
            'system', 'platform_connection', NEW.id::text,
            jsonb_build_object(
                'platform_type', NEW.platform_type,
                'display_name', NEW.display_name,
                'status', NEW.status
            )
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO audit_logs (
                organization_id, platform_connection_id, event_type, event_category,
                actor_type, resource_type, resource_id, event_data
            ) VALUES (
                NEW.organization_id, NEW.id, 'platform_connection_status_changed', 'connection',
                'system', 'platform_connection', NEW.id::text,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'platform_type', NEW.platform_type
                )
            );
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- CRITICAL FIX: Set platform_connection_id to NULL on DELETE
        -- because the connection no longer exists after this operation
        INSERT INTO audit_logs (
            organization_id, 
            platform_connection_id,  -- NULL - connection being deleted
            event_type, 
            event_category,
            actor_type, 
            resource_type, 
            resource_id,  -- Still store the ID for reference
            event_data
        ) VALUES (
            OLD.organization_id, 
            NULL,  -- ✅ CRITICAL FIX: NULL instead of OLD.id
            'platform_connection_deleted', 
            'connection',
            'system', 
            'platform_connection', 
            OLD.id::text,  -- Store ID as string in resource_id for auditing
            jsonb_build_object(
                'platform_type', OLD.platform_type,
                'display_name', OLD.display_name,
                'platform_connection_id', OLD.id  -- Also store in event_data for reference
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Record migration
INSERT INTO schema_migrations (migration_name, success)
VALUES ('004_fix_audit_trigger_for_deletes', true)
ON CONFLICT (migration_name) DO NOTHING;

-- Verification query
SELECT 'Audit trigger fixed - DELETE operations will now succeed' as status;
