#!/bin/bash
# Plugin Router Hook
# Auto-suggests plugin commands based on user message keywords
# Runs on UserPromptSubmit to help users discover plugin functionality

USER_MESSAGE="$1"

# Exit if no message provided
if [ -z "$USER_MESSAGE" ]; then
  exit 0
fi

# Convert to lowercase for matching
MESSAGE_LOWER=$(echo "$USER_MESSAGE" | tr '[:upper:]' '[:lower:]')

# Git Flow routing
if echo "$MESSAGE_LOWER" | grep -qE "(git flow|feature branch|start feature|create feature|release branch|hotfix branch)"; then
  echo "💡 Plugin suggestion: git-workflow"
  echo "Available commands:"
  echo "  • /git-workflow:feature <name> - Create feature branch"
  echo "  • /git-workflow:release <version> - Create release branch"
  echo "  • /git-workflow:hotfix <name> - Create hotfix branch"
  echo "  • /git-workflow:finish - Merge current branch"
  echo "  • /git-workflow:flow-status - Show Git Flow status"
fi

# Test automation routing
if echo "$MESSAGE_LOWER" | grep -qE "(generate tests|create tests|unit test|integration test|test coverage)"; then
  echo "💡 Plugin suggestion: testing-suite"
  echo "Available commands:"
  echo "  • /testing-suite:generate-tests <file> - Generate test suite"
  echo "  • /testing-suite:test-coverage - Analyze coverage"
  echo ""
  echo "ℹ️  Note: For E2E/browser tests, qa-expert agent is used instead"
fi

# Supabase routing
if echo "$MESSAGE_LOWER" | grep -qE "(supabase migration|create migration|database schema|sync schema|supabase backup)"; then
  echo "💡 Plugin suggestion: supabase-toolkit"
  echo "Available commands:"
  echo "  • /supabase-toolkit:supabase-migration-assistant - Create migrations"
  echo "  • /supabase-toolkit:supabase-schema-sync - Sync schema"
  echo "  • /supabase-toolkit:supabase-data-explorer - Query data"
  echo "  • /supabase-toolkit:supabase-performance-optimizer - Optimize queries"
fi

# Next.js / Vercel routing
if echo "$MESSAGE_LOWER" | grep -qE "(nextjs|next.js|vercel deploy|edge function|vercel environment)"; then
  echo "💡 Plugin suggestion: nextjs-vercel-pro"
  echo "Available commands:"
  echo "  • /nextjs-vercel-pro:nextjs-component-generator <name>"
  echo "  • /nextjs-vercel-pro:vercel-deploy-optimize"
  echo "  • /nextjs-vercel-pro:vercel-edge-function <name>"
  echo "  • /nextjs-vercel-pro:nextjs-performance-audit"
fi

# Security routing
if echo "$MESSAGE_LOWER" | grep -qE "(security audit|vulnerability scan|security review|check security|owasp)"; then
  echo "💡 Plugin suggestion: security-pro"
  echo "Available commands:"
  echo "  • /security-pro:security-audit - Full security audit"
  echo "  • /security-pro:vulnerability-scan - Scan vulnerabilities"
  echo "  • /security-pro:dependency-audit - Audit dependencies"
fi

# Performance routing
if echo "$MESSAGE_LOWER" | grep -qE "(performance audit|optimize performance|bundle size|slow|bottleneck|profiling)"; then
  echo "💡 Plugin suggestion: performance-optimizer"
  echo "Available commands:"
  echo "  • /performance-optimizer:performance-audit - Comprehensive audit"
  echo "  • /performance-optimizer:optimize-bundle - Reduce bundle size"
  echo "  • /performance-optimizer:add-caching - Implement caching"
fi

# Documentation routing
if echo "$MESSAGE_LOWER" | grep -qE "(generate docs|api docs|documentation|create guide|changelog)"; then
  echo "💡 Plugin suggestion: documentation-generator"
  echo "Available commands:"
  echo "  • /documentation-generator:generate-api-docs"
  echo "  • /documentation-generator:update-docs"
  echo "  • /documentation-generator:create-user-guide"
fi

# DevOps routing
if echo "$MESSAGE_LOWER" | grep -qE "(ci/cd|github actions|docker|kubernetes|deploy pipeline|monitoring)"; then
  echo "💡 Plugin suggestion: devops-automation"
  echo "Available commands:"
  echo "  • /devops-automation:setup-ci-cd-pipeline"
  echo "  • /devops-automation:docker-compose-setup"
  echo "  • /devops-automation:kubernetes-deploy"
fi

# Exit successfully (non-blocking hook)
exit 0
