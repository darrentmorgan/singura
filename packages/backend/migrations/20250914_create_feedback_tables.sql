-- Feedback Entries Table
CREATE TABLE IF NOT EXISTS feedback_entries (
    id UUID PRIMARY KEY,
    detection_id VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    comment TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    detection_metadata JSONB,
    user_context JSONB,
    sensitivity DECIMAL(5,2),

    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feedback Learning Configuration Table
CREATE TABLE IF NOT EXISTS learning_configurations (
    organization_id UUID PRIMARY KEY,
    base_sensitivity DECIMAL(5,2) DEFAULT 0.5,
    custom_sensitivity_thresholds JSONB,
    detection_categories TEXT[],
    learning_rate DECIMAL(5,2) DEFAULT 0.1,

    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Indexes for performance
CREATE INDEX idx_feedback_entries_org_timestamp
    ON feedback_entries(organization_id, timestamp);

CREATE INDEX idx_feedback_entries_detection_id
    ON feedback_entries(detection_id);

-- Audit logging trigger for feedback interactions
CREATE OR REPLACE FUNCTION audit_feedback_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        details,
        user_id,
        organization_id
    ) VALUES (
        'feedback_entry',
        NEW.id,
        NEW.action,
        jsonb_build_object(
            'detection_id', NEW.detection_id,
            'comment', NEW.comment,
            'sensitivity', NEW.sensitivity
        ),
        NEW.user_id,
        NEW.organization_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_audit_log
AFTER INSERT ON feedback_entries
FOR EACH ROW
EXECUTE FUNCTION audit_feedback_log();