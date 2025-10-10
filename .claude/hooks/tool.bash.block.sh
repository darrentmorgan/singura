#!/bin/bash
# Tool.bash.block hook: Block inefficient bash commands and suggest faster tools
# This enforces using Claude Code's specialized tools instead of bash equivalents

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get the bash command that's about to be executed
BASH_COMMAND="$1"

# Check for problematic patterns
should_block=false
suggestion=""

# Block 'find' commands - suggest Glob
if echo "$BASH_COMMAND" | grep -qE '^\s*find\s'; then
    should_block=true
    suggestion="Use the Glob tool instead:

Example: Glob with pattern '**/*.ts' to find TypeScript files
Example: Glob with pattern 'src/**/*.tsx' to find React components

The Glob tool is much faster and works better with large codebases."
fi

# Block 'grep' or 'rg' commands - suggest Grep tool
if echo "$BASH_COMMAND" | grep -qE '^\s*(grep|rg)\s'; then
    should_block=true
    suggestion="Use the Grep tool instead:

Example: Grep with pattern 'function.*login' and output_mode 'content'
Example: Grep with pattern 'interface User' and glob '*.ts'

The Grep tool is optimized for ripgrep and has better performance."
fi

# Block 'cat', 'head', 'tail' for reading files - suggest Read
if echo "$BASH_COMMAND" | grep -qE '^\s*(cat|head|tail)\s+[^|&;]+$'; then
    should_block=true
    suggestion="Use the Read tool instead:

Example: Read with file_path '/path/to/file.ts'
Example: Read with file_path, offset, and limit for large files

The Read tool provides better formatting and line numbers."
fi

# Block 'sed' or 'awk' for editing - suggest Edit
if echo "$BASH_COMMAND" | grep -qE '^\s*(sed|awk)\s'; then
    should_block=true
    suggestion="Use the Edit tool instead:

Example: Edit with file_path, old_string, and new_string
Example: Edit with replace_all: true to replace all occurrences

The Edit tool ensures exact replacements and better error handling."
fi

# Block 'echo >' or 'cat <<EOF' for writing - suggest Write
if echo "$BASH_COMMAND" | grep -qE '(echo.*>|cat\s*<<)'; then
    should_block=true
    suggestion="Use the Write tool instead:

Example: Write with file_path and content
Example: Write will overwrite existing files safely

The Write tool handles encoding and permissions correctly."
fi

# Allow legitimate bash commands
if echo "$BASH_COMMAND" | grep -qE '^\s*(git|npm|pnpm|yarn|node|python|pip|cargo|rustc|go|make|docker|kubectl|terraform|cd|ls|pwd|mkdir|cp|mv|rm|chmod|chown)'; then
    should_block=false
fi

# Allow piped commands and complex shell operations
if echo "$BASH_COMMAND" | grep -qE '(\||&&|;|\$\()'; then
    # But still block if it's JUST a grep/find with a pipe to grep
    if echo "$BASH_COMMAND" | grep -qE '^\s*(find|grep|rg)\s+.*\|.*grep'; then
        should_block=true
        suggestion="Use the Grep tool with appropriate filters instead of piping bash commands.

Example: Grep with glob parameter to filter files
Example: Grep with -A, -B, -C for context lines

The Grep tool handles filtering natively and is faster."
    else
        should_block=false
    fi
fi

# If we should block, output error and exit with code 1
if [ "$should_block" = true ]; then
    echo "" >&2
    echo "========================================" >&2
    echo -e "${RED}⛔ BASH COMMAND BLOCKED${NC}" >&2
    echo "========================================" >&2
    echo "" >&2
    echo -e "${YELLOW}Blocked command:${NC}" >&2
    echo "$BASH_COMMAND" >&2
    echo "" >&2
    echo -e "${BLUE}$suggestion${NC}" >&2
    echo "" >&2
    echo "========================================" >&2
    echo -e "${RED}Use the specialized tool instead of bash${NC}" >&2
    echo "========================================" >&2
    exit 1
fi

# Allow the command to proceed
exit 0
