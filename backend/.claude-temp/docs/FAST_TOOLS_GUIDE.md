# Fast CLI Tools Guide

## Overview

This guide covers the installation and usage of superfast CLI tools that dramatically improve Claude Code's performance when searching code and navigating files.

## Why Fast Tools?

**Performance Gains:**
- `rg` (ripgrep): **10x faster** than `grep`
- `fd`: **10x faster** than `find`
- `fzf`: Interactive fuzzy finding with **instant feedback**
- `z` (zoxide): **Instant** directory navigation based on your habits

**Real-World Impact:**
- Search 200MB codebase in 0.3s instead of 3s
- Find files among 50k entries in 0.1s instead of 1s
- Enable more thorough code exploration in the same time

## Installation

### During Setup

The `setup.sh` script now includes an optional step (Step 11) to install fast tools:

```bash
Step 11: Fast CLI Tools Installation (Optional)
Install superfast CLI tools for better performance?

Options:
  1) Install all recommended tools (recommended)
  2) Use default tools (grep, find)
  3) Skip (I'll install manually later)

Select (1-3):
```

**Recommended:** Choose option 1 to install all tools automatically.

### Manual Installation

#### macOS (Homebrew)

```bash
brew install ripgrep fd fzf the_silver_searcher pt zoxide
```

#### Linux (Debian/Ubuntu)

```bash
sudo apt-get install ripgrep fd-find fzf silversearcher-ag
```

**Note:** `pt` and `zoxide` may need manual installation on Linux:

```bash
# zoxide
curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash

# pt (platinum searcher) - typically requires building from source
```

#### Linux (Fedora)

```bash
sudo dnf install ripgrep fd-find fzf the_silver_searcher
```

#### Linux (Arch)

```bash
sudo pacman -S ripgrep fd fzf the_silver_searcher
```

### Verification

After installation, verify tools are available:

```bash
# Check individual tools
command -v rg && echo "✓ ripgrep installed"
command -v fd && echo "✓ fd installed"
command -v fzf && echo "✓ fzf installed"
command -v ag && echo "✓ silver searcher installed"
command -v pt && echo "✓ platinum searcher installed"
command -v z && echo "✓ zoxide installed"
```

The setup script includes automatic verification and will show you which tools are successfully installed.

## Tool Reference

### ripgrep (rg)

**Fastest code search tool.**

**Basic Usage:**
```bash
# Search for pattern in current directory
rg "function.*export"

# Search specific file types
rg "import.*React" --type ts

# Search with context (3 lines before/after)
rg "TODO" -C 3

# Case insensitive search
rg -i "error"

# Show only filenames
rg "pattern" -l
```

**Advanced:**
```bash
# Search multiple patterns
rg "error|warning|fatal"

# Exclude directories
rg "pattern" --glob '!node_modules'

# JSON output
rg "pattern" --json
```

**Why it's faster:**
- Written in Rust
- Respects `.gitignore` by default
- Parallel directory traversal
- Memory-mapped files

### fd

**Fastest file finding tool.**

**Basic Usage:**
```bash
# Find by filename
fd "test.ts"

# Find by extension
fd "\.tsx$"

# Find in specific directory
fd "component" src/

# Find and execute command
fd "\.test\.ts$" -x rm
```

**Advanced:**
```bash
# Exclude patterns
fd "\.ts$" --exclude node_modules

# Find by type (file, directory, symlink)
fd --type f "pattern"

# Hidden files
fd --hidden "\.env"

# Case insensitive
fd -i "README"
```

**Why it's faster:**
- Written in Rust
- Parallel directory traversal
- Respects `.gitignore` by default
- Smart case matching

### fzf

**Interactive fuzzy finder.**

**Basic Usage:**
```bash
# Fuzzy find files
fd . | fzf

# Fuzzy search history
history | fzf

# Preview files while searching
fd . | fzf --preview 'cat {}'

# Multi-select
fd . | fzf -m
```

**Integration Examples:**
```bash
# Find and edit file
vim $(fd . | fzf)

# Find and cd to directory
cd $(fd --type d | fzf)

# Search code and open in editor
rg "TODO" -l | fzf | xargs code
```

**Why it's useful:**
- Interactive selection from large lists
- Preview support
- Fuzzy matching algorithm
- Multi-select capability

### ag (The Silver Searcher)

**Alternative to ripgrep, similar speed.**

**Basic Usage:**
```bash
# Search pattern
ag "function.*export"

# Search specific file types
ag "pattern" --ts

# Limit depth
ag "pattern" --depth 2

# Show context
ag "pattern" -C 3
```

### pt (The Platinum Searcher)

**Another grep alternative, written in Go.**

**Basic Usage:**
```bash
# Search pattern
pt "function.*export"

# Search specific types
pt "pattern" --file-search-regexp="\.ts$"
```

### zoxide (z)

**Smart directory jumping based on frequency and recency.**

**Basic Usage:**
```bash
# Jump to directory (learns from your cd history)
z project

# Jump to subdirectory
z proj

# List matched directories
z -l project

# Go to highest ranked match
z -t project
```

**Setup:**

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# zoxide initialization
eval "$(zoxide init zsh)"  # for zsh
eval "$(zoxide init bash)" # for bash
```

**Why it's faster:**
- No need to type full paths
- Learns your navigation patterns
- Frecency algorithm (frequency + recency)
- Works across terminal sessions

## Claude Code Integration

### How Claude Code Uses These Tools

When fast tools are installed, Claude Code will automatically prefer them:

**Code Search:**
```bash
# Claude will use this:
rg "import.*React" --type ts

# Instead of:
grep -r "import.*React" . --include="*.ts" --include="*.tsx"
```

**File Finding:**
```bash
# Claude will use this:
fd "\.test\.ts$"

# Instead of:
find . -type f -name "*.test.ts"
```

**Interactive Selection:**
```bash
# Claude will use this:
fd "component" src/ | fzf

# Instead of:
# Listing all files and asking you to specify
```

### Automatic Preference

The global `~/.claude/CLAUDE.md` configuration (updated by setup) instructs Claude Code to:

1. **Check availability** of fast tools first
2. **Use fast tools** when available
3. **Fall back** to standard tools only if necessary
4. **Cite tool usage** explicitly in responses

### Performance Impact

**Before (using grep/find):**
- Search large codebase: ~3-5 seconds
- Find files: ~1-2 seconds
- Limited scope due to time constraints

**After (using fast tools):**
- Search large codebase: ~0.3-0.5 seconds
- Find files: ~0.1-0.2 seconds
- **10x more searches** in same time = deeper code understanding

## Best Practices

### 1. Let Tools Respect .gitignore

Both `rg` and `fd` respect `.gitignore` by default, which is perfect for code projects:

```bash
# These automatically skip node_modules, dist, etc.
rg "pattern"
fd "file"
```

### 2. Use Type Filters

For language-specific searches, use type filters:

```bash
# TypeScript only
rg "pattern" --type ts

# JavaScript only
rg "pattern" --type js

# Multiple types
rg "pattern" -t ts -t tsx
```

### 3. Combine Tools with Pipes

Chain tools for powerful workflows:

```bash
# Find TypeScript files with TODO, fuzzy select, count matches
fd "\.ts$" | fzf | xargs rg "TODO" -c

# Find all test files, select one, open in editor
fd "test" | fzf | xargs code
```

### 4. Use Context Options

When searching, add context for better understanding:

```bash
# 3 lines before and after
rg "function" -C 3

# 5 lines before, 2 after
rg "function" -B 5 -A 2
```

### 5. Leverage Fuzzy Matching

`fzf` uses smart fuzzy matching:

```bash
# Type "cmpbtn" to find "ComponentButton.tsx"
fd . | fzf
# Then type: cmpbtn
```

## Troubleshooting

### Tools Not Found After Installation

**macOS Homebrew:**
```bash
# Verify Homebrew path is in PATH
echo $PATH | grep homebrew

# If not, add to ~/.zshrc or ~/.bashrc:
export PATH="/opt/homebrew/bin:$PATH"  # Apple Silicon
export PATH="/usr/local/bin:$PATH"      # Intel
```

**Linux:**
```bash
# Reload shell profile
source ~/.bashrc  # or ~/.zshrc

# Check if binaries are in PATH
which rg fd fzf ag
```

### fd-find vs fd (Linux)

On some Linux systems, `fd` is installed as `fd-find` to avoid conflicts:

```bash
# Create alias in ~/.bashrc or ~/.zshrc
alias fd='fdfind'
```

### zoxide Not Working

Make sure you've initialized it in your shell profile:

```bash
# Add to ~/.zshrc or ~/.bashrc
eval "$(zoxide init zsh)"  # for zsh
eval "$(zoxide init bash)" # for bash

# Then reload
source ~/.zshrc  # or ~/.bashrc
```

You need to use `cd` a few times before `z` learns your patterns.

### Permission Denied on Linux Installation

Some installations require sudo:

```bash
# Use sudo for system package manager
sudo apt-get install ripgrep fd-find fzf silversearcher-ag

# Or install to user directory without sudo
# (depends on the tool - check their docs)
```

## Further Reading

### Official Documentation

- **ripgrep**: https://github.com/BurntSushi/ripgrep
- **fd**: https://github.com/sharkdp/fd
- **fzf**: https://github.com/junegunn/fzf
- **ag**: https://github.com/ggreer/the_silver_searcher
- **pt**: https://github.com/monochromegane/the_platinum_searcher
- **zoxide**: https://github.com/ajeetdsouza/zoxide

### Advanced Guides

- [fzf + ripgrep integration](https://junegunn.github.io/fzf/tips/ripgrep-integration/)
- [Optimizing ripgrep performance](https://blog.burntsushi.net/ripgrep/)
- [fd usage examples](https://github.com/sharkdp/fd#usage)

## Summary

**Essential Commands:**
```bash
# Search code
rg "pattern" --type ts

# Find files
fd "filename"

# Interactive fuzzy find
fd . | fzf

# Smart directory jump
z project
```

**Key Benefits:**
- ⚡ 10x faster search and file operations
- 🎯 Better .gitignore integration
- 🔍 More thorough code exploration
- 🚀 Improved Claude Code performance

**Next Steps:**
1. Install tools using setup script (option 1)
2. Verify installation
3. Try example commands
4. Let Claude Code use them automatically

---

**Questions?** Open an issue at: https://github.com/darrentmorgan/claude-config-template/issues
