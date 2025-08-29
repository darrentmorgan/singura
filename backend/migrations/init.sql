-- ============================================================================
-- SaaS X-Ray Database Initialization
-- This file is executed by Docker Compose on first database creation
-- ============================================================================

-- Set timezone
SET timezone = 'UTC';

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'SaaS X-Ray database initialization completed successfully';
END $$;