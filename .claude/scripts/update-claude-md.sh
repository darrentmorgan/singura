#!/bin/bash
# Update CLAUDE.md with Agent Reference Section
# Adds specialized agent documentation to your global CLAUDE.md file

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLAUDE_MD_PATH="$HOME/.claude/CLAUDE.md"
AGENT_SECTION_PATH="$SCRIPT_DIR/../docs/CLAUDE_MD_AGENT_SECTION.md"

echo -e "${BLUE}🤖 Claude.md Agent Reference Updater${NC}"
echo "===================================="
echo ""

# Check if CLAUDE.md exists
if [ ! -f "$CLAUDE_MD_PATH" ]; then
    echo -e "${YELLOW}⚠️  CLAUDE.md not found at: $CLAUDE_MD_PATH${NC}"
    echo ""
    read -p "Would you like to create it? (y/n): " create_file

    if [ "$create_file" = "y" ]; then
        mkdir -p "$(dirname "$CLAUDE_MD_PATH")"
        touch "$CLAUDE_MD_PATH"
        echo -e "${GREEN}✓ Created CLAUDE.md${NC}"
    else
        echo "Aborting. Please create $CLAUDE_MD_PATH first."
        exit 1
    fi
fi

# Check if agent section already exists
if grep -q "## Available Specialized Agents" "$CLAUDE_MD_PATH"; then
    echo -e "${YELLOW}⚠️  Agent section already exists in CLAUDE.md${NC}"
    echo ""
    read -p "Would you like to update it? (y/n): " update_section

    if [ "$update_section" = "y" ]; then
        # Remove existing agent section (from "## Available Specialized Agents" to the next top-level heading or EOF)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' '/## Available Specialized Agents/,/^# [^#]/d' "$CLAUDE_MD_PATH"
        else
            # Linux
            sed -i '/## Available Specialized Agents/,/^# [^#]/d' "$CLAUDE_MD_PATH"
        fi
        echo -e "${GREEN}✓ Removed old agent section${NC}"
    else
        echo "Aborting. No changes made."
        exit 0
    fi
fi

# Extract the actual content (skip the header instructions)
echo ""
echo -e "${YELLOW}Adding agent reference section...${NC}"

# Read the agent section file and skip the first 5 lines (header)
AGENT_CONTENT=$(tail -n +6 "$AGENT_SECTION_PATH")

# Append to CLAUDE.md
echo "" >> "$CLAUDE_MD_PATH"
echo "---" >> "$CLAUDE_MD_PATH"
echo "" >> "$CLAUDE_MD_PATH"
echo "$AGENT_CONTENT" >> "$CLAUDE_MD_PATH"

echo -e "${GREEN}✓ Agent reference section added to CLAUDE.md${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review your updated CLAUDE.md: $CLAUDE_MD_PATH"
echo "2. Customize agent routing rules if needed"
echo "3. Run setup.sh in your projects to install agent configs"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"
