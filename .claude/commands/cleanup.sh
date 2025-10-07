#!/bin/bash

# SaaS X-Ray Root Folder Cleanup Command
# Usage: bash .claude/commands/cleanup-v2.sh

set -e

PROJECT_ROOT="/Users/darrenmorgan/AI_Projects/saas-xray"
cd "$PROJECT_ROOT"

echo "========================================"
echo "   SaaS X-Ray Root Folder Cleanup"
echo "========================================"
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p docs/screenshots/playwright
mkdir -p docs/archived-reports
mkdir -p .artifacts/logs
mkdir -p .artifacts/temp

moved=0
archived=0
removed=0

# Move screenshots
echo ""
echo "1. Moving screenshots..."
shopt -s nullglob
for file in *.png *.jpg; do
    if [ -f "$file" ]; then
        mv "$file" "docs/screenshots/"
        echo "  ✓ Moved: $file"
        moved=$((moved + 1))
    fi
done
shopt -u nullglob

# Archive markdown reports
echo ""
echo "2. Archiving completed reports..."
reports=(
    "ACTOR_EMAIL_TEST_REMOVAL_REPORT.md"
    "DEPLOYMENT_STATUS.md"
    "ERROR_MESSAGE_FLOW_DIAGRAM.md"
    "FRONTEND_IMPLEMENTATION_SUMMARY.md"
    "JEST_TYPESCRIPT_ISSUE_RESOLUTION.md"
    "OAUTH_AUTHORIZATION_DATE_FIX.md"
    "OAUTH_AUTHORIZATION_DATE_RESEARCH.md"
    "OAUTH_DATE_FIX_SUMMARY.md"
    "OAUTH_ENRICHED_PERMISSIONS_UI_IMPLEMENTATION.md"
    "OAUTH_RISK_ALGORITHM_DESIGN_COMPLETE.md"
    "OAUTH_SCOPE_ENRICHMENT_IMPLEMENTATION.md"
    "PHASE_1_API_ENDPOINT_COMPLETE.md"
    "PHASE_1_OAUTH_SCOPE_LIBRARY_COMPLETE.md"
    "QA_BUG_REPORT_VIEW_DETAILS_MODAL_404.md"
    "QA_VERIFICATION_SUMMARY.md"
    "TDD_OAUTH_SCOPE_ENRICHMENT_REPORT.md"
    "TEST_COVERAGE_REPORT.md"
    "TIER_1_JOIN_IMPLEMENTATION_SUMMARY.md"
    "TIER_1_TEST_SUITE_COMPLETE.md"
    "USER_FRIENDLY_ERROR_MESSAGES_IMPLEMENTATION.md"
    "VIEW_DETAILS_ENHANCEMENT_PLAN.md"
)

for report in "${reports[@]}"; do
    if [ -f "$report" ]; then
        mv "$report" "docs/archived-reports/"
        echo "  ✓ Archived: $report"
        archived=$((archived + 1))
    fi
done

# Move active deployment docs
echo ""
echo "3. Organizing active documentation..."
if [ -f "DEPLOYMENT.md" ]; then
    mv "DEPLOYMENT.md" "docs/"
    echo "  ✓ Moved: DEPLOYMENT.md → docs/"
    moved=$((moved + 1))
fi
if [ -f "VERCEL_DEPLOYMENT.md" ]; then
    mv "VERCEL_DEPLOYMENT.md" "docs/"
    echo "  ✓ Moved: VERCEL_DEPLOYMENT.md → docs/"
    moved=$((moved + 1))
fi

# Remove logs
echo ""
echo "4. Cleaning up log files..."
for log in backend.log frontend.log frontend-new.log; do
    if [ -f "$log" ]; then
        rm "$log"
        echo "  ✓ Removed: $log"
        removed=$((removed + 1))
    fi
done

# Move large temp files
echo ""
echo "5. Moving temporary files..."
if [ -f "flattened-codebase.xml" ]; then
    mv "flattened-codebase.xml" ".artifacts/temp/"
    echo "  ✓ Moved: flattened-codebase.xml → .artifacts/temp/"
    moved=$((moved + 1))
fi

# Move playwright screenshots
echo ""
echo "6. Organizing Playwright screenshots..."
if [ -d ".playwright-mcp" ]; then
    pw_count=0
    shopt -s nullglob
    for screenshot in .playwright-mcp/*.png; do
        if [ -f "$screenshot" ]; then
            mv "$screenshot" "docs/screenshots/playwright/"
            pw_count=$((pw_count + 1))
        fi
    done
    shopt -u nullglob
    if [ $pw_count -gt 0 ]; then
        echo "  ✓ Moved $pw_count Playwright screenshots"
        moved=$((moved + pw_count))
    fi
fi

echo ""
echo "========================================"
echo "          Cleanup Summary"
echo "========================================"
echo "Files moved:     $moved"
echo "Files archived:  $archived"
echo "Files removed:   $removed"
echo ""
echo "Root folder is now clean!"
echo ""
echo "Essential files remaining:"
echo "  - README.md (project overview)"
echo "  - CLAUDE.md (development guidelines)"
echo "  - package.json, docker-compose.yml (configs)"
echo ""
echo "Organized structure:"
echo "  - docs/screenshots/ (all screenshots)"
echo "  - docs/archived-reports/ (completed reports)"
echo "  - .artifacts/ (temporary files)"
