# Vendor Extraction

## ADDED Requirements

### Requirement: Extract Vendor Name from Display Text
The system MUST extract a vendor name from an OAuth application's display text using pattern matching.

The extraction SHALL remove common suffixes (OAuth, API, App, "for Google Workspace") and domain extensions (.com, .io, .ai, .net, .org), then return the first word from the cleaned text if it's at least 3 characters long.

#### Scenario: Simple vendor name extraction
- **WHEN** OAuth app has `displayText = "Attio"`
- **THEN** vendor extraction SHALL return "Attio"
- **AND** vendor group SHALL be "attio-google" for Google platform

#### Scenario: Compound vendor name extraction
- **WHEN** OAuth app has `displayText = "Attio CRM"`
- **THEN** vendor extraction SHALL return "Attio" (first word only)
- **AND** vendor group SHALL be "attio-google"

#### Scenario: Domain name extraction
- **WHEN** OAuth app has `displayText = "attio.com"`
- **THEN** vendor extraction SHALL remove domain extension
- **AND** vendor extraction SHALL return "attio" (lowercase normalized)
- **AND** vendor group SHALL be "attio-google"

#### Scenario: Vendor name with suffix
- **WHEN** OAuth app has `displayText = "Slack for Google Workspace"`
- **THEN** vendor extraction SHALL remove suffix "for Google Workspace"
- **AND** vendor extraction SHALL return "Slack"
- **AND** vendor group SHALL be "slack-google"

#### Scenario: Generic OAuth app name
- **WHEN** OAuth app has `displayText = "OAuth App: 12345"`
- **THEN** vendor extraction SHALL return null (no vendor identified)
- **AND** vendor group SHALL be null

#### Scenario: Empty or short display text
- **WHEN** OAuth app has `displayText = ""` or `displayText = "AB"` (< 3 chars)
- **THEN** vendor extraction SHALL return null
- **AND** vendor group SHALL be null

#### Scenario: Null display text handling
- **WHEN** OAuth app has `displayText = null`
- **THEN** vendor extraction SHALL return null
- **AND** no error SHALL be thrown

---

### Requirement: Vendor Name Validation
The system MUST validate extracted vendor names meet minimum quality standards.

#### Scenario: Minimum length validation
- **WHEN** extracted vendor name has length < 3 characters
- **THEN** extraction SHALL return null
- **AND** vendor SHALL NOT be stored in database

#### Scenario: Whitespace trimming
- **WHEN** extracted vendor name has leading/trailing whitespace
- **THEN** extraction SHALL trim whitespace before validation
- **AND** vendor name SHALL be stored without whitespace

---

### Requirement: Vendor Extraction Accuracy
The vendor extraction utility MUST achieve ≥90% accuracy on real-world OAuth application names.

#### Scenario: Extraction accuracy measurement
- **WHEN** vendor extraction runs on sample dataset of 100 OAuth apps
- **THEN** extraction SHALL successfully identify vendor name in ≥90 apps
- **AND** extraction failures SHALL be logged for monitoring
- **AND** extraction SHALL provide consistent results for same input

---

### Requirement: Vendor Group Generation
The system MUST generate a vendor group identifier combining vendor name and platform.

#### Scenario: Vendor group format
- **WHEN** vendor name is "Attio" and platform is "google"
- **THEN** vendor group SHALL be "attio-google" (lowercase)
- **AND** vendor group SHALL be null if vendor name is null

---

### Requirement: Vendor Field Persistence
The system MUST persist vendor name and vendor group in the discovered_automations table.

#### Scenario: Vendor fields populated during discovery
- **WHEN** OAuth discovery runs
- **THEN** each discovered automation SHALL have vendor_name populated
- **AND** each discovered automation SHALL have vendor_group populated
- **AND** database indexes SHALL be used for vendor queries

#### Scenario: Existing automation backfill
- **WHEN** backfill script runs on existing automations
- **THEN** vendor_name SHALL be extracted from existing name field
- **AND** vendor_group SHALL be generated
- **AND** script SHALL log success/failure counts
- **AND** script SHALL be idempotent (safe to run multiple times)

---

## Performance Requirements

### Requirement: Extraction Performance
Vendor extraction MUST meet performance benchmarks to avoid discovery slowdown.

#### Scenario: Extraction speed
- **WHEN** vendor extraction processes 1000 OAuth applications
- **THEN** total extraction time SHALL be < 1 second
- **AND** memory usage SHALL be < 1MB
- **AND** extraction SHALL NOT block discovery process
