# SaaS X-Ray Backend Testing Strategy

This document outlines the comprehensive testing approach for the SaaS X-Ray backend, covering all layers from database to API endpoints with security-first testing principles.

## 🎯 Testing Philosophy

Our testing strategy follows the **Test Pyramid** model with emphasis on security, compliance, and reliability:

```
    /\     E2E Tests (OAuth Flows, Full Scenarios)
   /  \    
  /____\   Integration Tests (API Routes, External Services)  
 /      \  
/_______\ Unit Tests (Repositories, Services, Security)
```

### Core Principles

1. **Security First**: Every test validates security controls and audit logging
2. **Compliance Ready**: Tests support SOC 2, GDPR, and OWASP requirements  
3. **Real-world Scenarios**: Tests mirror actual production usage patterns
4. **Fast Feedback**: Unit tests provide rapid developer feedback
5. **Reliable Isolation**: Each test runs in isolation with proper cleanup

## 📊 Test Coverage Goals

| Layer | Minimum Coverage | Current Target |
|-------|------------------|----------------|
| **Unit Tests** | 80% | 85%+ |
| **Integration Tests** | 70% | 80%+ |
| **E2E Tests** | Critical flows | 100% |
| **Security Tests** | All security functions | 100% |

## 🏗️ Test Architecture

### Test Environment Setup

```bash
# Install dependencies
npm install

# Setup test database (Docker)
docker run -d --name saas-xray-test-db \
  -p 5433:5432 \
  -e POSTGRES_DB=saas_xray_test \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  postgres:15-alpine

# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Database & Security unit tests
npm run test:integration   # API integration tests  
npm run test:e2e          # End-to-end OAuth flows
npm run test:security     # Security-focused tests
```

### Test Data Management

- **Mock Data Generator**: Realistic test data with `MockDataGenerator`
- **Test Fixtures**: Reusable database fixtures with proper relationships
- **Transaction Isolation**: Each test runs in a database transaction
- **Cleanup Automation**: Automatic cleanup prevents test pollution

## 🔒 Security Testing Strategy

### 1. Encryption & Key Management Tests

**File**: `tests/security/encryption.test.ts`

- **AES-256-GCM Encryption**: Validates NIST SP 800-38D compliance
- **Key Rotation**: Tests secure key rotation and migration
- **Attack Resistance**: Timing attacks, tampering detection
- **OWASP Compliance**: Key strength validation, secure random generation

```typescript
// Example: Test encryption integrity
it('should detect tampering and prevent decryption', () => {
  const encrypted = service.encrypt(testToken);
  encrypted.ciphertext = 'tampered_data';
  
  expect(() => service.decrypt(encrypted)).toThrow('Decryption operation failed');
});
```

### 2. JWT Security Tests

**File**: `tests/security/jwt.test.ts`

- **Token Generation**: RSA-256 signatures, secure session IDs
- **Validation**: Expiration, revocation, session management
- **Attack Prevention**: Token tampering, replay attacks
- **Compliance**: RFC 7519 compliance, clock tolerance

### 3. Audit Logging Tests

**File**: `tests/security/audit.test.ts`

- **Event Logging**: Authentication, OAuth, security violations
- **Integrity**: Tamper-proof logging, chronological ordering
- **Compliance**: SOC 2, GDPR audit trail requirements
- **Performance**: High-volume logging, efficient queries

## 🗄️ Database Testing Strategy

### 1. Migration Tests

**File**: `tests/database/migrations.test.ts`

- **Schema Creation**: Tables, indexes, constraints validation
- **Data Integrity**: Foreign keys, cascading deletes
- **Row-Level Security**: Multi-tenant isolation policies
- **Rollback Safety**: Migration reversibility testing

### 2. Repository Tests

**File**: `tests/database/repositories/base.test.ts`, `organization.test.ts`

- **CRUD Operations**: Create, read, update, delete with edge cases
- **Query Building**: WHERE clauses, pagination, filtering
- **Constraint Validation**: Unique constraints, data validation
- **Performance**: Query optimization, index usage

```typescript
// Example: Test organization isolation
it('should enforce multi-tenant data isolation', async () => {
  const org1 = await createTestOrganization();
  const org2 = await createTestOrganization();
  
  // Connections should be isolated by organization
  const org1Connections = await platformConnectionRepo.findByOrganization(org1.id);
  const org2Connections = await platformConnectionRepo.findByOrganization(org2.id);
  
  expect(org1Connections).not.toEqual(org2Connections);
});
```

## 🌐 API Integration Testing

### 1. Authentication API Tests

**File**: `tests/api/auth.integration.test.ts`

- **Login Flow**: Credential validation, JWT generation
- **Token Management**: Refresh, revocation, session tracking
- **OAuth Integration**: Platform authorization flows
- **Security Controls**: Rate limiting, input validation

### 2. Security Endpoint Tests

- **Metrics API**: Security dashboard data aggregation
- **Compliance Reports**: SOC 2, GDPR, OWASP report generation
- **Admin Functions**: User management, audit log access

## 🔄 End-to-End Testing

### 1. OAuth Flow Tests

**File**: `tests/e2e/oauth-flow.test.ts`

Complete OAuth integration testing covering:

- **Authorization Initiation**: PKCE parameter generation
- **Callback Handling**: Token exchange, user info retrieval
- **Token Management**: Refresh, expiration, revocation
- **Multi-Platform Support**: Slack, Google, Microsoft OAuth
- **Error Scenarios**: Network failures, provider errors

```typescript
// Example: Complete Slack OAuth flow
describe('Complete Slack OAuth Flow', () => {
  it('should handle full OAuth authorization cycle', async () => {
    // 1. Initiate authorization
    const initResponse = await request(app)
      .get('/auth/oauth/slack/authorize')
      .set('Authorization', authHeader);
    
    // 2. Handle callback with mock OAuth code
    const callbackResponse = await request(app)
      .get('/auth/oauth/slack/callback')
      .query({ code: 'mock-code', state: initResponse.body.state });
    
    // 3. Verify connection created and tokens stored securely
    expect(callbackResponse.body.connection.platform_type).toBe('slack');
    
    // 4. Verify encrypted credential storage
    const credentials = await getConnectionCredentials(connection.id);
    expect(credentials.length).toBeGreaterThan(0);
  });
});
```

## 🛡️ Security Test Categories

### 1. Input Validation Tests

- **SQL Injection**: Parameterized query validation
- **XSS Prevention**: Input sanitization, output encoding  
- **CSRF Protection**: Token validation, same-origin checks
- **Path Traversal**: File access restriction validation

### 2. Authentication Security

- **Brute Force Protection**: Rate limiting, account lockout
- **Session Management**: Secure cookies, session fixation prevention
- **Password Security**: Hashing, complexity requirements
- **Multi-Factor Authentication**: TOTP validation (future)

### 3. Authorization Testing

- **Role-Based Access**: Permission validation, privilege escalation prevention
- **API Authorization**: Endpoint-level access control
- **Resource Ownership**: Multi-tenant data access validation
- **Admin Functions**: Super-user capability restrictions

## 📈 Performance Testing

### 1. Load Testing

- **Concurrent Users**: Authentication under load
- **Database Performance**: Query optimization validation
- **Memory Usage**: Leak detection, resource cleanup
- **Response Times**: SLA compliance verification

### 2. Security Performance

- **Encryption Operations**: Bulk token encryption/decryption
- **Audit Logging**: High-volume event processing
- **JWT Operations**: Token generation/validation throughput
- **Database Queries**: Complex security queries optimization

## 🚀 Running Tests

### Local Development

```bash
# Quick test run
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Security-focused tests only
npm run test:security

# Full test suite with cleanup
./scripts/run-tests.sh
```

### CI/CD Pipeline

```bash
# Complete CI test suite
npm run test:ci

# Individual test categories  
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:migrations
```

## 📊 Test Reports & Metrics

### Coverage Reports

- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: For CI/CD integration
- **JSON Format**: For programmatic analysis

### Security Metrics

- **OWASP Compliance**: Security category coverage
- **Vulnerability Scanning**: Dependency security audit
- **Audit Trail**: Complete event logging validation

### Performance Metrics

- **Test Execution Time**: Performance regression detection
- **Memory Usage**: Resource utilization monitoring
- **Database Performance**: Query execution analysis

## 🔧 Test Utilities

### Mock Services

```typescript
// OAuth service mocking
jest.mock('../../src/services/oauth-service');

// External API mocking with realistic responses
const mockSlackAPI = {
  tokenResponse: { access_token: 'xoxb-mock-token' },
  userInfo: { id: 'U123', name: 'Test User' }
};
```

### Test Helpers

- **TestDatabase**: Transaction isolation, fixture management
- **MockDataGenerator**: Realistic test data generation
- **SecurityScenarios**: Common attack pattern testing

### Custom Matchers

```typescript
// Security-specific Jest matchers
expect(auditLog).toHaveSecurityEvent('login_failure');
expect(encryptedData).toBeSecurelyEncrypted();
expect(response).toHaveSecurityHeaders();
```

## 📋 Test Checklist

Before merging any code, ensure:

- [ ] All unit tests pass with >80% coverage
- [ ] Integration tests validate API contracts  
- [ ] E2E tests cover critical OAuth flows
- [ ] Security tests validate all controls
- [ ] Database migrations are tested and reversible
- [ ] Performance tests show no regression
- [ ] Security audit passes with no high/critical issues
- [ ] Compliance tests support audit requirements

## 🎛️ Debugging Tests

### Local Debugging

```bash
# Debug specific test
npm test -- --testNamePattern="OAuth flow" --verbose

# Debug with breakpoints
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Database inspection during tests
npm test -- --detectOpenHandles --forceExit
```

### CI Debugging

- Check GitHub Actions logs for detailed test output
- Download test artifacts for local analysis
- Review coverage reports for missing test scenarios
- Analyze security scan results for vulnerabilities

## 🔮 Future Testing Enhancements

### Planned Improvements

1. **Chaos Engineering**: Network failure simulation
2. **Property-Based Testing**: Automated edge case discovery
3. **Visual Testing**: UI component regression testing
4. **Load Testing**: Automated performance benchmarking
5. **Contract Testing**: API consumer/provider validation

### Advanced Security Testing

1. **Penetration Testing**: Automated security scanning
2. **Fuzzing**: Input validation stress testing  
3. **Static Analysis**: Code security analysis
4. **Dynamic Analysis**: Runtime security monitoring

---

## 📞 Support

For testing questions or issues:

- **Documentation**: This file and inline code comments
- **Debugging**: Use test utilities and detailed error messages
- **CI Issues**: Check GitHub Actions logs and artifacts
- **Security Concerns**: Review security test failures carefully

**Remember**: Tests are our safety net for production deployments. Every test failure represents a potential production issue that we caught early! 🛡️