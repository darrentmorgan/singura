-- ============================================================================
-- Migration 005: OAuth Scope Library
-- Purpose: Create OAuth scope metadata table for scope enrichment
-- Date: 2025-10-07
-- Implementation: Phase 1 - Scope Enrichment Foundation
-- ============================================================================

-- Create OAuth scope library table
CREATE TABLE IF NOT EXISTS oauth_scope_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_url VARCHAR(500) UNIQUE NOT NULL,
  platform VARCHAR(50) NOT NULL,  -- 'google', 'microsoft', 'slack'
  service_name VARCHAR(100) NOT NULL,  -- 'Google Drive', 'Gmail', etc.
  access_level VARCHAR(50) NOT NULL,  -- 'read_only', 'read_write', 'admin'
  display_name VARCHAR(200) NOT NULL,  -- 'Full Drive Access', 'Email Address', etc.
  description TEXT NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  data_types JSONB DEFAULT '[]'::jsonb,  -- ['Documents', 'Spreadsheets', 'Files']
  common_use_cases TEXT,
  abuse_scenarios TEXT,
  alternatives TEXT,  -- Recommended less-privileged alternatives
  gdpr_impact TEXT,
  hipaa_impact TEXT,
  regulatory_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_scope_library_platform ON oauth_scope_library(platform);
CREATE INDEX IF NOT EXISTS idx_oauth_scope_library_risk_level ON oauth_scope_library(risk_level);
CREATE INDEX IF NOT EXISTS idx_oauth_scope_library_scope_url ON oauth_scope_library(scope_url);

-- ============================================================================
-- Seed Google OAuth Scopes (15 pre-configured scopes)
-- ============================================================================

-- CRITICAL RISK (90-95)
INSERT INTO oauth_scope_library (
  scope_url, platform, service_name, access_level, display_name, description,
  risk_score, risk_level, data_types, common_use_cases, abuse_scenarios,
  alternatives, gdpr_impact, hipaa_impact, regulatory_notes
) VALUES
(
  'https://mail.google.com/',
  'google',
  'Gmail',
  'read_write',
  'Full Gmail Access',
  'Complete access to all emails with ability to send, delete, and modify messages. Grants unrestricted control over the entire mailbox.',
  95,
  'CRITICAL',
  '["Emails", "Drafts", "Labels", "Attachments", "Settings", "Contacts"]'::jsonb,
  'Email clients, email automation platforms, email backup services, email migration tools',
  'Email interception and surveillance, phishing campaigns using account impersonation, sensitive data exfiltration, deletion of evidence or audit trails, unauthorized email sending',
  'Use gmail.readonly for read-only access (risk score: 70/100 HIGH), or gmail.send for sending only (risk score: 60/100 HIGH)',
  'Can access ALL personal and business communications including: names, addresses, financial information, health records, trade secrets, attorney-client privileged communications. Violates GDPR data minimization principle (Article 5). Requires explicit Data Processing Agreement (DPA) with vendor. Must implement email retention policies per GDPR Article 17 (right to erasure).',
  'May access Protected Health Information (PHI) in emails, requiring HIPAA compliance. Business Associate Agreement (BAA) mandatory if PHI exposure likely.',
  'Consider implementing email DLP (Data Loss Prevention) policies. Audit access logs quarterly per SOC 2 requirements.'
),
(
  'https://www.googleapis.com/auth/admin.directory.user',
  'google',
  'Google Workspace Admin',
  'admin',
  'Full User Management',
  'Create, delete, and modify user accounts with password reset capabilities. Grants complete administrative control over user lifecycle.',
  90,
  'CRITICAL',
  '["Users", "Passwords", "Permissions", "Groups", "Organizational Units", "Aliases"]'::jsonb,
  'User provisioning systems, SCIM integration, identity management platforms, HR onboarding automation',
  'Account takeover via password reset, privilege escalation to admin accounts, unauthorized admin access creation, mass account deletion, lateral movement across organization',
  'Use admin.directory.user.readonly for read-only access (risk score: 40/100 MEDIUM)',
  'Grants access to complete employee directory including personal email addresses, phone numbers, employee IDs, organizational hierarchy. Must comply with GDPR Article 32 (security of processing) and maintain audit logs per Article 30.',
  'Access to user PHI (if stored in directory fields) requires HIPAA compliance.',
  'Requires MFA enforcement for accounts with this scope. Log all user modifications for minimum 1 year retention.'
);

-- HIGH RISK (65-85)
INSERT INTO oauth_scope_library (
  scope_url, platform, service_name, access_level, display_name, description,
  risk_score, risk_level, data_types, common_use_cases, abuse_scenarios,
  alternatives, gdpr_impact, hipaa_impact, regulatory_notes
) VALUES
(
  'https://www.googleapis.com/auth/drive',
  'google',
  'Google Drive',
  'read_write',
  'Full Drive Access (Read/Write)',
  'Unlimited access to all Drive files with create, modify, and delete permissions. Includes shared files and team drives.',
  85,
  'HIGH',
  '["Documents", "Spreadsheets", "Presentations", "PDFs", "Images", "Videos", "Folders", "Shared Drives"]'::jsonb,
  'File sync applications, backup services, document management systems, migration tools',
  'Mass file exfiltration and data theft, intellectual property theft, ransomware deployment, permanent data deletion, unauthorized file sharing',
  'Use drive.file scope to limit access to only files created by the application (risk score: 25/100 MEDIUM)',
  'Can access ALL organizational documents including: contracts, financial statements, employee records, strategic plans, customer data, source code. Requires DPA with explicit scope limitations per GDPR Article 28.',
  'May access PHI in documents. Requires HIPAA BAA if healthcare organization.',
  'Implement file access monitoring and anomaly detection. Consider using drive.readonly first, then request write access only if justified.'
),
(
  'https://www.googleapis.com/auth/drive.readonly',
  'google',
  'Google Drive',
  'read_only',
  'Full Drive Access (Read-Only)',
  'Read-only access to all files and folders in Google Drive, including shared files and team drives. Cannot modify or delete.',
  75,
  'HIGH',
  '["Documents", "Spreadsheets", "Presentations", "PDFs", "Images", "Videos", "Folders", "Shared Drives"]'::jsonb,
  'File backup and sync applications, document management systems, compliance archiving tools, search and indexing services',
  'Bulk file download and exfiltration, unauthorized sharing of sensitive documents, intellectual property theft, accessing confidential HR/financial/legal documents, competitive intelligence gathering',
  'Use drive.file scope to limit access to only files created by the application (risk score: 25/100 MEDIUM), or drive.metadata.readonly for file structure only (risk score: 20/100 LOW)',
  'Can access personal data in documents including names, addresses, financial information, health records. Violates data minimization principle (GDPR Article 5). Requires Data Processing Agreement (DPA) with app vendor. Must document lawful basis for processing (Article 6).',
  'If healthcare org, likely to access PHI. Requires HIPAA Business Associate Agreement (BAA).',
  'Consider implementing role-based access controls. Document business justification for scope. Review quarterly and revoke if unused.'
),
(
  'https://www.googleapis.com/auth/gmail.readonly',
  'google',
  'Gmail',
  'read_only',
  'Gmail Read-Only Access',
  'Read-only access to all email messages, attachments, labels, and settings. Cannot send or modify emails.',
  70,
  'HIGH',
  '["Emails", "Attachments", "Labels", "Threads", "Metadata"]'::jsonb,
  'Email analytics platforms, compliance scanning tools, email search and discovery, legal eDiscovery',
  'Email content analysis and surveillance, sensitive data exposure, business intelligence theft, corporate espionage, reading privileged communications',
  'Use gmail.metadata for metadata-only access (risk score: 30/100 MEDIUM)',
  'Access to all email content including personal communications, business correspondence, contracts, financial records. Must implement purpose limitation (GDPR Article 5). Requires clear privacy notice to users.',
  'May access PHI in emails. HIPAA BAA required for healthcare organizations.',
  'Implement email content filtering to exclude privileged/confidential data. Audit access patterns for anomalies.'
),
(
  'https://www.googleapis.com/auth/calendar',
  'google',
  'Google Calendar',
  'read_write',
  'Full Calendar Access',
  'Full access to create, modify, and delete calendar events. Includes event details, attendees, and locations.',
  65,
  'HIGH',
  '["Events", "Attendees", "Locations", "Meeting Details", "Invitations"]'::jsonb,
  'Calendar sync tools, scheduling automation, meeting management platforms, time tracking',
  'Schedule tracking for executive targeting, meeting intelligence gathering, social engineering preparation, calendar manipulation for denial-of-service',
  'Use calendar.readonly for read-only access (risk score: 35/100 MEDIUM)',
  'Access to meeting schedules can reveal sensitive business activities, M&A discussions, client meetings, personal appointments. Requires consent under GDPR Article 6.',
  'Calendar entries may reference patient appointments or medical procedures (PHI).',
  'Limit to calendar.events.readonly if write access not required. Implement calendar data retention policies.'
);

-- MEDIUM RISK (25-55)
INSERT INTO oauth_scope_library (
  scope_url, platform, service_name, access_level, display_name, description,
  risk_score, risk_level, data_types, common_use_cases, abuse_scenarios,
  alternatives, gdpr_impact, hipaa_impact, regulatory_notes
) VALUES
(
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',
  'google',
  'Google Workspace Admin',
  'read_only',
  'Audit Log Access (Read-Only)',
  'Read-only access to admin audit logs and activity reports. Enables security monitoring without modification capabilities.',
  55,
  'MEDIUM',
  '["Audit Logs", "Activity Reports", "Login Events", "Admin Actions"]'::jsonb,
  'Security monitoring platforms, compliance reporting tools, SIEM integration, activity analysis',
  'Activity surveillance and user behavior tracking, identifying security controls for evasion, reconnaissance of admin activities',
  'No less-privileged alternative available for audit log access',
  'Audit logs contain user activity data including IP addresses, login times, actions performed. Must protect per GDPR Article 32 (security measures).',
  'Audit logs may reference PHI access events. Protect accordingly.',
  'Essential for security monitoring. Ensure logs are stored securely with integrity controls per SOC 2 requirements.'
),
(
  'https://www.googleapis.com/auth/script.projects.readonly',
  'google',
  'Google Apps Script',
  'read_only',
  'Apps Script Projects (Read-Only)',
  'Read-only access to Apps Script projects. Can inspect automation code and configurations.',
  50,
  'MEDIUM',
  '["Script Projects", "Source Code", "Configurations", "Triggers"]'::jsonb,
  'Code analysis tools, automation discovery platforms, security auditing, Apps Script management',
  'Code inspection for security vulnerabilities, extraction of API keys/secrets from scripts, intellectual property theft of custom automations',
  'No less-privileged alternative. This is already read-only.',
  'Apps Script code may contain business logic and proprietary algorithms. Protect as trade secrets.',
  'Scripts may process PHI. Review for HIPAA compliance.',
  'Use for security auditing to detect unauthorized automations. Scan for hardcoded credentials.'
),
(
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'google',
  'Google Workspace Admin',
  'read_only',
  'User Directory (Read-Only)',
  'Read-only access to user directory information. Can enumerate users and organizational structure.',
  40,
  'MEDIUM',
  '["User List", "User Details", "Groups", "Organizational Units"]'::jsonb,
  'Directory sync applications, organizational chart tools, user analytics platforms, identity management',
  'User enumeration for targeted attacks, organizational structure mapping, identifying high-value targets (executives, admins)',
  'No less-privileged alternative for directory access',
  'Directory contains employee personal data: names, email addresses, phone numbers, titles, departments. Must document processing purpose per GDPR Article 30.',
  'Employee directory may contain minimal PHI (e.g., medical leave status).',
  'Essential for SSO/SCIM integration. Limit to service accounts with IP restrictions.'
),
(
  'https://www.googleapis.com/auth/calendar.readonly',
  'google',
  'Google Calendar',
  'read_only',
  'Calendar Access (Read-Only)',
  'Read-only access to all calendar events and details. Cannot modify or create events.',
  35,
  'MEDIUM',
  '["Events", "Attendees", "Locations", "Event Descriptions"]'::jsonb,
  'Calendar widgets, scheduling assistants, time tracking tools, availability checking',
  'Schedule reconnaissance for social engineering, identifying travel schedules for physical security threats',
  'Use calendar.events.readonly with specific calendar filters if possible',
  'Calendar data reveals personal and business activities. Requires consent per GDPR Article 6(1)(a).',
  'Calendar may reference medical appointments (PHI).',
  'Minimize retention of calendar data. Delete after business purpose fulfilled.'
),
(
  'https://www.googleapis.com/auth/drive.file',
  'google',
  'Google Drive',
  'read_write',
  'App-Created Files Only',
  'Access limited to files created by this application. Best practice scope for least-privilege Drive access.',
  25,
  'MEDIUM',
  '["App-Created Files", "App-Created Folders"]'::jsonb,
  'Document editors, form builders, export tools, report generators',
  'Limited to app-created files only - significantly reduced risk surface',
  'This IS the recommended alternative to drive or drive.readonly',
  'Minimal GDPR impact as scope limited to app-created files only.',
  'App-created files may contain PHI if app processes health data.',
  'RECOMMENDED: Use this scope instead of drive or drive.readonly whenever possible.'
);

-- LOW RISK (5-20)
INSERT INTO oauth_scope_library (
  scope_url, platform, service_name, access_level, display_name, description,
  risk_score, risk_level, data_types, common_use_cases, abuse_scenarios,
  alternatives, gdpr_impact, hipaa_impact, regulatory_notes
) VALUES
(
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'google',
  'Google Drive',
  'read_only',
  'Drive Metadata Only',
  'Read-only access to file metadata without content. Can see file names, types, owners, modified dates.',
  20,
  'LOW',
  '["File Names", "File Types", "Owners", "Modified Dates", "Folder Structure"]'::jsonb,
  'File organization tools, metadata search, file analytics, storage management',
  'File structure reconnaissance, naming pattern analysis for targeted attacks, identifying sensitive files by name',
  'This is already a minimal scope',
  'File names may reveal sensitive information (e.g., "2024_Layoff_Plan.xlsx"). Minimal GDPR impact.',
  'File names may reference PHI (e.g., "Patient_Records_2024.xlsx").',
  'Low risk. Useful for storage analytics without accessing file content.'
),
(
  'https://www.googleapis.com/auth/userinfo.email',
  'google',
  'OAuth',
  'read_only',
  'Email Address',
  'Access to user email address only. Basic identity information with minimal privacy impact.',
  10,
  'LOW',
  '["Email Address"]'::jsonb,
  'Authentication, user identification, email verification, account linking',
  'Email harvesting for spam campaigns, phishing target lists, account enumeration',
  'This is already a minimal scope',
  'Email address is personal data under GDPR. Requires lawful basis for processing (Article 6). Include in privacy notice.',
  'Email address alone is not PHI unless combined with health information.',
  'Standard for OAuth authentication. Low risk. Document retention policy.'
),
(
  'https://www.googleapis.com/auth/userinfo.profile',
  'google',
  'OAuth',
  'read_only',
  'Basic Profile',
  'Access to basic profile information: name, picture, locale. Public profile data with minimal sensitivity.',
  10,
  'LOW',
  '["Name", "Picture", "Locale", "Profile URL"]'::jsonb,
  'User profiles, social login, personalization, avatar display',
  'Profile data collection for identity correlation, social engineering preparation',
  'This is already a minimal scope',
  'Name and profile picture are personal data under GDPR. Requires consent for marketing use.',
  'Name alone is not PHI unless in healthcare context.',
  'Standard for user profile display. Low risk.'
),
(
  'openid',
  'google',
  'OAuth',
  'authentication',
  'OpenID Connect',
  'OpenID Connect authentication scope. Provides user ID for authentication without additional data access.',
  5,
  'LOW',
  '["User ID", "Subject Identifier"]'::jsonb,
  'SSO (Single Sign-On), identity verification, authentication flows',
  'Identity correlation across platforms, user tracking',
  'This is a core OAuth scope and cannot be reduced',
  'User ID is pseudonymous data under GDPR. Minimal privacy impact.',
  'User ID alone is not PHI.',
  'Standard authentication scope. Minimal risk. Required for OpenID Connect.'
);

-- ============================================================================
-- Update Trigger for oauth_scope_library
-- ============================================================================

CREATE OR REPLACE FUNCTION update_oauth_scope_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_scope_library_updated_at
  BEFORE UPDATE ON oauth_scope_library
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_scope_library_updated_at();

-- ============================================================================
-- Verification
-- ============================================================================

-- Count total scopes
DO $$
DECLARE
  scope_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO scope_count FROM oauth_scope_library;
  RAISE NOTICE 'Total OAuth scopes seeded: %', scope_count;
END $$;

-- Count by risk level
DO $$
DECLARE
  critical_count INTEGER;
  high_count INTEGER;
  medium_count INTEGER;
  low_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO critical_count FROM oauth_scope_library WHERE risk_level = 'CRITICAL';
  SELECT COUNT(*) INTO high_count FROM oauth_scope_library WHERE risk_level = 'HIGH';
  SELECT COUNT(*) INTO medium_count FROM oauth_scope_library WHERE risk_level = 'MEDIUM';
  SELECT COUNT(*) INTO low_count FROM oauth_scope_library WHERE risk_level = 'LOW';
  
  RAISE NOTICE 'Risk Level Distribution:';
  RAISE NOTICE '  CRITICAL: %', critical_count;
  RAISE NOTICE '  HIGH: %', high_count;
  RAISE NOTICE '  MEDIUM: %', medium_count;
  RAISE NOTICE '  LOW: %', low_count;
END $$;
