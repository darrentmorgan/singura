# Vendor Grouping UI

## ADDED Requirements

### Requirement: Group by Vendor Toggle
The automation list MUST include a toggle switch to enable/disable vendor grouping with state persistence.

#### Scenario: Toggle in header
- **WHEN** user views automation list page
- **THEN** header SHALL display "Group by Vendor" toggle switch
- **AND** toggle SHALL be positioned in top-right of list header
- **AND** toggle default state SHALL be OFF (ungrouped view)

#### Scenario: Toggle switches views
- **WHEN** user clicks toggle to ON position
- **THEN** API request SHALL include `?groupBy=vendor` parameter
- **AND** UI SHALL transition to grouped view within 200ms
- **AND** loading state SHALL be shown during transition

#### Scenario: Toggle state persists
- **WHEN** user enables vendor grouping
- **AND** user navigates away from automations page
- **AND** user returns to automations page
- **THEN** vendor grouping SHALL still be enabled
- **AND** toggle state SHALL be stored in localStorage

#### Scenario: Toggle accessibility
- **WHEN** user navigates with keyboard
- **THEN** toggle SHALL be reachable via Tab key
- **AND** Space or Enter SHALL activate toggle
- **AND** toggle SHALL have appropriate ARIA labels

---

### Requirement: Vendor Group Card Component
Each vendor group MUST be displayed as an expandable/collapsible card showing vendor metadata and risk level.

#### Scenario: Collapsed card display
- **WHEN** vendor group is displayed in collapsed state
- **THEN** card SHALL show:
  - Vendor name prominently (18px, semibold)
  - Application count (e.g., "2 applications")
  - Platform icon and label (Google, Microsoft, Slack)
  - Highest risk level badge with color coding
  - Last seen timestamp (relative time, e.g., "2 hours ago")
  - Chevron icon indicating expandable state

#### Scenario: Risk level badge coloring
- **WHEN** vendor has `highestRiskLevel = "critical"`
- **THEN** badge SHALL be red (red-600 text, red-50 background)
- **WHEN** `highestRiskLevel = "high"`
- **THEN** badge SHALL be orange (orange-600 text, orange-50 background)
- **WHEN** `highestRiskLevel = "medium"`
- **THEN** badge SHALL be yellow (yellow-600 text, yellow-50 background)
- **WHEN** `highestRiskLevel = "low"`
- **THEN** badge SHALL be green (green-600 text, green-50 background)

#### Scenario: Card expand interaction
- **WHEN** user clicks on vendor card header
- **THEN** card SHALL expand with smooth animation (150ms)
- **AND** individual OAuth applications SHALL be revealed
- **AND** chevron icon SHALL rotate 180 degrees
- **AND** card SHALL set `aria-expanded="true"`

#### Scenario: Card collapse interaction
- **WHEN** user clicks on expanded vendor card header
- **THEN** card SHALL collapse with smooth animation (150ms)
- **AND** individual applications SHALL be hidden
- **AND** chevron icon SHALL rotate back to original position
- **AND** card SHALL set `aria-expanded="false"`

---

### Requirement: Individual Application Display
When a vendor group is expanded, individual OAuth applications MUST be visible with full details.

#### Scenario: Individual app layout
- **WHEN** vendor group is expanded
- **THEN** each individual app SHALL display:
  - App name
  - Permission count (e.g., "8 permissions")
  - Client ID (truncated if > 40 chars)
  - Individual risk level badge
  - Left border for visual grouping (24px indent)

#### Scenario: Apps sorted by permissions
- **WHEN** vendor has apps with different scopeCounts
- **THEN** apps SHALL be sorted by scopeCount descending
- **AND** app with most permissions SHALL appear first

#### Scenario: Individual app click action
- **WHEN** user clicks on individual application
- **THEN** existing automation detail modal SHALL open
- **AND** modal SHALL show full OAuth app details
- **AND** user SHALL be able to revoke token from modal

---

### Requirement: Responsive Design
Vendor grouping UI MUST work correctly on all screen sizes without horizontal scrolling.

#### Scenario: Mobile layout
- **WHEN** viewport width < 768px
- **THEN** toggle SHALL appear above automation list
- **AND** vendor cards SHALL stack vertically (single column)
- **AND** card headers SHALL have minimum 44px touch target height
- **AND** no horizontal scrolling SHALL occur

#### Scenario: Tablet layout
- **WHEN** viewport width between 768px and 1024px
- **THEN** toggle SHALL appear in header
- **AND** vendor cards SHALL display in 2-column grid
- **AND** cards SHALL resize to fit container

#### Scenario: Desktop layout
- **WHEN** viewport width > 1024px
- **THEN** toggle SHALL appear in header
- **AND** vendor cards SHALL display in 3-column grid
- **AND** cards SHALL maintain consistent sizing

---

### Requirement: Empty State Handling
Empty states MUST be handled gracefully with helpful messaging.

#### Scenario: No vendor groups found
- **WHEN** user enables grouping
- **AND** no vendor groups exist
- **THEN** UI SHALL display "No automations found" message
- **AND** message SHALL guide user to connect platforms
- **AND** CTA button SHALL link to connections page

#### Scenario: Loading state
- **WHEN** grouped data is being fetched
- **THEN** UI SHALL display skeleton loading cards
- **AND** skeleton cards SHALL match vendor card layout
- **AND** previous content SHALL remain visible until new data loads

#### Scenario: Error state
- **WHEN** API request fails
- **THEN** UI SHALL display error message
- **AND** error SHALL include "Retry" button
- **AND** toggle SHALL remain in current position

---

### Requirement: Performance Requirements
UI interactions MUST be performant and smooth without blocking.

#### Scenario: Toggle response time
- **WHEN** user clicks toggle
- **THEN** toggle visual state SHALL update within 50ms
- **AND** API call SHALL not block UI

#### Scenario: View transition speed
- **WHEN** switching between grouped and ungrouped views
- **THEN** transition animation SHALL complete within 200ms
- **AND** no UI flickering SHALL occur

#### Scenario: Expand/collapse animation
- **WHEN** user expands or collapses vendor card
- **THEN** animation SHALL complete within 150ms
- **AND** animation SHALL use CSS transitions (not JavaScript)

#### Scenario: Large list performance
- **WHEN** displaying > 50 vendor groups
- **THEN** virtualization SHALL be implemented
- **AND** scrolling SHALL remain smooth (60 FPS)
- **AND** only visible cards SHALL be rendered

---

### Requirement: Accessibility (WCAG 2.1 AA)
Vendor grouping UI MUST meet accessibility standards for keyboard navigation and screen readers.

#### Scenario: Keyboard navigation
- **WHEN** user navigates with keyboard
- **THEN** Tab key SHALL move focus to toggle, then vendor cards
- **AND** Enter or Space on card SHALL expand/collapse
- **AND** Tab within expanded card SHALL focus individual apps
- **AND** focus indicators SHALL be clearly visible

#### Scenario: Screen reader announcements
- **WHEN** screen reader is active
- **AND** vendor card receives focus
- **THEN** screen reader SHALL announce:
  - "Attio, 2 applications, high risk, last seen 2 hours ago, button, collapsed"
- **WHEN** user expands card
- **THEN** screen reader SHALL announce:
  - "Attio, expanded, showing 2 applications"

#### Scenario: ARIA attributes
- **WHEN** vendor card is rendered
- **THEN** card SHALL have `role="button"`
- **AND** card SHALL have `aria-expanded="false"` when collapsed
- **AND** card SHALL have `aria-expanded="true"` when expanded
- **AND** card SHALL have `aria-controls="vendor-apps-{vendorName}"`
- **AND** app list SHALL have `id="vendor-apps-{vendorName}"`

#### Scenario: Color contrast
- **WHEN** risk level badges are displayed
- **THEN** text-to-background contrast SHALL be ≥ 4.5:1
- **AND** color SHALL not be sole indicator of risk
- **AND** risk level text SHALL be included

---

### Requirement: State Management
UI state MUST be managed consistently with Zustand store and localStorage.

#### Scenario: Store state structure
- **WHEN** automation store is initialized
- **THEN** store SHALL include `groupByVendor: boolean` state
- **AND** store SHALL include `setGroupByVendor(enabled: boolean)` action

#### Scenario: Toggle updates store
- **WHEN** user toggles vendor grouping
- **THEN** store action `setGroupByVendor()` SHALL be called
- **AND** API call SHALL use updated state
- **AND** localStorage SHALL be updated with new state

#### Scenario: Expanded state management
- **WHEN** user expands vendor card
- **THEN** expanded state SHALL be managed in component local state
- **AND** expanded state SHALL NOT persist across page refreshes
- **AND** all cards SHALL be collapsed by default on page load

---

### Requirement: Backward Compatibility
Grouped view MUST coexist with ungrouped view without breaking existing functionality.

#### Scenario: Ungrouped view unchanged
- **WHEN** toggle is OFF
- **THEN** automation list SHALL display exactly as before
- **AND** existing AutomationCard components SHALL be used
- **AND** all existing functionality SHALL work (filter, sort, revoke)

#### Scenario: Both views use same actions
- **WHEN** user revokes token in either view
- **THEN** same API endpoint SHALL be called
- **AND** same success/error handling SHALL occur
- **AND** list SHALL refresh after revocation
