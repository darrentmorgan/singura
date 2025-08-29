# SaaS X-Ray End-to-End Tests

This directory contains comprehensive end-to-end tests for the SaaS X-Ray application using Playwright. The tests cover authentication flows, OAuth integrations, automation discovery, and dashboard functionality.

## Test Architecture

### Page Object Model
Tests use the Page Object Model pattern for maintainable and reusable test code:

- **`pages/`** - Page object models for each application page
- **`fixtures/`** - Reusable test fixtures and helpers
- **`utils/`** - Utility functions and mock handlers
- **`tests/`** - Test specifications organized by feature

### Key Components

#### Page Objects
- `LoginPage.ts` - Login form interactions and validation
- `DashboardPage.ts` - Main dashboard functionality and metrics
- `ConnectionsPage.ts` - OAuth connections management
- `AutomationsPage.ts` - Automation discovery and management

#### Test Fixtures
- `auth.fixture.ts` - Authentication helpers and user management
- Global setup/teardown for consistent test environment

#### Mock Utilities
- `oauth-mock.ts` - OAuth flow simulation and security testing
- API response mocking for consistent test data

## Test Categories

### 1. Authentication Tests (`authentication.spec.ts`)
- Login/logout flows
- Session management
- Protected route access
- Security features (CSRF, rate limiting)
- Token refresh mechanisms

### 2. OAuth Integration Tests (`oauth-flows.spec.ts`)
- Slack OAuth flow end-to-end
- Google OAuth flow end-to-end  
- Microsoft OAuth flow end-to-end
- OAuth security validation (PKCE, CSRF protection)
- Error handling and recovery
- Multi-platform connection management

### 3. Automation Discovery Tests (`automations-discovery.spec.ts`)
- Automation detection and display
- Risk scoring validation
- Filtering and search functionality
- Real-time updates via WebSocket
- Platform-specific automation handling
- Management actions (acknowledge, suppress, export)

### 4. Dashboard Tests (`dashboard.spec.ts`)
- Metrics display and accuracy
- Chart interactions and tooltips
- Real-time data updates
- Responsive design validation
- Accessibility compliance

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

### Test Execution
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (with browser UI)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run tests with UI mode
npm run test:e2e:ui

# Run specific test suite
npm run test:oauth
npm run test:auth

# Generate test code interactively
npm run test:e2e:codegen
```

### CI/CD Integration
Tests are automatically run in GitHub Actions:
- On pull requests to main/develop branches
- On pushes to main/develop branches
- Daily scheduled runs at 2 AM UTC
- Results published to GitHub Pages

## Test Environment

### Database Setup
Tests use a dedicated PostgreSQL test database:
```bash
# Create test database
createdb saas_xray_test

# Run migrations
DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray_test npm run migrate
```

### Environment Variables
Configure test environment in `.env.test`:
- Database and Redis URLs
- Mock OAuth credentials
- Test user accounts
- Feature flags

### Mock Services
Tests use mocked external services:
- OAuth provider endpoints (Slack, Google, Microsoft)
- WebSocket connections for real-time updates
- External API calls for automation discovery

## Test Data Strategy

### Static Test Data
- Predefined user accounts for authentication testing
- Sample automation data for discovery tests
- Mock OAuth responses for integration tests

### Dynamic Test Data
- Generated test data for performance testing
- Randomized inputs for edge case testing
- Time-based data for real-time update testing

### Data Cleanup
- Tests use database transactions for isolation
- Global teardown removes temporary test data
- Mock services reset between test runs

## Security Testing

### OAuth Security Validation
- PKCE (Proof Key for Code Exchange) implementation
- CSRF (Cross-Site Request Forgery) protection
- State parameter validation
- Redirect URI validation
- Token storage security

### Input Validation Testing
- XSS (Cross-Site Scripting) prevention
- SQL injection protection
- Input sanitization validation
- Rate limiting verification

### Authentication Security
- Session management testing
- Token expiration handling
- Concurrent session validation
- Password security validation

## Performance Testing

### Load Testing
- Concurrent user simulation
- Large dataset handling
- Real-time update performance
- Chart rendering with large datasets

### Network Conditions
- Slow network simulation
- Offline/online state handling
- Network error recovery
- Timeout handling

## Accessibility Testing

### WCAG Compliance
- Keyboard navigation testing
- Screen reader compatibility
- ARIA label validation
- Color contrast verification
- Focus management validation

### Browser Compatibility
- Cross-browser testing (Chromium, Firefox, WebKit)
- Mobile viewport testing
- Responsive design validation
- Touch interaction testing

## Debugging and Development

### Debug Tools
```bash
# Run tests in debug mode
npm run test:e2e:debug

# Generate test report
npm run test:e2e:report

# Interactive test development
npm run test:e2e:ui
```

### Test Development Workflow
1. Write page objects first for new features
2. Create test fixtures for reusable functionality
3. Mock external dependencies consistently
4. Use descriptive test names and organize by feature
5. Include both positive and negative test cases
6. Validate accessibility and security aspects

### Common Issues and Solutions

#### Test Timeouts
- Increase timeout in `playwright.config.ts`
- Use `waitFor` methods for async operations
- Check for proper element selectors

#### Flaky Tests
- Use proper wait conditions instead of fixed delays
- Ensure test data isolation
- Mock external dependencies consistently

#### Authentication Issues
- Verify test user credentials in `.env.test`
- Check authentication state persistence
- Validate session management

## Reporting and Monitoring

### Test Reports
- HTML reports with screenshots and traces
- JUnit XML for CI/CD integration
- JSON reports for custom analysis
- GitHub Pages deployment for team access

### Monitoring and Alerts
- Slack notifications for test failures
- GitHub commit status updates
- Performance regression detection
- Security vulnerability scanning

## Contributing

### Test Standards
- Follow existing page object patterns
- Include comprehensive error scenarios
- Document complex test logic
- Maintain test data consistency
- Ensure cross-browser compatibility

### Review Checklist
- [ ] Tests follow page object model
- [ ] Proper mock data and fixtures
- [ ] Security aspects validated
- [ ] Accessibility compliance checked
- [ ] Error scenarios covered
- [ ] Documentation updated

For detailed implementation examples, see the test files in the `tests/` directory.