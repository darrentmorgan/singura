# Skill Management Capability

## ADDED Requirements

### Requirement: Skills must be discoverable and documented

The system SHALL provide a centralized catalog of all available skills with metadata, use cases, and examples.

#### Scenario: Developer searches for authentication-related skills

**Given** the developer needs OAuth integration guidance  
**When** they open `.claude/skills/README.md`  
**Then** they see a categorized list of skills including "oauth-integration-skill" with description, triggers, and example usage

#### Scenario: skill-creator generates valid Singura-compliant skills

**Given** developer runs skill-creator with Singura template  
**When** skill is generated  
**Then** it includes YAML frontmatter, TypeScript patterns, and passes validation

### Requirement: Skills must complement (not duplicate) sub-agent functionality

The system SHALL provide clear guidelines on when to use skills vs when to delegate to specialized agents.

#### Scenario: Developer chooses between skill and agent for OAuth task

**Given** developer needs to integrate a new OAuth provider  
**When** they consult the skills vs agents decision matrix  
**Then** they see skills are for procedural OAuth patterns, agents are for actual OAuth implementation work

## ADDED Requirements

### Requirement: Skill templates must encode Singura-specific patterns

skill-creator SHALL include templates that follow Singura's conventions for OAuth, TypeScript strict mode, testing, and security.

#### Scenario: Create API integration skill from template

**Given** developer uses skill-creator with "api-integration" template  
**When** skill is generated  
**Then** it includes TypeScript strict mode examples, OAuth 2.0 patterns, and Zod validation schemas

### Requirement: Skills must be validated before deployment

The system SHALL validate skills against project conventions and catch common errors.

#### Scenario: Validation catches malformed SKILL.md

**Given** developer creates skill with invalid YAML frontmatter  
**When** validation script runs  
**Then** it reports specific errors and prevents deployment
