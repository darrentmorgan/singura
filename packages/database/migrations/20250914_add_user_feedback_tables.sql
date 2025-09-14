-- User Feedback Table
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_id UUID NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'ignore', 'flag')),
    comment TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (detection_id) REFERENCES shadow_network_detections(id)
);

-- Organization Detection Configuration Table
CREATE TABLE organization_detection_config (
    organization_id UUID PRIMARY KEY,
    base_risk_threshold NUMERIC(5,2) DEFAULT 0.5,
    learning_enabled BOOLEAN DEFAULT TRUE,
    custom_sensitivity_factors JSONB,

    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Indexes for performance
CREATE INDEX idx_user_feedback_detection ON user_feedback(detection_id);
CREATE INDEX idx_user_feedback_organization ON user_feedback(organization_id);
CREATE INDEX idx_user_feedback_timestamp ON user_feedback(timestamp DESC);