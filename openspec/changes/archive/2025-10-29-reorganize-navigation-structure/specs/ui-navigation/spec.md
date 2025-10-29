# UI Navigation

## MODIFIED Requirements

### Requirement: Navigation Structure
The system SHALL provide a clear navigation structure that separates OAuth platform connections from AI-detected automations.

#### Scenario: Sidebar displays three navigation items
- **WHEN** the authenticated user views the application sidebar
- **THEN** the sidebar SHALL display exactly three navigation items:
  - "Dashboard" (href: `/dashboard`)
  - "Connections" (href: `/connections`)
  - "Automations" (href: `/automations`)
- **AND** the sidebar SHALL NOT display "Security" navigation item
- **AND** the sidebar SHALL NOT display "Analytics" navigation item

#### Scenario: Connections tab shows badge count
- **WHEN** the user views the Connections navigation item
- **THEN** the navigation item SHALL display a badge showing count of OAuth connections
- **AND** the badge count SHALL match the number of active OAuth platform connections
- **AND** the badge SHALL update in real-time when connections added or removed

#### Scenario: Automations tab shows badge count
- **WHEN** the user views the Automations navigation item
- **THEN** the navigation item SHALL display a badge showing count of detected automations
- **AND** the badge count SHALL match the number of AI-detected automations
- **AND** the badge SHALL NOT include OAuth connection count
- **AND** the badge SHALL update in real-time when automations detected

#### Scenario: Navigation remains accessible
- **WHEN** navigation items are updated
- **THEN** all navigation items SHALL maintain proper ARIA labels
- **AND** keyboard navigation SHALL work for all items (Tab, Enter)
- **AND** screen readers SHALL announce navigation items correctly
- **AND** focus indicators SHALL be visible on all items

## REMOVED Requirements

### Requirement: Security Page Navigation
The Security page navigation item SHALL be removed from the sidebar until functionality is implemented.

#### Scenario: Security link not visible in navigation
- **WHEN** the authenticated user views the application sidebar
- **THEN** the "Security" navigation item SHALL NOT be visible
- **AND** the "Security" icon SHALL NOT be rendered
- **AND** no placeholder or disabled state SHALL be shown

#### Scenario: Security route returns 404
- **WHEN** a user navigates directly to `/security` URL
- **THEN** the application SHALL display the 404 Not Found page
- **AND** the user SHALL be able to navigate back to Dashboard
- **AND** no error SHALL be logged to console

### Requirement: Analytics Page Navigation
The Analytics page navigation item SHALL be removed from the sidebar until functionality is implemented.

#### Scenario: Analytics link not visible in navigation
- **WHEN** the authenticated user views the application sidebar
- **THEN** the "Analytics" navigation item SHALL NOT be visible
- **AND** the "Analytics" icon SHALL NOT be rendered
- **AND** no placeholder or disabled state SHALL be shown

#### Scenario: Analytics route returns 404
- **WHEN** a user navigates directly to `/analytics` URL
- **THEN** the application SHALL display the 404 Not Found page
- **AND** the user SHALL be able to navigate back to Dashboard
- **AND** no error SHALL be logged to console

## MODIFIED Requirements

### Requirement: Automations Page Content
The Automations page SHALL display ONLY AI-detected automations, not OAuth connection data.

#### Scenario: Automations page shows only detected automations
- **WHEN** the user navigates to the Automations page (`/automations`)
- **THEN** the page SHALL display a list of AI-detected automations
- **AND** the page SHALL NOT display any OAuth platform connections
- **AND** each automation card SHALL show:
  - Automation name
  - Risk level (Low, Medium, High, Critical)
  - Automation type (Bot, Script, Workflow, API Integration)
  - Platform source (which connection detected it)
  - Detection date/time
  - Detection confidence score (if available)
- **AND** the page SHALL NOT display "Add Connection" buttons

#### Scenario: Empty state when no automations detected
- **WHEN** the user navigates to the Automations page
- **AND** no automations have been detected yet
- **THEN** the page SHALL display an empty state message
- **AND** the message SHALL explain that no automations have been detected
- **AND** the message SHALL guide user to connect platforms in Connections tab
- **AND** the message SHALL NOT show error state

#### Scenario: Automation data source is correct
- **WHEN** the Automations page component renders
- **THEN** the component SHALL retrieve data from `automations` store only
- **AND** the component SHALL NOT retrieve data from `connections` store
- **AND** the component SHALL filter to show only automation types:
  - `type: 'bot'`
  - `type: 'script'`
  - `type: 'workflow'`
  - `type: 'api_integration'`

### Requirement: Connections Page Content
The Connections page SHALL display ONLY OAuth platform connections, not automation detection data.

#### Scenario: Connections page shows only OAuth connections
- **WHEN** the user navigates to the Connections page (`/connections`)
- **THEN** the page SHALL display a list of OAuth platform connections
- **AND** the page SHALL NOT display any AI-detected automation data
- **AND** each connection card SHALL show:
  - Platform name (Slack, Google Workspace, Microsoft 365)
  - Connection status (Active, Error, Syncing)
  - Organization scope
  - Last synced timestamp
  - Connected user/account
- **AND** the page SHALL display "Add Connection" button

#### Scenario: Connection data source is correct
- **WHEN** the Connections page component renders
- **THEN** the component SHALL retrieve data from `connections` store only
- **AND** the component SHALL NOT retrieve data from `automations` store
- **AND** the component SHALL NOT display automation detection results

## MODIFIED Requirements

### Requirement: Route Configuration
The application routing SHALL not include routes for non-functional pages.

#### Scenario: Security route removed from configuration
- **WHEN** the React Router configuration is loaded
- **THEN** the routes array SHALL NOT contain a route for `/security`
- **AND** attempting to navigate to `/security` SHALL trigger 404 handler
- **AND** no React component SHALL be imported for SecurityPage

#### Scenario: Analytics route removed from configuration
- **WHEN** the React Router configuration is loaded
- **THEN** the routes array SHALL NOT contain a route for `/analytics`
- **AND** attempting to navigate to `/analytics` SHALL trigger 404 handler
- **AND** no React component SHALL be imported for AnalyticsPage

#### Scenario: All other routes remain functional
- **WHEN** the route configuration is updated
- **THEN** the following routes SHALL remain functional:
  - `/` (Landing page)
  - `/login` (Login page)
  - `/dashboard` (Dashboard page)
  - `/connections` (Connections page)
  - `/connections/:id` (Connection details)
  - `/automations` (Automations page)
  - `/settings` (Settings page)
  - `/profile` (User profile)
  - `/oauth/callback` (OAuth callback handler)
- **AND** all protected routes SHALL require authentication
- **AND** all routes SHALL maintain existing authorization rules

## ADDED Requirements

### Requirement: Navigation Testing
The system SHALL include automated tests verifying the updated navigation structure.

#### Scenario: Sidebar navigation tests pass
- **WHEN** the Sidebar component test suite runs
- **THEN** tests SHALL verify Security link is not rendered
- **AND** tests SHALL verify Analytics link is not rendered
- **AND** tests SHALL verify Automations badge displays correct count
- **AND** tests SHALL verify Connections badge displays correct count
- **AND** tests SHALL verify keyboard navigation works for all items
- **AND** all existing Sidebar tests SHALL continue to pass

#### Scenario: Routing tests pass
- **WHEN** the routing test suite runs
- **THEN** tests SHALL verify `/security` returns 404
- **AND** tests SHALL verify `/analytics` returns 404
- **AND** tests SHALL verify all remaining routes work correctly
- **AND** all existing routing tests SHALL continue to pass

#### Scenario: Page component tests pass
- **WHEN** the AutomationsPage test suite runs
- **THEN** tests SHALL verify only automation data displayed
- **AND** tests SHALL verify no connection data displayed
- **AND** tests SHALL verify empty state renders correctly
- **AND** tests SHALL verify data source is `automations` store
- **WHEN** the ConnectionsPage test suite runs
- **THEN** tests SHALL verify only connection data displayed
- **AND** tests SHALL verify no automation data displayed

#### Scenario: Accessibility tests pass
- **WHEN** the accessibility test suite runs
- **THEN** tests SHALL verify navigation has no WCAG violations
- **AND** tests SHALL verify all navigation items have proper ARIA labels
- **AND** tests SHALL verify keyboard navigation works
- **AND** tests SHALL verify screen reader compatibility
- **AND** all existing accessibility tests SHALL continue to pass

### Requirement: TypeScript Compilation
The system SHALL maintain TypeScript strict mode compliance after navigation changes.

#### Scenario: TypeScript compiles without errors
- **WHEN** TypeScript compiler runs (`tsc --noEmit`)
- **THEN** compilation SHALL complete without errors
- **AND** no unused imports SHALL remain
- **AND** all navigation item types SHALL match interface definitions
- **AND** all badge count types SHALL be correct (number | undefined)

#### Scenario: No new type assertions
- **WHEN** the code changes are reviewed
- **THEN** no new `@ts-ignore` comments SHALL be added
- **AND** no new `as any` type assertions SHALL be used
- **AND** all type inference SHALL work correctly

### Requirement: Documentation Updates
The system documentation SHALL reflect the updated navigation structure.

#### Scenario: User guide updated
- **WHEN** the user guide is reviewed
- **THEN** navigation screenshots SHALL show updated 3-tab structure
- **AND** text descriptions SHALL match actual navigation items
- **AND** no references to Security or Analytics pages SHALL exist
- **AND** Connections vs Automations distinction SHALL be clearly explained

#### Scenario: Changelog entry added
- **WHEN** the CHANGELOG.md file is reviewed
- **THEN** an entry SHALL describe the navigation restructure
- **AND** the entry SHALL explain removal of Security and Analytics links
- **AND** the entry SHALL explain separation of Connections and Automations
- **AND** the entry SHALL follow conventional changelog format
