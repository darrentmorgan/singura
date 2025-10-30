# MCP Integration Capability

## ADDED Requirements

### Requirement: mcp-builder must scaffold functional MCP servers

The system SHALL provide mcp-builder skill that generates production-ready MCP servers with proper TypeScript setup, tool registration, and error handling.

#### Scenario: Create Supabase MCP server in under 5 minutes

**Given** developer needs to integrate Supabase API  
**When** they use mcp-builder to scaffold Supabase MCP server  
**Then** a functional server is generated with TypeScript SDK, Zod schemas, and example tools in <5 minutes

#### Scenario: Generated MCP server passes quality evaluation

**Given** MCP server scaffolded by mcp-builder  
**When** quality evaluation tests run  
**Then** server handles tool calls correctly, validates inputs, and returns proper responses

### Requirement: MCP servers must integrate with mcp.json configuration

The system SHALL provide clear process for adding new MCP servers to project configuration.

#### Scenario: Add new MCP server to mcp.json

**Given** developer has created a new MCP server  
**When** they follow integration guide  
**Then** server is added to mcp.json with proper command, args, and description

#### Scenario: MCP server loads successfully in Claude Code

**Given** MCP server added to mcp.json  
**When** Claude Code starts  
**Then** server tools are available and functional

### Requirement: mcp-builder must include Singura-specific examples

mcp-builder SHALL provide reference implementations for common Singura integrations.

#### Scenario: Scaffold Supabase MCP server with Singura patterns

**Given** developer uses mcp-builder with Supabase template  
**When** server is generated  
**Then** it includes Row Level Security examples, migration tools, and query builders specific to Singura's database schema

## ADDED Requirements

### Requirement: MCP servers must follow security best practices

Generated MCP servers SHALL include input validation, error handling, and secure API key management.

#### Scenario: MCP server validates tool inputs with Zod

**Given** MCP server receives tool call with invalid parameters  
**When** validation runs  
**Then** server rejects request with clear error message before calling external API

#### Scenario: MCP server handles API errors gracefully

**Given** external API returns error response  
**When** MCP server processes error  
**Then** it logs error details and returns user-friendly error message without exposing secrets
