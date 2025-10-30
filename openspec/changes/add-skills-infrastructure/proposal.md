# Proposal: Add Skills Infrastructure for Project Extension

## Problem Statement

Singura currently has limited extensibility mechanisms for adding new capabilities. While we have a basic skill-creator skill and sub-agent system, there's no structured way to:

1. **Create project-specific skills** that encode Singura's domain knowledge, workflows, and patterns
2. **Build MCP servers** to integrate external APIs and services (currently only chrome-devtools MCP is configured)
3. **Manage skill lifecycle** from creation to deployment with validation and testing
4. **Document skill usage** for team collaboration and knowledge sharing

This limits our ability to:
- Encode Singura-specific security patterns, OAuth flows, and detection algorithms as reusable skills
- Rapidly integrate new external services (Supabase, ClickUp, monitoring tools) via MCP servers
- Share domain expertise across team members through well-documented skills
- Maintain consistency in how specialized tasks (DB migrations, testing, deployment) are performed

## Proposed Solution

Implement a comprehensive skills infrastructure that includes:

### 1. Enhanced skill-creator (Meta-Skill)
Enhance the existing skill-creator with:
- **Singura-specific patterns**: OAuth integration, detection algorithms, TypeScript strict mode
- **Template library**: Pre-built templates for common Singura skill types (API integration, testing, security)
- **Validation workflows**: Automated validation of skills against project conventions
- **Documentation generator**: Auto-generate skill usage docs from SKILL.md files

### 2. mcp-builder Skill (Technical Skill)
Add new mcp-builder skill for creating MCP servers:
- **TypeScript MCP SDK guidance**: Best practices for Node.js MCP server development
- **Transport layer setup**: stdio, SSE, and HTTP transport configurations
- **Tool registration patterns**: Zod schemas, input validation, error handling
- **Singura integration**: How to wire MCP servers into mcp.json and test locally
- **Reference implementations**: Example MCP servers for common integrations (Supabase, monitoring APIs)
- **Quality evaluation**: Testing frameworks to validate MCP server effectiveness

### 3. Skill Management Workflow
Establish processes for:
- **Skill discovery**: Document all available skills in `.claude/skills/README.md`
- **Skill testing**: Validation scripts to ensure skills work correctly
- **MCP configuration management**: Version control for mcp.json with validation
- **Skill versioning**: Semantic versioning for skill updates

### 4. Integration with Existing Systems
- **Sub-agent alignment**: Skills complement (not replace) specialized agents
- **CLAUDE.md integration**: Reference skills in development guide
- **OpenSpec workflow**: Use skills during spec creation and implementation

## Success Criteria

1. **skill-creator enhanced**:
   - Includes 3+ Singura-specific skill templates
   - Automated validation catches common errors
   - Documentation generation produces consistent output

2. **mcp-builder operational**:
   - Can scaffold a functional MCP server in <5 minutes
   - Generated servers pass quality evaluation tests
   - Clear integration path from scaffold to mcp.json

3. **Skill ecosystem established**:
   - At least 5 project-specific skills created and documented
   - Team can create new skills without external guidance
   - MCP server library includes 2+ production servers

4. **Measurable improvements**:
   - 50% reduction in time to integrate new external services
   - Zero skill-related errors in production (validation catches issues)
   - 100% of common workflows documented as skills

## Scope & Phasing

### Phase 1: Foundation (Week 1)
- Enhance skill-creator with Singura patterns
- Add mcp-builder skill from Anthropic repository
- Create skill management documentation

### Phase 2: Templates & Examples (Week 2)
- Create 3 skill templates (API integration, testing workflow, security audit)
- Build 2 example MCP servers (Supabase client, ClickUp integration)
- Establish validation and testing workflows

### Phase 3: Ecosystem Development (Ongoing)
- Continuously add project-specific skills as needs arise
- Maintain MCP server library
- Refine templates based on usage patterns

## Alternatives Considered

1. **Sub-agent only approach**: Rejected because agents are for complex tasks, skills are for procedural knowledge and tool integration
2. **Manual documentation**: Rejected because skills provide progressive disclosure and context efficiency
3. **External skill marketplace**: Rejected as too complex for current needs; focus on project-specific skills first

## Dependencies

- Existing skill-creator skill in `.claude/skills/skill-creator/`
- mcp.json configuration system
- Access to Anthropic skills repository for mcp-builder reference

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Skill proliferation without quality control | Implement validation scripts and review process |
| MCP servers introduce security vulnerabilities | Mandatory security review for all MCP integrations |
| Skills duplicate agent functionality | Clear guidelines on when to use skills vs agents |
| Maintenance burden as skills grow | Deprecation policy and automated testing |

## Out of Scope

- Pre-built document skills (DOCX, PDF, PPTX, XLSX) - not needed for Singura's core use case
- Skills for creative/design tasks (art generation, Slack GIFs) - not relevant to enterprise security platform
- Complete overhaul of existing agent system - skills complement, not replace, agents
