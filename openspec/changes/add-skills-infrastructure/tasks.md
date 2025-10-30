## Phase 1: Foundation (Week 1)

- [x] 1.1 Download mcp-builder skill from Anthropic repository
- [x] 1.2 Adapt mcp-builder for Singura's TypeScript patterns
- [x] 1.3 Create `.claude/skills/mcp-builder/` directory structure
- [ ] 1.4 Add Singura-specific examples to mcp-builder (Supabase, ClickUp)
- [ ] 1.5 Enhance skill-creator with Singura OAuth patterns
- [ ] 1.6 Add detection algorithm skill template to skill-creator
- [x] 1.7 Create `.claude/skills/README.md` with skill catalog
- [ ] 1.8 Document skill vs agent decision matrix in CLAUDE.md
- [ ] 1.9 Create skill validation script (`scripts/validate-skill.sh`)
- [ ] 1.10 Test both skills with sample creations

## Phase 2: Templates & Examples (Week 2)

- [ ] 2.1 Create Supabase MCP server using mcp-builder
- [ ] 2.2 Create ClickUp MCP server using mcp-builder
- [ ] 2.3 Add MCP servers to mcp.json configuration
- [ ] 2.4 Test MCP servers with real API calls
- [ ] 2.5 Create "api-integration-skill" template
- [ ] 2.6 Create "testing-workflow-skill" template
- [ ] 2.7 Create "security-audit-skill" template
- [ ] 2.8 Document each template's use cases
- [ ] 2.9 Add skill testing to CI/CD pipeline
- [ ] 2.10 Create skill contribution guide

## Validation & Documentation

- [ ] V.1 Run `openspec validate add-skills-infrastructure --strict`
- [ ] V.2 Verify mcp-builder can scaffold a server in <5 min
- [ ] V.3 Test skill-creator generates valid skills
- [ ] V.4 Confirm MCP servers integrate with mcp.json
- [ ] V.5 Update CLAUDE.md with skills section
- [ ] V.6 Create skills usage guide for team
