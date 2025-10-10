#!/usr/bin/env bash
#
# Intelligent CLAUDE.md Updater
#
# This script safely updates ~/.claude/CLAUDE.md by:
# 1. Checking if our instruction set already exists
# 2. If exists: verifying every line matches (updating if needed)
# 3. If not exists: appending our instructions to preserve user's existing content
#
# Usage: ./update-claude-md.sh [--dry-run] [--force]
#

set -e

# Require bash 4+ for associative arrays, or fallback to simple mode
if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
    echo "Notice: Using compatibility mode for bash ${BASH_VERSION}"
    USE_COMPAT_MODE=true
else
    USE_COMPAT_MODE=false
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLAUDE_MD_PATH="$HOME/.claude/CLAUDE.md"
TEMPLATE_DIR="$SCRIPT_DIR/../templates"
DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--force]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be done without making changes"
            echo "  --force      Skip confirmation prompts"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--force]"
            exit 1
            ;;
    esac
done

# Section markers - used to identify our managed sections
# Format: SECTION_NAME|START_MARKER|END_MARKER
SECTIONS=(
    "DELEGATION|# ⚡ DELEGATION-FIRST PROTOCOL|# ⚡ END DELEGATION-FIRST PROTOCOL"
    "AUTONOMY|## ⚡ AUTONOMOUS EXECUTION MODE|## ⚡ END AUTONOMOUS EXECUTION MODE"
)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Code CLAUDE.md Intelligent Updater${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create template directory if needed
mkdir -p "$TEMPLATE_DIR"

# Check if CLAUDE.md exists
if [ ! -f "$CLAUDE_MD_PATH" ]; then
    echo -e "${YELLOW}⚠  CLAUDE.md not found at: $CLAUDE_MD_PATH${NC}"
    echo -e "${YELLOW}   This is your global configuration file for all Claude Code projects.${NC}"
    echo ""

    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        echo -ne "${YELLOW}❓ Create new CLAUDE.md? (y/n): ${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}ℹ  Cancelled${NC}"
            exit 0
        fi
    fi

    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$(dirname "$CLAUDE_MD_PATH")"

        # Create with delegation protocol only
        cat > "$CLAUDE_MD_PATH" <<'EOFTEMPLATE'
# Full Stack Development Guidelines

This is your global Claude Code configuration. All instructions here apply to every project.

---

EOFTEMPLATE

        echo -e "${GREEN}✓ Created new CLAUDE.md${NC}"
    else
        echo -e "${BLUE}[DRY RUN] Would create: $CLAUDE_MD_PATH${NC}"
    fi
fi

echo -e "${BLUE}📄 Target: $CLAUDE_MD_PATH${NC}"
echo ""

# Function to extract section from file
extract_section() {
    local file="$1"
    local start_marker="$2"
    local end_marker="$3"

    if [ ! -f "$file" ]; then
        echo ""
        return 1
    fi

    if ! grep -q "$start_marker" "$file" 2>/dev/null; then
        echo ""
        return 1
    fi

    sed -n "/$start_marker/,/$end_marker/p" "$file" 2>/dev/null || echo ""
}

# Function to create template from current CLAUDE.md
create_template() {
    local section_name="$1"
    local start_marker="$2"
    local end_marker="$3"
    local template_file="$TEMPLATE_DIR/CLAUDE_MD_${section_name}.md"

    if [ -f "$CLAUDE_MD_PATH" ]; then
        local content=$(extract_section "$CLAUDE_MD_PATH" "$start_marker" "$end_marker")
        if [ -n "$content" ]; then
            echo "$content" > "$template_file"
            return 0
        fi
    fi
    return 1
}

# Function to compare and update section (compatibility mode)
update_section_compat() {
    local section_name="$1"
    local start_marker="$2"
    local end_marker="$3"
    local template_file="$TEMPLATE_DIR/CLAUDE_MD_${section_name}.md"

    echo -e "${BLUE}▶ Checking $section_name section...${NC}"

    # Check if template exists, if not try to create it from current CLAUDE.md
    if [ ! -f "$template_file" ]; then
        echo -e "${YELLOW}  ⚠ Template not found, attempting to create from current CLAUDE.md...${NC}"
        if ! create_template "$section_name" "$start_marker" "$end_marker"; then
            echo -e "${RED}  ✗ Cannot create template - section not found${NC}"
            echo -e "${YELLOW}  ℹ This section will be skipped${NC}"
            return 1
        fi
        echo -e "${GREEN}  ✓ Template created${NC}"
    fi

    # Extract current section from CLAUDE.md
    local current_section=$(extract_section "$CLAUDE_MD_PATH" "$start_marker" "$end_marker")

    # Read template
    local template_section=$(cat "$template_file")

    if [ -z "$current_section" ]; then
        # Section doesn't exist - append it
        echo -e "${YELLOW}  ⚠ Section not found in CLAUDE.md${NC}"

        if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
            echo -ne "${YELLOW}  ❓ Add $section_name section? (y/n): ${NC}"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}  ℹ Skipped${NC}"
                return 0
            fi
        fi

        if [ "$DRY_RUN" = false ]; then
            # Backup
            cp "$CLAUDE_MD_PATH" "$CLAUDE_MD_PATH.backup.$(date +%Y%m%d_%H%M%S)"

            # Append section
            echo "" >> "$CLAUDE_MD_PATH"
            echo "---" >> "$CLAUDE_MD_PATH"
            echo "" >> "$CLAUDE_MD_PATH"
            cat "$template_file" >> "$CLAUDE_MD_PATH"
            echo "" >> "$CLAUDE_MD_PATH"

            echo -e "${GREEN}  ✓ Section added${NC}"
        else
            echo -e "${BLUE}  [DRY RUN] Would add section${NC}"
        fi
    elif [ "$current_section" = "$template_section" ]; then
        # Section matches - no update needed
        echo -e "${GREEN}  ✓ Up-to-date${NC}"
    else
        # Section differs - update needed
        echo -e "${YELLOW}  ⚠ Section differs from template${NC}"

        if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
            echo ""
            echo -e "${YELLOW}  Showing differences (- current, + template):${NC}"
            diff -u <(echo "$current_section") <(echo "$template_section") | head -20 || true
            echo ""
            echo -ne "${YELLOW}  ❓ Update $section_name section? (y/n): ${NC}"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}  ℹ Update skipped${NC}"
                return 0
            fi
        fi

        if [ "$DRY_RUN" = false ]; then
            # Backup
            cp "$CLAUDE_MD_PATH" "$CLAUDE_MD_PATH.backup.$(date +%Y%m%d_%H%M%S)"

            # Remove old section
            sed -i.tmp "/$start_marker/,/$end_marker/d" "$CLAUDE_MD_PATH"
            rm -f "$CLAUDE_MD_PATH.tmp"

            # Append new section
            echo "" >> "$CLAUDE_MD_PATH"
            cat "$template_file" >> "$CLAUDE_MD_PATH"
            echo "" >> "$CLAUDE_MD_PATH"

            echo -e "${GREEN}  ✓ Section updated${NC}"
        else
            echo -e "${BLUE}  [DRY RUN] Would update section${NC}"
        fi
    fi

    echo ""
}

# Process each section
for section_spec in "${SECTIONS[@]}"; do
    # Parse: SECTION_NAME|START_MARKER|END_MARKER
    IFS='|' read -r section_name start_marker end_marker <<< "$section_spec"

    # Call update_section with parameters
    update_section_compat "$section_name" "$start_marker" "$end_marker"
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Update complete${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}📋 Your CLAUDE.md: $CLAUDE_MD_PATH${NC}"
    echo -e "${BLUE}📂 Backups: $CLAUDE_MD_PATH.backup.*${NC}"
else
    echo -e "${YELLOW}This was a dry run - no changes were made${NC}"
    echo -e "${YELLOW}Run without --dry-run to apply changes${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
