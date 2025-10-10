#!/bin/bash
# Test Claude Code Configuration Installation
# Verifies all hooks, agents, commands, and permissions are working

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Claude Code Configuration Test Suite${NC}"
echo "========================================"
echo ""

# Track results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Test 1: Directory Structure
echo -e "\n${YELLOW}Test 1: Directory Structure${NC}"
echo "----------------------------"

if [ -d ".claude" ]; then
    pass ".claude directory exists"
else
    fail ".claude directory not found"
    exit 1
fi

for dir in agents hooks commands docs logs scripts; do
    if [ -d ".claude/$dir" ]; then
        pass ".claude/$dir exists"
    else
        fail ".claude/$dir missing"
    fi
done

# Test 2: Configuration Files
echo -e "\n${YELLOW}Test 2: Configuration Files${NC}"
echo "----------------------------"

if [ -f ".claude/settings.local.json" ]; then
    pass "settings.local.json exists"

    # Validate JSON
    if jq empty .claude/settings.local.json 2>/dev/null; then
        pass "settings.local.json is valid JSON"
    else
        fail "settings.local.json has invalid JSON"
    fi
else
    fail "settings.local.json missing"
fi

if [ -f ".claude/agents/delegation-map.json" ]; then
    pass "delegation-map.json exists"

    if jq empty .claude/agents/delegation-map.json 2>/dev/null; then
        pass "delegation-map.json is valid JSON"
    else
        fail "delegation-map.json has invalid JSON"
    fi
else
    fail "delegation-map.json missing"
fi

# Test 3: Agent Configs
echo -e "\n${YELLOW}Test 3: Agent Configurations${NC}"
echo "------------------------------"

if [ -L ".claude/agents/configs" ]; then
    LINK_TARGET=$(readlink .claude/agents/configs)
    pass "Agent configs is a symlink to: $LINK_TARGET"

    if [ -d "$LINK_TARGET" ]; then
        pass "Symlink target exists (global sharing enabled)"
    else
        fail "Symlink target does not exist"
    fi
elif [ -d ".claude/agents/configs" ]; then
    pass "Agent configs directory exists (local mode)"
else
    fail "Agent configs missing"
fi

# Count agent config files
AGENT_COUNT=$(find .claude/agents/configs -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
if [ "$AGENT_COUNT" -gt 0 ]; then
    pass "Found $AGENT_COUNT agent config files"
else
    fail "No agent config files found"
fi

# Test 4: Hook Permissions
echo -e "\n${YELLOW}Test 4: Hook File Permissions${NC}"
echo "--------------------------------"

for hook in .claude/hooks/*.sh; do
    if [ -f "$hook" ]; then
        if [ -x "$hook" ]; then
            pass "$(basename $hook) is executable"
        else
            fail "$(basename $hook) is not executable - run: chmod +x $hook"
        fi
    fi
done

# Test 5: Hook Configuration
echo -e "\n${YELLOW}Test 5: Hook Configuration in settings.local.json${NC}"
echo "---------------------------------------------------"

HOOKS=$(jq -r '.hooks | keys[]' .claude/settings.local.json 2>/dev/null)
if [ -n "$HOOKS" ]; then
    pass "Hooks configured: $(echo $HOOKS | tr '\n' ', ')"
else
    fail "No hooks configured in settings.local.json"
fi

# Check specific hooks
if jq -e '.hooks.PostToolUse' .claude/settings.local.json >/dev/null 2>&1; then
    pass "PostToolUse hook configured"
else
    fail "PostToolUse hook not configured"
fi

if jq -e '.hooks.UserPromptSubmit' .claude/settings.local.json >/dev/null 2>&1; then
    pass "UserPromptSubmit hook configured"
else
    warn "UserPromptSubmit hook not configured (optional)"
fi

# Test 6: Permissions
echo -e "\n${YELLOW}Test 6: Permissions in settings.local.json${NC}"
echo "--------------------------------------------"

if jq -e '.permissions.allow[]' .claude/settings.local.json >/dev/null 2>&1; then
    ALLOWED=$(jq -r '.permissions.allow[]' .claude/settings.local.json | wc -l | tr -d ' ')
    pass "Found $ALLOWED allowed permissions"

    # Check specific permissions
    if jq -e '.permissions.allow[] | select(. | contains("Task"))' .claude/settings.local.json >/dev/null 2>&1; then
        pass "Task tool permission found (required for agents)"
    else
        fail "Task tool permission missing - agents won't work!"
    fi

    if jq -e '.permissions.allow[] | select(. | contains("git"))' .claude/settings.local.json >/dev/null 2>&1; then
        pass "Git permissions found"
    else
        warn "Git permissions not configured"
    fi
else
    fail "No permissions configured"
fi

# Test 7: Slash Commands
echo -e "\n${YELLOW}Test 7: Slash Commands${NC}"
echo "------------------------"

COMMAND_COUNT=$(find .claude/commands -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COMMAND_COUNT" -gt 0 ]; then
    pass "Found $COMMAND_COUNT slash commands"

    for cmd in .claude/commands/*.md; do
        CMD_NAME=$(basename "$cmd" .md)
        info "  /$CMD_NAME"
    done
else
    warn "No slash commands found"
fi

# Test 8: Placeholder Replacement
echo -e "\n${YELLOW}Test 8: Placeholder Replacement${NC}"
echo "----------------------------------"

if grep -r "{{PKG_MANAGER}}" .claude/ 2>/dev/null; then
    fail "Found unreplaced {{PKG_MANAGER}} placeholders"
else
    pass "No {{PKG_MANAGER}} placeholders found"
fi

if grep -r "{{PROJECT_NAME}}" .claude/ 2>/dev/null; then
    fail "Found unreplaced {{PROJECT_NAME}} placeholders"
else
    pass "No {{PROJECT_NAME}} placeholders found"
fi

if grep -r "{{FRAMEWORK}}" .claude/ 2>/dev/null; then
    fail "Found unreplaced {{FRAMEWORK}} placeholders"
else
    pass "No {{FRAMEWORK}} placeholders found"
fi

# Test 9: Global CLAUDE.md Integration
echo -e "\n${YELLOW}Test 9: Global CLAUDE.md Integration${NC}"
echo "---------------------------------------"

if [ -f "$HOME/.claude/CLAUDE.md" ]; then
    pass "Global CLAUDE.md exists"

    if grep -q "Available Specialized Agents" "$HOME/.claude/CLAUDE.md"; then
        pass "Agent reference section found in CLAUDE.md"
    else
        warn "Agent reference section not found in CLAUDE.md - run: bash scripts/update-claude-md.sh"
    fi
else
    warn "Global CLAUDE.md not found - create at: ~/.claude/CLAUDE.md"
fi

# Test 10: Agent Routing Triggers
echo -e "\n${YELLOW}Test 10: Agent Routing Configuration${NC}"
echo "---------------------------------------"

ROUTING_RULES=$(jq -r '.mcp_routing_rules.routing_map[].name' .claude/agents/delegation-map.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$ROUTING_RULES" -gt 0 ]; then
    pass "Found $ROUTING_RULES MCP routing rules"
else
    fail "No MCP routing rules configured"
fi

AGENT_CAPS=$(jq -r '.agent_capabilities | keys[]' .claude/agents/delegation-map.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$AGENT_CAPS" -gt 0 ]; then
    pass "Found $AGENT_CAPS agent capability definitions"
else
    fail "No agent capabilities defined"
fi

# Test 11: Log Directory
echo -e "\n${YELLOW}Test 11: Log Directory${NC}"
echo "------------------------"

if [ -d ".claude/logs" ]; then
    pass "Log directory exists"

    if [ -w ".claude/logs" ]; then
        pass "Log directory is writable"
    else
        fail "Log directory is not writable"
    fi
else
    fail "Log directory missing"
fi

# Test 12: Documentation
echo -e "\n${YELLOW}Test 12: Documentation Files${NC}"
echo "-------------------------------"

for doc in AGENT_REFERENCE.md CLAUDE_MD_INTEGRATION.md MCP_DELEGATION_GUIDE.md; do
    if [ -f ".claude/docs/$doc" ]; then
        pass "$doc exists"
    else
        warn "$doc missing (optional)"
    fi
done

# Test 13: Git Integration
echo -e "\n${YELLOW}Test 13: Git Integration${NC}"
echo "--------------------------"

if [ -d ".git" ]; then
    pass "Git repository detected"

    if grep -q ".claude/" .gitignore 2>/dev/null; then
        info ".claude/ in .gitignore (private config)"
    elif git ls-files .claude/ >/dev/null 2>&1; then
        info ".claude/ tracked by git (shared config)"
    else
        warn ".claude/ not in .gitignore or tracked - decide privacy model"
    fi
else
    info "Not a git repository"
fi

# Test 14: Hook Dry Run
echo -e "\n${YELLOW}Test 14: Hook Execution Test (Dry Run)${NC}"
echo "-----------------------------------------"

if [ -f ".claude/hooks/tool-use.sh" ]; then
    info "Testing tool-use.sh hook..."

    # Create test file
    echo "// Test file" > /tmp/claude-test.ts

    # Try to run hook (capture output)
    if bash .claude/hooks/tool-use.sh "/tmp/claude-test.ts" >/dev/null 2>&1; then
        pass "tool-use.sh hook executed without errors"
    else
        warn "tool-use.sh hook execution failed (may need package manager installed)"
    fi

    rm -f /tmp/claude-test.ts
fi

if [ -f ".claude/hooks/pre-commit.sh" ]; then
    info "Testing pre-commit.sh hook (skipping actual commit)..."

    # Just check if it runs without error
    if bash -n .claude/hooks/pre-commit.sh 2>&1; then
        pass "pre-commit.sh syntax is valid"
    else
        fail "pre-commit.sh has syntax errors"
    fi
fi

# Test 15: Package Manager Detection
echo -e "\n${YELLOW}Test 15: Package Manager Configuration${NC}"
echo "-----------------------------------------"

PKG_MANAGER=$(jq -r '.context.package_manager // empty' .claude/settings.local.json 2>/dev/null)
if [ -n "$PKG_MANAGER" ]; then
    pass "Package manager configured: $PKG_MANAGER"
else
    # Check delegation-map.json
    PKG_MANAGER_ALT=$(grep -o '"pnpm\|npm\|yarn\|bun"' .claude/agents/delegation-map.json 2>/dev/null | head -1 | tr -d '"')
    if [ -n "$PKG_MANAGER_ALT" ]; then
        pass "Package manager found in configs: $PKG_MANAGER_ALT"
    else
        warn "Package manager not clearly configured"
    fi
fi

# Summary
echo ""
echo "========================================"
echo -e "${BLUE}Test Summary${NC}"
echo "========================================"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Test agent delegation with a specific request"
    echo "2. Edit a file to trigger the tool-use hook"
    echo "3. Try a slash command like /generate-api"
    echo "4. Make a git commit to test pre-commit hook"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review errors above.${NC}"
    exit 1
fi
