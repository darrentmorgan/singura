# Vendor Grouping API

## ADDED Requirements

### Requirement: Optional Grouping Query Parameter
The `/api/automations` endpoint MUST support an optional `groupBy=vendor` query parameter to return grouped results.

#### Scenario: Default ungrouped behavior
- **WHEN** client requests `GET /api/automations` without groupBy parameter
- **THEN** API SHALL return ungrouped automation list (default behavior unchanged)
- **AND** `grouped` field SHALL be false or omitted
- **AND** response time SHALL be < 100ms for 100 automations

#### Scenario: Grouped response when parameter specified
- **WHEN** client requests `GET /api/automations?groupBy=vendor`
- **THEN** API SHALL return vendor-grouped response
- **AND** `grouped` field SHALL be true
- **AND** `groupBy` field SHALL be "vendor"
- **AND** response SHALL include `vendorGroups` array
- **AND** response time SHALL be < 110ms (< 10ms overhead)

#### Scenario: Invalid groupBy value rejected
- **WHEN** client requests `GET /api/automations?groupBy=invalid`
- **THEN** API SHALL return 400 Bad Request
- **AND** error message SHALL explain valid `groupBy` values

---

### Requirement: Grouped Response Structure
When `groupBy=vendor` is specified, the API MUST return a structured grouped response with vendor metadata and individual applications.

#### Scenario: Vendor group structure
- **WHEN** client requests grouped view
- **AND** "Attio" vendor has 2 OAuth apps
- **THEN** response SHALL include vendor group with:
  - `vendorName: "Attio"`
  - `platform: "google"`
  - `applicationCount: 2`
  - `highestRiskLevel: "medium"` or "high"
  - `lastSeen`: ISO 8601 timestamp (most recent)
  - `applications`: array of 2 OAuth apps

#### Scenario: Individual app details preserved
- **WHEN** vendor group is returned
- **THEN** each application in `applications` array SHALL include:
  - `id`: automation UUID
  - `name`: OAuth app name
  - `metadata`: object with `clientId`, `scopeCount`, `scopes`
  - `riskLevel`: individual app risk level
  - `lastSeen`: individual app timestamp

#### Scenario: Pagination metadata included
- **WHEN** grouped response is returned
- **THEN** response SHALL include pagination object with:
  - `page`: current page number
  - `limit`: items per page
  - `total`: total number of vendor groups (not total apps)

---

### Requirement: Vendor Aggregation Logic
The system MUST aggregate OAuth applications by `vendor_name` and `platform_type` with proper risk level ordering.

#### Scenario: Risk level aggregation
- **WHEN** vendor "Attio" has apps with risk levels ["low", "high"]
- **THEN** vendor group SHALL show `highestRiskLevel: "high"`
- **AND** risk ordering SHALL be: critical > high > medium > low

#### Scenario: Last seen timestamp aggregation
- **WHEN** vendor "Attio" has apps last seen at different times
- **THEN** vendor group SHALL show most recent `lastSeen` timestamp
- **AND** timestamp SHALL be in ISO 8601 format

#### Scenario: Application count accuracy
- **WHEN** vendor "Attio" has 2 OAuth apps
- **THEN** vendor group SHALL show `applicationCount: 2`
- **AND** `applications` array SHALL have length 2

---

### Requirement: Database Query Performance
Grouped queries MUST use database indexes and meet performance benchmarks.

#### Scenario: Query uses vendor indexes
- **WHEN** grouped query is executed
- **THEN** database query SHALL use `idx_discovered_automations_vendor_name` index
- **AND** query plan (EXPLAIN) SHALL show index scan, not sequential scan
- **AND** query SHALL use `GROUP BY vendor_name, platform_type`

#### Scenario: Performance overhead acceptable
- **WHEN** grouped query processes 100 automations
- **THEN** response time SHALL be < 110ms
- **AND** overhead vs ungrouped SHALL be < 10ms
- **AND** no N+1 query problems SHALL occur

---

### Requirement: Application Sorting Within Groups
Individual applications within each vendor group SHALL be sorted by scope count descending.

#### Scenario: Apps sorted by permissions
- **WHEN** vendor "Attio" has apps with scopeCounts [3, 8]
- **THEN** `applications` array SHALL have app with 8 scopes first
- **AND** app with 3 scopes SHALL be second
- **AND** sorting SHALL be consistent across requests

---

### Requirement: Filter Compatibility
Existing query filters MUST work correctly with vendor grouping.

#### Scenario: Platform filter with grouping
- **WHEN** client requests `GET /api/automations?groupBy=vendor&platform=google`
- **THEN** response SHALL only include vendor groups from Google platform
- **AND** Microsoft and Slack vendors SHALL be excluded

#### Scenario: Risk filter with grouping
- **WHEN** client requests `GET /api/automations?groupBy=vendor&riskLevel=high`
- **THEN** response SHALL only include vendor groups with apps having high risk
- **AND** vendor groups with only low/medium risk SHALL be excluded

---

### Requirement: Backward Compatibility
The API MUST maintain backward compatibility with existing clients that don't use grouping.

#### Scenario: Existing clients unaffected
- **WHEN** existing client requests `GET /api/automations` (no groupBy)
- **THEN** response format SHALL remain unchanged from v1.0
- **AND** response SHALL include `automations` array (not `vendorGroups`)
- **AND** no breaking changes SHALL be introduced

---

### Requirement: Null Vendor Handling
OAuth apps without vendor names MUST be handled gracefully in grouped responses.

#### Scenario: Null vendor exclusion
- **WHEN** some OAuth apps have `vendor_name = NULL`
- **AND** client requests grouped view
- **THEN** apps with NULL vendor_name SHALL be excluded from grouped response
- **AND** these apps SHALL still appear in ungrouped view

---

### Requirement: Authorization and Security
Grouped queries MUST enforce organization-level authorization and RLS policies.

#### Scenario: Organization isolation enforced
- **WHEN** user from Org A requests grouped view
- **THEN** response SHALL only include automations from Org A
- **AND** automations from other orgs SHALL NOT be visible
- **AND** PostgreSQL RLS policies SHALL be enforced

#### Scenario: Vendor grouping preserves audit trail
- **WHEN** vendor group is displayed
- **THEN** individual automation IDs SHALL be preserved
- **AND** actions (revoke, update) SHALL be tracked per automation ID
- **AND** audit logs SHALL reference individual automation, not vendor group
