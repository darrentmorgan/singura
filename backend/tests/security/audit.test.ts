/**
 * Security Audit Service Tests
 * Tests comprehensive audit logging, security monitoring, and compliance reporting
 */

import { securityAuditService } from '../../src/security/audit';
import { auditLogRepository } from '../../src/database/repositories';
import { testDb } from '../helpers/test-database';
import { MockDataGenerator } from '../helpers/mock-data';

// Mock request object for testing
const mockRequest = {
  ip: '192.168.1.100',
  get: jest.fn((header: string) => {
    const headers: Record<string, string> = {
      'user-agent': 'Mozilla/5.0 (Test Browser)',
      'x-forwarded-for': '203.0.113.1',
      'x-correlation-id': 'test-correlation-123'
    };
    return headers[header.toLowerCase()];
  }),
  headers: {
    'user-agent': 'Mozilla/5.0 (Test Browser)',
    'x-forwarded-for': '203.0.113.1',
    'x-correlation-id': 'test-correlation-123'
  }
} as any;

describe('Security Audit Service', () => {
  let testData: {
    organization: { id: string; name: string };
    platformConnection: { id: string; platform_type: string };
    encryptedCredentials: Array<Record<string, unknown>>;
  };

  beforeAll(async () => {
    await testDb.beginTransaction();
    testData = await testDb.createFixtures();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Event Logging', () => {
    describe('logAuthenticationEvent', () => {
      it('should log successful authentication', async () => {
        const userId = 'test-user-123';
        const orgId = testData.organization.id;
        const eventData = {
          email: 'user@example.com',
          loginMethod: 'password'
        };

        await securityAuditService.logAuthenticationEvent(
          'login_success',
          userId,
          orgId,
          mockRequest,
          eventData
        );

        // Verify log was created
        const logs = await auditLogRepository.findMany({
          event_type: 'login_success',
          actor_id: userId
        });

        expect(logs.data.length).toBeGreaterThan(0);
        
        const log = logs.data[0];
        expect(log.organization_id).toBe(orgId);
        expect(log.event_category).toBe('auth');
        expect(log.actor_id).toBe(userId);
        expect(log.actor_type).toBe('user');
        expect(log.ip_address).toBe('192.168.1.100');
        expect(log.user_agent).toBe('Mozilla/5.0 (Test Browser)');
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.correlation_id).toBe('test-correlation-123');
      });

      it('should log failed authentication with security context', async () => {
        const eventData = {
          email: 'attacker@malicious.com',
          reason: 'invalid_credentials',
          attemptCount: 5
        };

        await securityAuditService.logAuthenticationEvent(
          'login_failure',
          'unknown',
          undefined,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'login_failure'
        });

        expect(logs.data.length).toBeGreaterThan(0);
        
        const log = logs.data[0];
        expect(log.organization_id).toBeNull();
        expect(log.event_category).toBe('auth');
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('medium');
      });

      it('should log OAuth authentication events', async () => {
        const userId = 'oauth-user-456';
        const orgId = testData.organization.id;
        const eventData = {
          provider: 'slack',
          scopes: ['channels:read', 'users:read'],
          workspaceId: 'T123456789'
        };

        await securityAuditService.logAuthenticationEvent(
          'oauth_success',
          userId,
          orgId,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'oauth_success',
          actor_id: userId
        });

        expect(logs.data.length).toBeGreaterThan(0);
        
        const log = logs.data[0];
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('low');
      });

      it('should handle token refresh events', async () => {
        const userId = 'refresh-user-789';
        const orgId = testData.organization.id;
        const eventData = {
          tokenType: 'refresh',
          sessionId: 'sess_123456789',
          success: true
        };

        await securityAuditService.logAuthenticationEvent(
          'token_refresh',
          userId,
          orgId,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'token_refresh',
          actor_id: userId
        });

        const log = logs.data[0];
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('low');
      });

      it('should capture detailed security context', async () => {
        // Mock request with security indicators
        const suspiciousRequest = {
          ...mockRequest,
          ip: '10.0.0.1', // Internal IP
          get: jest.fn((header: string) => {
            const headers: Record<string, string> = {
              'user-agent': 'curl/7.68.0', // Suspicious user agent
              'x-forwarded-for': '203.0.113.1, 198.51.100.1', // Multiple proxies
              'x-correlation-id': 'suspicious-correlation'
            };
            return headers[header.toLowerCase()];
          })
        } as any;

        await securityAuditService.logAuthenticationEvent(
          'login_failure',
          'unknown',
          undefined,
          suspiciousRequest,
          { reason: 'brute_force_detected' }
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'login_failure'
        });

        const log = logs.data[0];
        expect(log.user_agent).toBe('curl/7.68.0');
        expect(log.event_data.correlation_id).toBe('suspicious-correlation');
        expect(log.event_data.forwarded_ips).toContain('198.51.100.1');
        expect(log.event_data.risk_level).toBe('high');
      });
    });
  });

  describe('Connection Event Logging', () => {
    describe('logConnectionEvent', () => {
      it('should log platform connection creation', async () => {
        const connectionId = testData.platformConnection.id;
        const userId = 'connection-user-123';
        const eventData = {
          platform: 'slack',
          workspaceId: 'T123456789',
          scopes: ['channels:read', 'users:read']
        };

        await securityAuditService.logConnectionEvent(
          'connection_created',
          connectionId,
          userId,
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'connection_created',
          platform_connection_id: connectionId
        });

        expect(logs.data.length).toBeGreaterThan(0);
        
        const log = logs.data[0];
        expect(log.event_category).toBe('connection');
        expect(log.platform_connection_id).toBe(connectionId);
        expect(log.event_data).toMatchObject(eventData);
      });

      it('should log OAuth token refresh', async () => {
        const connectionId = testData.platformConnection.id;
        const userId = 'token-refresh-user';
        const eventData = {
          tokenType: 'oauth_refresh',
          success: true,
          expiresIn: 3600
        };

        await securityAuditService.logConnectionEvent(
          'oauth_token_refreshed',
          connectionId,
          userId,
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'oauth_token_refreshed',
          platform_connection_id: connectionId
        });

        const log = logs.data[0];
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('low');
      });

      it('should log connection errors', async () => {
        const connectionId = testData.platformConnection.id;
        const userId = 'error-user';
        const eventData = {
          error: 'token_expired',
          errorCode: 'OAUTH_TOKEN_EXPIRED',
          lastSuccessfulSync: '2025-01-15T10:00:00Z'
        };

        await securityAuditService.logConnectionEvent(
          'connection_error',
          connectionId,
          userId,
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'connection_error',
          platform_connection_id: connectionId
        });

        const log = logs.data[0];
        expect(log.event_category).toBe('connection');
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('medium');
      });

      it('should log data synchronization events', async () => {
        const connectionId = testData.platformConnection.id;
        const userId = 'sync-user';
        const eventData = {
          syncType: 'incremental',
          recordsProcessed: 1250,
          duration: 2340,
          lastSyncCursor: 'cursor_abc123'
        };

        await securityAuditService.logConnectionEvent(
          'data_sync_completed',
          connectionId,
          userId,
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'data_sync_completed',
          platform_connection_id: connectionId
        });

        const log = logs.data[0];
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.risk_level).toBe('low');
      });
    });
  });

  describe('Security Violation Logging', () => {
    describe('logSecurityViolation', () => {
      it('should log high-severity security violations', async () => {
        const userId = 'malicious-user';
        const orgId = testData.organization.id;
        const violationType = 'sql_injection_attempt';
        const description = 'Detected SQL injection in user input parameter';
        const eventData = {
          attackVector: 'form_input',
          injectionPayload: "'; DROP TABLE users; --",
          detectionMethod: 'input_validation'
        };

        await securityAuditService.logSecurityViolation(
          violationType,
          description,
          userId,
          orgId,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'sql_injection_attempt'
        });

        expect(logs.data.length).toBeGreaterThan(0);
        
        const log = logs.data[0];
        expect(log.event_category).toBe('security');
        expect(log.actor_id).toBe(userId);
        expect(log.organization_id).toBe(orgId);
        expect(log.event_data).toMatchObject(eventData);
        expect(log.event_data.severity).toBe('critical');
        expect(log.event_data.risk_level).toBe('critical');
        expect(log.event_data.requires_immediate_attention).toBe(true);
      });

      it('should log rate limiting violations', async () => {
        const violationType = 'rate_limit_exceeded';
        const description = 'API rate limit exceeded for endpoint /api/connections';
        const eventData = {
          endpoint: '/api/connections',
          requestCount: 150,
          timeWindow: '60s',
          limit: 100
        };

        await securityAuditService.logSecurityViolation(
          violationType,
          description,
          'api-user',
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'rate_limit_exceeded'
        });

        const log = logs.data[0];
        expect(log.event_data.severity).toBe('medium');
        expect(log.event_data.risk_level).toBe('medium');
      });

      it('should log encryption/decryption failures', async () => {
        const violationType = 'encryption_failure';
        const description = 'Failed to decrypt OAuth token - possible tampering detected';
        const eventData = {
          credentialId: 'cred_123456',
          encryptionKeyId: 'key-2025-01',
          errorType: 'authentication_tag_mismatch'
        };

        await securityAuditService.logSecurityViolation(
          violationType,
          description,
          'system',
          testData.organization.id,
          mockRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'encryption_failure'
        });

        const log = logs.data[0];
        expect(log.event_data.severity).toBe('high');
        expect(log.event_data.requires_investigation).toBe(true);
      });

      it('should log suspicious IP activity', async () => {
        const suspiciousRequest = {
          ...mockRequest,
          ip: '198.51.100.1', // Known malicious IP
          get: jest.fn(() => 'Suspicious Bot 1.0')
        } as any;

        const violationType = 'suspicious_ip_activity';
        const description = 'Multiple failed login attempts from suspicious IP';
        const eventData = {
          failedAttempts: 25,
          timespan: '300s',
          targetAccounts: ['user1@example.com', 'admin@example.com'],
          geolocation: { country: 'Unknown', city: 'Unknown' }
        };

        await securityAuditService.logSecurityViolation(
          violationType,
          description,
          'unknown',
          undefined,
          suspiciousRequest,
          eventData
        );

        const logs = await auditLogRepository.findMany({
          event_type: 'suspicious_ip_activity'
        });

        const log = logs.data[0];
        expect(log.event_data.severity).toBe('high');
        expect(log.event_data.risk_level).toBe('high');
        expect(log.ip_address).toBe('198.51.100.1');
      });
    });
  });

  describe('Security Metrics', () => {
    describe('getSecurityMetrics', () => {
      beforeEach(async () => {
        // Create test audit logs for metrics calculation
        const testEvents = [
          { type: 'login_success', category: 'auth', count: 5 },
          { type: 'login_failure', category: 'auth', count: 3 },
          { type: 'oauth_success', category: 'auth', count: 8 },
          { type: 'connection_created', category: 'connection', count: 4 },
          { type: 'sql_injection_attempt', category: 'security', count: 2 },
          { type: 'rate_limit_exceeded', category: 'security', count: 6 }
        ];

        for (const event of testEvents) {
          for (let i = 0; i < event.count; i++) {
            await auditLogRepository.create({
              organization_id: testData.organization.id,
              event_type: event.type,
              event_category: event.category,
              actor_id: `test-actor-${i}`,
              actor_type: 'user',
              resource_type: 'system',
              resource_id: 'test',
              event_data: { test: true, index: i },
              ip_address: '192.168.1.100',
              user_agent: 'Test Browser'
            });
          }
        }
      });

      it('should calculate 24-hour security metrics', async () => {
        const metrics = await securityAuditService.getSecurityMetrics(
          testData.organization.id,
          '24h'
        );

        expect(metrics).toBeDefined();
        expect(metrics.timeframe).toBe('24h');
        expect(metrics.organization_id).toBe(testData.organization.id);
        
        // Authentication metrics
        expect(metrics.authentication.total_attempts).toBeGreaterThanOrEqual(16);
        expect(metrics.authentication.successful_logins).toBeGreaterThanOrEqual(13);
        expect(metrics.authentication.failed_logins).toBeGreaterThanOrEqual(3);
        expect(metrics.authentication.success_rate).toBeDefined();
        
        // Connection metrics
        expect(metrics.connections.total_events).toBeGreaterThanOrEqual(4);
        expect(metrics.connections.new_connections).toBeGreaterThanOrEqual(4);
        
        // Security violations
        expect(metrics.security_violations.total_violations).toBeGreaterThanOrEqual(8);
        expect(metrics.security_violations.critical_violations).toBeGreaterThanOrEqual(2);
        expect(metrics.security_violations.by_type).toBeDefined();
        
        // Risk assessment
        expect(metrics.risk_assessment).toBeDefined();
        expect(metrics.risk_assessment.overall_score).toBeGreaterThanOrEqual(0);
        expect(metrics.risk_assessment.overall_score).toBeLessThanOrEqual(100);
      });

      it('should calculate metrics for different timeframes', async () => {
        const timeframes = ['1h', '24h', '7d', '30d'] as const;
        
        for (const timeframe of timeframes) {
          const metrics = await securityAuditService.getSecurityMetrics(
            testData.organization.id,
            timeframe
          );
          
          expect(metrics.timeframe).toBe(timeframe);
          expect(metrics.authentication).toBeDefined();
          expect(metrics.connections).toBeDefined();
          expect(metrics.security_violations).toBeDefined();
        }
      });

      it('should include trend analysis', async () => {
        const metrics = await securityAuditService.getSecurityMetrics(
          testData.organization.id,
          '24h'
        );

        expect(metrics.trends).toBeDefined();
        expect(metrics.trends.authentication_trend).toBeDefined();
        expect(metrics.trends.security_incidents_trend).toBeDefined();
        expect(metrics.trends.connection_health_trend).toBeDefined();
      });

      it('should handle organizations with no data', async () => {
        const emptyOrgData = MockDataGenerator.createMockOrganization();
        const emptyOrg = await testDb.query(`
          INSERT INTO organizations (name, slug)
          VALUES ($1, $2) RETURNING id
        `, [emptyOrgData.name, emptyOrgData.slug]);

        const metrics = await securityAuditService.getSecurityMetrics(
          emptyOrg.rows[0].id,
          '24h'
        );

        expect(metrics.authentication.total_attempts).toBe(0);
        expect(metrics.connections.total_events).toBe(0);
        expect(metrics.security_violations.total_violations).toBe(0);
        expect(metrics.risk_assessment.overall_score).toBe(0);
      });
    });
  });

  describe('Compliance Reporting', () => {
    describe('generateComplianceReport', () => {
      beforeEach(async () => {
        // Create comprehensive test data for compliance reporting
        const complianceEvents = [
          // Access control events
          { type: 'user_access_granted', category: 'auth', data: { role: 'admin' } },
          { type: 'user_access_revoked', category: 'auth', data: { reason: 'termination' } },
          { type: 'permission_changed', category: 'auth', data: { old: 'read', new: 'admin' } },
          
          // Data access events
          { type: 'data_access', category: 'connection', data: { dataset: 'user_profiles' } },
          { type: 'data_export', category: 'connection', data: { records: 150 } },
          { type: 'data_deletion', category: 'admin', data: { reason: 'user_request' } },
          
          // Security events
          { type: 'encryption_key_rotation', category: 'security', data: { keyId: 'key-2025-01' } },
          { type: 'audit_log_integrity_check', category: 'security', data: { passed: true } },
          { type: 'vulnerability_scan', category: 'security', data: { findings: 0 } }
        ];

        for (const event of complianceEvents) {
          await auditLogRepository.create({
            organization_id: testData.organization.id,
            event_type: event.type,
            event_category: event.category,
            actor_id: 'compliance-test-user',
            actor_type: 'user',
            resource_type: 'system',
            resource_id: 'compliance-test',
            event_data: event.data,
            ip_address: '192.168.1.100',
            user_agent: 'Compliance Test'
          });
        }
      });

      it('should generate SOC 2 Type II compliance report', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        const report = await securityAuditService.generateComplianceReport(
          'soc2',
          startDate,
          endDate,
          testData.organization.id
        );

        expect(report).toBeDefined();
        expect(report.reportType).toBe('soc2');
        expect(report.organizationId).toBe(testData.organization.id);
        expect(report.startDate).toEqual(startDate);
        expect(report.endDate).toEqual(endDate);

        // SOC 2 Trust Service Criteria
        expect(report.controls).toBeDefined();
        expect(report.controls.security).toBeDefined();
        expect(report.controls.availability).toBeDefined();
        expect(report.controls.processing_integrity).toBeDefined();
        expect(report.controls.confidentiality).toBeDefined();
        expect(report.controls.privacy).toBeDefined();

        // Evidence and metrics
        expect(report.evidence).toBeDefined();
        expect(report.evidence.access_controls).toBeDefined();
        expect(report.evidence.data_protection).toBeDefined();
        expect(report.evidence.monitoring_logging).toBeDefined();
        
        expect(report.summary.total_events).toBeGreaterThan(0);
        expect(report.summary.compliance_score).toBeGreaterThanOrEqual(0);
        expect(report.summary.compliance_score).toBeLessThanOrEqual(100);
      });

      it('should generate GDPR compliance report', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        const report = await securityAuditService.generateComplianceReport(
          'gdpr',
          startDate,
          endDate,
          testData.organization.id
        );

        expect(report.reportType).toBe('gdpr');
        
        // GDPR-specific sections
        expect(report.data_processing).toBeDefined();
        expect(report.data_processing.lawful_basis).toBeDefined();
        expect(report.data_processing.data_categories).toBeDefined();
        expect(report.data_processing.retention_periods).toBeDefined();

        expect(report.individual_rights).toBeDefined();
        expect(report.individual_rights.access_requests).toBeDefined();
        expect(report.individual_rights.deletion_requests).toBeDefined();
        expect(report.individual_rights.portability_requests).toBeDefined();

        expect(report.security_measures).toBeDefined();
        expect(report.security_measures.encryption_usage).toBeDefined();
        expect(report.security_measures.access_controls).toBeDefined();
        expect(report.security_measures.breach_incidents).toBeDefined();
      });

      it('should generate OWASP security assessment report', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        const report = await securityAuditService.generateComplianceReport(
          'owasp',
          startDate,
          endDate,
          testData.organization.id
        );

        expect(report.reportType).toBe('owasp');
        
        // OWASP Top 10 categories
        expect(report.security_categories).toBeDefined();
        expect(report.security_categories.injection_attacks).toBeDefined();
        expect(report.security_categories.broken_authentication).toBeDefined();
        expect(report.security_categories.sensitive_data_exposure).toBeDefined();
        expect(report.security_categories.xml_external_entities).toBeDefined();
        expect(report.security_categories.broken_access_control).toBeDefined();
        expect(report.security_categories.security_misconfiguration).toBeDefined();
        expect(report.security_categories.cross_site_scripting).toBeDefined();
        expect(report.security_categories.insecure_deserialization).toBeDefined();
        expect(report.security_categories.vulnerable_components).toBeDefined();
        expect(report.security_categories.insufficient_logging).toBeDefined();

        expect(report.risk_assessment).toBeDefined();
        expect(report.recommendations).toBeDefined();
      });

      it('should include executive summary', async () => {
        const report = await securityAuditService.generateComplianceReport(
          'soc2',
          new Date('2025-01-01'),
          new Date('2025-12-31'),
          testData.organization.id
        );

        expect(report.executive_summary).toBeDefined();
        expect(report.executive_summary.key_findings).toBeDefined();
        expect(report.executive_summary.compliance_status).toBeDefined();
        expect(report.executive_summary.critical_issues).toBeDefined();
        expect(report.executive_summary.recommendations).toBeDefined();
      });

      it('should validate date ranges', async () => {
        const invalidEndDate = new Date('2024-01-01');
        const startDate = new Date('2025-01-01');

        await expect(
          securityAuditService.generateComplianceReport(
            'soc2',
            startDate,
            invalidEndDate,
            testData.organization.id
          )
        ).rejects.toThrow('End date must be after start date');
      });

      it('should handle organizations without data', async () => {
        const emptyOrgData = MockDataGenerator.createMockOrganization();
        const emptyOrg = await testDb.query(`
          INSERT INTO organizations (name, slug)
          VALUES ($1, $2) RETURNING id
        `, [emptyOrgData.name, emptyOrgData.slug]);

        const report = await securityAuditService.generateComplianceReport(
          'soc2',
          new Date('2025-01-01'),
          new Date('2025-12-31'),
          emptyOrg.rows[0].id
        );

        expect(report.summary.total_events).toBe(0);
        expect(report.summary.compliance_score).toBe(0);
        expect(report.recommendations).toContain('Insufficient audit data');
      });
    });
  });

  describe('Audit Log Integrity', () => {
    it('should prevent audit log tampering', async () => {
      // Create audit log
      const log = await auditLogRepository.create({
        organization_id: testData.organization.id,
        event_type: 'test_integrity',
        event_category: 'security',
        actor_id: 'integrity-test',
        actor_type: 'user',
        resource_type: 'system',
        resource_id: 'test',
        event_data: { original: true },
        ip_address: '192.168.1.100',
        user_agent: 'Integrity Test'
      });

      // Audit logs should be immutable (no update method in repository)
      expect(auditLogRepository.update).toBeUndefined();
      
      // Deletion should be logged
      const deleteResult = await auditLogRepository.delete(log.id);
      expect(deleteResult).toBe(true);
    });

    it('should maintain chronological order', async () => {
      // Create multiple logs with slight time delays
      const logs = [];
      for (let i = 0; i < 5; i++) {
        const log = await auditLogRepository.create({
          organization_id: testData.organization.id,
          event_type: 'chronological_test',
          event_category: 'test',
          actor_id: `test-${i}`,
          actor_type: 'user',
          resource_type: 'system',
          resource_id: 'chronological',
          event_data: { sequence: i },
          ip_address: '192.168.1.100',
          user_agent: 'Chronological Test'
        });
        logs.push(log);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Retrieve logs in chronological order
      const retrievedLogs = await auditLogRepository.findMany(
        { event_type: 'chronological_test' },
        { sort_by: 'created_at', sort_order: 'ASC' }
      );

      // Verify chronological order
      for (let i = 1; i < retrievedLogs.data.length; i++) {
        expect(new Date(retrievedLogs.data[i].created_at).getTime())
          .toBeGreaterThanOrEqual(new Date(retrievedLogs.data[i-1].created_at).getTime());
      }
    });

    it('should preserve event context', async () => {
      const complexEventData = {
        user: { id: 'user123', email: 'test@example.com' },
        action: { type: 'oauth_connect', platform: 'slack' },
        metadata: {
          sessionId: 'sess_abc123',
          clientVersion: '1.2.3',
          features: ['automation', 'security']
        },
        security: {
          riskScore: 25,
          anomalyFlags: [],
          geoLocation: { country: 'US', city: 'San Francisco' }
        }
      };

      const log = await auditLogRepository.create({
        organization_id: testData.organization.id,
        event_type: 'complex_event',
        event_category: 'connection',
        actor_id: 'user123',
        actor_type: 'user',
        resource_type: 'oauth_connection',
        resource_id: 'conn_xyz789',
        event_data: complexEventData,
        ip_address: '203.0.113.1',
        user_agent: 'SaaS X-Ray Client/1.2.3'
      });

      // Retrieve and verify data integrity
      const retrievedLog = await auditLogRepository.findById(log.id);
      expect(retrievedLog?.event_data).toEqual(complexEventData);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume logging', async () => {
      const startTime = Date.now();
      const logPromises = [];

      // Create 100 concurrent audit logs
      for (let i = 0; i < 100; i++) {
        const promise = securityAuditService.logAuthenticationEvent(
          'performance_test',
          `user-${i}`,
          testData.organization.id,
          mockRequest,
          { testIndex: i }
        );
        logPromises.push(promise);
      }

      await Promise.all(logPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all logs were created
      const logs = await auditLogRepository.findMany({
        event_type: 'performance_test'
      });
      expect(logs.data.length).toBe(100);
    });

    it('should efficiently query large datasets', async () => {
      // This test verifies that indexed queries perform well
      const startTime = Date.now();
      
      const metrics = await securityAuditService.getSecurityMetrics(
        testData.organization.id,
        '30d'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Query should complete quickly (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(metrics).toBeDefined();
    });
  });
});