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
CONDENSED_TEMPLATE="$SCRIPT_DIR/../docs/CLAUDE_MD_CONDENSED.md"

echo -e "${BLUE}🤖 Claude.md Updater (Condensed Version)${NC}"
echo "=========================================="
echo ""
echo "This will install a condensed CLAUDE.md that references"
echo "detailed documentation in .claude/docs/ files."
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

# Check if CLAUDE.md has content
if [ -s "$CLAUDE_MD_PATH" ]; then
    echo -e "${YELLOW}⚠️  CLAUDE.md already has content${NC}"
    echo ""
    echo "Current file size: $(wc -l < "$CLAUDE_MD_PATH") lines"
    echo ""
    read -p "Replace with condensed version? (y/n): " replace_file

    if [ "$replace_file" = "y" ]; then
        # Backup existing file
        BACKUP_PATH="$CLAUDE_MD_PATH.backup-$(date +%Y%m%d-%H%M%S)"
        cp "$CLAUDE_MD_PATH" "$BACKUP_PATH"
        echo -e "${GREEN}✓ Backed up to: $BACKUP_PATH${NC}"
    else
        echo "Aborting. No changes made."
        exit 0
    fi
fi

# Install condensed template
echo ""
echo -e "${YELLOW}Installing condensed CLAUDE.md template...${NC}"

cat "$CONDENSED_TEMPLATE" > "$CLAUDE_MD_PATH"

echo -e "${GREEN}✓ Condensed CLAUDE.md installed${NC}"
echo ""
echo "📊 File size comparison:"
if [ -f "$BACKUP_PATH" ]; then
    OLD_LINES=$(wc -l < "$BACKUP_PATH")
    NEW_LINES=$(wc -l < "$CLAUDE_MD_PATH")
    REDUCTION=$((100 - (NEW_LINES * 100 / OLD_LINES)))
    echo "  Old: $OLD_LINES lines"
    echo "  New: $NEW_LINES lines"
    echo "  Reduction: $REDUCTION%"
fi
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review your condensed CLAUDE.md: $CLAUDE_MD_PATH"
echo "2. Run setup.sh in your projects to install .claude/docs/"
echo "3. Detailed docs will be available in .claude/docs/:"
echo "   - DELEGATION.md - Full delegation protocol"
echo "   - AGENT_REFERENCE.md - All agent capabilities"
echo "   - WORKFLOWS.md - Scout→Plan→Build workflows"
echo "   - TESTING_GUIDE.md - Test strategies"
echo ""
echo -e "${GREEN}✅ CLAUDE.md is now 80%+ smaller and references detailed docs!${NC}"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"
