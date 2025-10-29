# Capability: Automation Metadata Display

## Overview

Enable security analysts to view comprehensive automation metadata directly in the automation details modal without needing database access or external tools.

## ADDED Requirements

### Requirement: System SHALL display OAuth authorization context in Permissions tab

The system SHALL display complete OAuth authorization information for automations discovered via OAuth tokens API.

#### Scenario: View OAuth app authorization details

**Given** an automation detected via Google OAuth tokens API (e.g., "Google Chrome" OAuth app)
**When** analyst opens automation details modal and selects Permissions tab
**Then** system displays OAuth Authorization card showing:
- Authorized by user email (e.g., "jess@baliluxurystays.com")
- OAuth client ID (e.g., "77185425430.apps.googleusercontent.com")
- First authorization timestamp with formatted date
- Last activity timestamp with formatted date
- Authorization age in days (e.g., "151 days")

**And** card layout uses 2-column grid for readability
**And** all timestamps formatted as "MMM DD, YYYY HH:MM AM/PM"

---

### Requirement: System SHALL display granted OAuth scopes list

The system SHALL display all OAuth scopes granted to an automation to enable security analysts to assess data access risks.

#### Scenario: View OAuth scopes for Google OAuth app

**Given** an automation with 1+ granted OAuth scopes
**When** analyst opens Permissions tab
**Then** system displays "Granted Scopes" card with:
- Scope count in card title (e.g., "Granted Scopes (15)")
- Each scope rendered as code block with monospace font
- OAuth 2.0 badge next to each scope
- Scrollable list when >10 scopes

**And** scopes extracted from `platform_metadata.scopes` array

#### Scenario: No OAuth scopes available

**Given** an automation discovered via non-OAuth method (e.g., Apps Script via Drive API)
**When** analyst opens Permissions tab
**Then** system displays informative empty state with:
- Lock icon
- Message: "No OAuth permission data available"
- Suggestion: "This automation was not detected via OAuth tokens. Try the Detection tab for discovery details."

---

### Requirement: System SHALL display AI detection evidence

The system SHALL display confidence scores and detection patterns to enable security analysts to validate AI agent discoveries.

#### Scenario: View detection confidence for high-confidence automation

**Given** an automation with ML detection confidence 95.8%
**When** analyst opens Detection tab
**Then** system displays Detection Confidence card showing:
- Progress bar at 95.8% fill with green color (>80%)
- Large confidence percentage "95.8%"
- Detection method (e.g., "oauth_tokens_api")
- Last updated timestamp

**And** progress bar color-coded:
- Green for >80% confidence
- Yellow for 50-80% confidence
- Red for <50% confidence

#### Scenario: View AI platform detection alert

**Given** an Apps Script automation integrating with OpenAI API
**When** analyst opens Detection tab
**Then** system displays destructive alert showing:
- Alert title: "AI Platform Detected"
- List of detected platforms (e.g., "OpenAI, Claude")
- Warning icon
- Red/destructive styling

**And** alert only appears when `platform_metadata.isAIPlatform === true`

#### Scenario: View detection pattern evidence

**Given** an automation detected via batch operation pattern (263 events in 3.9 second window)
**When** analyst opens Detection tab
**Then** system displays Detection Patterns card with each pattern showing:
- Pattern description (e.g., "Batch operation detected: 263 similar events")
- Event count (263)
- Time window in milliseconds (3983ms)
- Pattern confidence score (95.8%)

**And** patterns rendered in expandable/collapsible sections when >5 patterns
**And** patterns sorted by confidence score descending

---

### Requirement: System SHALL display technical automation metadata

The system SHALL display file, script, and ownership details to enable security analysts to understand automation implementation.

#### Scenario: View Apps Script technical details

**Given** an Apps Script automation with Drive metadata
**When** analyst opens Details tab
**Then** system displays Technical Details card showing:
- Script ID (e.g., "1a2b3c4d5e6f")
- Drive file ID
- Drive location/parent folder
- MIME type (e.g., "application/vnd.google-apps.script")
- Parent type (e.g., "folder", "domain")

**And** all fields use read-only format with copy-to-clipboard buttons

#### Scenario: View automation ownership information

**Given** an automation with multiple owners
**When** analyst opens Details tab
**Then** system displays Ownership card showing:
- All owner email addresses as comma-separated list
- Sharing status badge (Shared/Private)
- Number of owners in parentheses (e.g., "Owners (3)")

#### Scenario: View available functions and triggers

**Given** an Apps Script with callable functions
**When** analyst opens Details tab
**Then** system displays Functions & Triggers card showing:
- Each function name as outlined badge
- Each trigger as outlined badge
- Tooltip on hover showing full function signature
- Empty state when no functions/triggers available

---

### Requirement: System SHALL gracefully handle missing metadata

The system SHALL provide specific, actionable empty states when metadata is unavailable rather than generic error messages.

#### Scenario: Automation discovered before metadata enrichment

**Given** an automation discovered before v2.0 (no detection_metadata)
**When** analyst opens Detection tab
**Then** system displays empty state with:
- Search icon
- Title: "No Detection Evidence"
- Message: "Detection metadata is only available for automations discovered after v2.0."
- No error in browser console

#### Scenario: Partial metadata available

**Given** an automation with OAuth context but no AI detection
**When** analyst switches between tabs
**Then**:
- Permissions tab displays OAuth data successfully
- Detection tab shows empty state for AI detection section only
- Other available data still renders normally

**And** each section handles null/undefined independently without affecting other sections

---

### Requirement: System SHALL update tab headers with data counts

The system SHALL display data availability indicators in tab headers to guide analyst navigation.

#### Scenario: Permissions tab count badge

**Given** an automation with 15 OAuth scopes
**When** modal renders
**Then** Permissions tab header shows "Permissions (15)"

**And** count updates dynamically if data refreshes

#### Scenario: Detection tab with evidence

**Given** an automation with AI platform detection
**When** modal renders
**Then** Detection tab header shows badge/indicator for available evidence

---

## MODIFIED Requirements

### Requirement: Automation details modal tab structure

The automation details modal SHALL display 5 tabs instead of the previous 4 tabs.

**Previous**: Modal had 4 tabs: Permissions, Risk, Feedback, Details

**Modified**: The system SHALL display 5 tabs in this order:
1. Permissions (OAuth authorization + scopes)
2. Detection (NEW - AI detection evidence)
3. Risk (existing risk analysis)
4. Feedback (existing user feedback)
5. Details (enhanced with technical metadata)

**And** tab order SHALL prioritize security-critical information (Permissions, Detection, Risk) before operational info (Feedback, Details)

#### Scenario: View modal with new Detection tab

**Given** analyst opens automation details modal
**When** modal renders
**Then** system displays 5 tabs in header: Permissions, Detection, Risk, Feedback, Details
**And** Detection tab appears between Permissions and Risk tabs
**And** all tabs are keyboard-navigable with arrow keys

---

## REMOVED Requirements

None. This change only adds capabilities, does not remove any existing functionality.

---

## Non-Functional Requirements

### Performance

- Modal load time must remain <500ms for automations with <100 metadata fields
- JSONB field extraction must not trigger additional database queries
- Frontend rendering must handle 1000+ scopes without UI lag

### Accessibility

- All new UI elements meet WCAG 2.1 AA standards
- Keyboard navigation works for all tabs and collapsible sections
- Screen readers announce tab changes and data loading states
- Color-coded confidence scores also use text labels (not color alone)

### Browser Compatibility

- Chrome 100+ (primary target)
- Firefox 100+
- Safari 15+
- Edge 100+
- No Internet Explorer support required

### Error Handling

- Graceful degradation when partial metadata available
- Specific empty states (not generic "No data")
- No uncaught exceptions in browser console
- Null-safe access to all JSONB fields

### Security

- No sensitive credentials (access tokens, refresh tokens) displayed
- Client IDs shown but not exploitable without secrets
- No PII beyond what's already visible in automation owner info

---

## Dependencies

**Internal**:
- Existing `discovered_automations` database schema (no changes needed)
- Existing `/api/automations/:id/details` API endpoint (minor enhancement)
- Existing `AutomationDetailsModal` component (refactor)

**External**:
- None

**Cross-capability**:
- None (standalone enhancement)

---

## Success Metrics

**Quantitative**:
- Zero "No data available" messages when `platform_metadata` is populated
- 27+ metadata fields displayed across all tabs
- 100% of OAuth apps show scope list
- 100% of AI detections show evidence
- <5% increase in modal load time

**Qualitative**:
- Security analysts report improved decision-making
- Reduction in database query requests from analysts
- Positive user feedback on data completeness
- No confusion about empty states vs missing data

---

## Open Questions

None. All requirements fully specified based on existing database schema analysis.

---

## Related Capabilities

**Future enhancements** (out of scope for this change):
- OAuth scope enrichment via external API
- Historical metadata change tracking
- Real-time WebSocket updates for detection confidence changes
- Bulk export of metadata for compliance reports
