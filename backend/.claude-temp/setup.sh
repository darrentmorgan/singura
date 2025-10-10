#!/bin/bash
# Claude Config Template Setup Script
# Interactive setup for .claude configuration in any project

set -e

# Check for --update flag
UPDATE_MODE=false
if [ "$1" = "--update" ] || [ "$1" = "-u" ]; then
    UPDATE_MODE=true
    echo "🔄 Claude Code Configuration Update"
    echo "==================================="
    echo ""
else
    echo "🚀 Claude Code Configuration Setup"
    echo "=================================="
    echo ""
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Progress spinner
spinner() {
    local pid=$1
    local message=$2
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local delay=0.1

    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf " [%c] %s" "$spinstr" "$message"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\r"
    done
    printf "    \r"
}

# Progress bar
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))

    printf "\r["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %3d%% %s" "$percent" "$message"
}

# CRITICAL: Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Verify template files exist
if [ ! -d "$SCRIPT_DIR/agents" ] || [ ! -d "$SCRIPT_DIR/hooks" ]; then
    echo -e "${RED}❌ Error: Template files not found!${NC}"
    echo "This script must be run from the claude-config-template directory."
    echo "Script location: $SCRIPT_DIR"
    exit 1
fi

# Detect current directory (where we're installing)
CURRENT_DIR=$(pwd)
CURRENT_BASENAME=$(basename "$CURRENT_DIR")

# If we're in a temporary directory (.claude-temp), use parent directory name
if [ "$CURRENT_BASENAME" = ".claude-temp" ]; then
    PROJECT_NAME=$(basename "$(dirname "$CURRENT_DIR")")
else
    PROJECT_NAME="$CURRENT_BASENAME"
fi

echo -e "${BLUE}Template location: $SCRIPT_DIR${NC}"
echo -e "${BLUE}Installing to: $CURRENT_DIR${NC}"
echo -e "${BLUE}Detected project name: $PROJECT_NAME${NC}"
echo ""

# Step 1: Detect package manager
echo -e "${YELLOW}Step 1: Detecting package manager...${NC}"

PKG_MANAGER=""
if [ -f "package-lock.json" ]; then
    PKG_MANAGER="npm"
elif [ -f "pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    PKG_MANAGER="yarn"
elif [ -f "bun.lockb" ]; then
    PKG_MANAGER="bun"
else
    echo -e "${YELLOW}No lock file found. Which package manager do you use?${NC}"
    echo "1) pnpm (default)"
    echo "2) npm"
    echo "3) yarn"
    echo "4) bun"
    read -p "Select (1-4, or press Enter for pnpm): " pm_choice
    case $pm_choice in
        1|"") PKG_MANAGER="pnpm" ;;
        2) PKG_MANAGER="npm" ;;
        3) PKG_MANAGER="yarn" ;;
        4) PKG_MANAGER="bun" ;;
        *) echo "Invalid choice. Defaulting to pnpm"; PKG_MANAGER="pnpm" ;;
    esac
fi

echo -e "${GREEN}✓ Package manager: $PKG_MANAGER${NC}"
echo ""

# Step 2: Detect framework (optional)
echo -e "${YELLOW}Step 2: Detecting framework...${NC}"

FRAMEWORK="generic"
if [ -f "package.json" ]; then
    if grep -q '"react"' package.json; then
        FRAMEWORK="react"
    elif grep -q '"next"' package.json; then
        FRAMEWORK="nextjs"
    elif grep -q '"vue"' package.json; then
        FRAMEWORK="vue"
    elif grep -q '"express"' package.json; then
        FRAMEWORK="express"
    fi
fi

echo -e "${GREEN}✓ Framework: $FRAMEWORK${NC}"
echo ""

# Step 3: Confirm or customize
echo -e "${YELLOW}Step 3: Configuration Summary${NC}"
echo "  Project Name: $PROJECT_NAME"
echo "  Package Manager: $PKG_MANAGER"
echo "  Framework: $FRAMEWORK"
echo ""
read -p "Continue with this configuration? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Step 4: Copy files to .claude directory
echo ""
echo -e "${YELLOW}Step 4: Installing .claude configuration...${NC}"

# Create .claude directory if it doesn't exist
if [ -d ".claude" ]; then
    if [ "$UPDATE_MODE" = true ]; then
        echo -e "${BLUE}ℹ  Updating existing .claude configuration...${NC}"
        echo "This will update:"
        echo "  ✅ scripts/delegation-router.ts (parallel execution)"
        echo "  ✅ hooks/pre-request-router.sh (parallel guidance)"
        echo "  ✅ agents/delegation-map.json (routing rules)"
        echo "  ✅ agents/configs/*.json (MCP assignments)"
        echo "  ✅ docs/ (documentation)"
        echo ""
        echo "Your customizations in settings.local.json will be preserved."
        echo ""
        read -p "Continue with update? (y/n): " confirm_update
        if [ "$confirm_update" != "y" ]; then
            echo "Update cancelled."
            exit 0
        fi

        # Backup existing config
        echo "📦 Creating backup..."
        cp -r .claude .claude-backup-$(date +%Y%m%d-%H%M%S)
        echo -e "${GREEN}✓ Backup created${NC}"

    else
        echo -e "${YELLOW}⚠  .claude directory already exists.${NC}"
        read -p "Overwrite existing configuration? (y/n): " overwrite
        if [ "$overwrite" != "y" ]; then
            echo "Setup cancelled."
            echo -e "${BLUE}Tip: Use --update flag to update existing installation:${NC}"
            echo "  bash setup.sh --update"
            exit 0
        fi
        rm -rf .claude
    fi
fi

mkdir -p .claude

# Copy directory structure with progress
echo "📁 Copying configuration files..."
COPY_ITEMS=("agents" "hooks" "commands" "docs" "scripts")
TOTAL_ITEMS=${#COPY_ITEMS[@]}
CURRENT=0

for item in "${COPY_ITEMS[@]}"; do
    CURRENT=$((CURRENT + 1))
    if [ -d "$SCRIPT_DIR/$item" ]; then
        show_progress $CURRENT $TOTAL_ITEMS "Copying $item..."
        cp -r "$SCRIPT_DIR/$item" .claude/ 2>/dev/null || true
    fi
done

# Handle settings.local.json differently for updates
if [ "$UPDATE_MODE" = true ] && [ -f ".claude/settings.local.json" ]; then
    printf "\r%80s\r" " "  # Clear progress line
    echo -e "${BLUE}ℹ  Preserving existing settings.local.json${NC}"
else
    cp "$SCRIPT_DIR/settings.local.json" .claude/
fi

# Copy .env template if doesn't exist
if [ ! -f ".claude/.env" ] && [ -f "$SCRIPT_DIR/.env.template" ]; then
    cp "$SCRIPT_DIR/.env.template" .claude/.env
    echo -e "${GREEN}✓ Created .claude/.env from template${NC}"
fi

printf "\r%80s\r" " "  # Clear progress line

# Step 5: Replace placeholders
echo ""
echo -e "${YELLOW}Step 5: Customizing configuration...${NC}"

# Function to replace placeholders in files
replace_placeholders() {
    local file=$1
    if [ -f "$file" ]; then
        # Replace {{PKG_MANAGER}}
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|{{PKG_MANAGER}}|$PKG_MANAGER|g" "$file"
            sed -i '' "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" "$file"
            sed -i '' "s|{{FRAMEWORK}}|$FRAMEWORK|g" "$file"
        else
            sed -i "s|{{PKG_MANAGER}}|$PKG_MANAGER|g" "$file"
            sed -i "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" "$file"
            sed -i "s|{{FRAMEWORK}}|$FRAMEWORK|g" "$file"
        fi
    fi
}

# Replace in all hook files
HOOK_FILES=(.claude/hooks/*.sh)
TOTAL_HOOKS=${#HOOK_FILES[@]}
CURRENT_HOOK=0

for file in "${HOOK_FILES[@]}"; do
    CURRENT_HOOK=$((CURRENT_HOOK + 1))
    show_progress $CURRENT_HOOK $TOTAL_HOOKS "Processing $(basename "$file")..."
    replace_placeholders "$file"
    chmod +x "$file"
done

printf "\r%80s\r" " "  # Clear progress line

# Replace in config files
echo "📝 Updating configuration files..."
replace_placeholders ".claude/settings.local.json"
replace_placeholders ".claude/agents/delegation-map.json"

echo -e "${GREEN}✓ Placeholders replaced${NC}"

# Step 6: Setup global agent sharing (optional)
echo ""
echo -e "${YELLOW}Step 6: Global Agent Sharing (Optional)${NC}"
echo "Would you like to use shared agents from ~/.claude/agents?"
echo "This reduces duplication across projects."
read -p "Enable global agent sharing? (y/n): " share_agents

if [ "$share_agents" = "y" ]; then
    GLOBAL_AGENTS_DIR="$HOME/.claude/agents/shared"

    if [ ! -d "$GLOBAL_AGENTS_DIR" ]; then
        echo "📦 Creating global agents directory..."
        mkdir -p "$GLOBAL_AGENTS_DIR"

        # Copy agent configs to global location
        show_progress 1 3 "Copying agent configs..."
        cp -r .claude/agents/configs "$GLOBAL_AGENTS_DIR/"

        show_progress 2 3 "Copying MCP mappings..."
        cp .claude/agents/mcp-mapping.json "$GLOBAL_AGENTS_DIR/"

        show_progress 3 3 "Global agents setup complete"
        printf "\n"

        echo -e "${GREEN}✓ Global agents created at ~/.claude/agents/shared${NC}"
    fi

    # Create symlink
    echo "🔗 Creating symlink to global agents..."
    rm -rf .claude/agents/configs
    ln -s "$GLOBAL_AGENTS_DIR/configs" .claude/agents/configs

    echo -e "${GREEN}✓ Linked to global agents${NC}"
else
    echo "Using local agents only"
fi

# Step 7: Create necessary directories
echo ""
echo -e "${YELLOW}Step 7: Creating log directories...${NC}"
mkdir -p .claude/logs

echo -e "${GREEN}✓ Log directories created${NC}"

# Step 8: Git setup
echo ""
echo -e "${YELLOW}Step 8: Git Integration${NC}"

if [ -d ".git" ]; then
    echo "Git repository detected."
    echo "Would you like to:"
    echo "1) Add .claude to .gitignore (private config)"
    echo "2) Commit .claude to repository (shared config)"
    echo "3) Skip git setup"
    read -p "Select (1-3): " git_choice

    case $git_choice in
        1)
            if ! grep -q "^\.claude/$" .gitignore 2>/dev/null; then
                echo ".claude/" >> .gitignore
                echo -e "${GREEN}✓ Added .claude to .gitignore${NC}"
            fi
            ;;
        2)
            git add .claude
            echo -e "${YELLOW}Run 'git commit' to save .claude configuration${NC}"
            ;;
        3)
            echo "Skipped git setup"
            ;;
    esac
else
    echo "No git repository found - skipping git integration"
fi

# Step 9: Update global CLAUDE.md (optional)
echo ""
echo -e "${YELLOW}Step 9: Global CLAUDE.md Update (Optional)${NC}"
echo "Would you like to add agent reference documentation to your global CLAUDE.md?"
echo "This adds a comprehensive agent guide to ~/.claude/CLAUDE.md"
echo ""
read -p "Update CLAUDE.md with agent reference? (y/n): " update_claude_md

if [ "$update_claude_md" = "y" ]; then
    if [ -f "$SCRIPT_DIR/scripts/update-claude-md.sh" ]; then
        echo "Running CLAUDE.md updater..."
        bash "$SCRIPT_DIR/scripts/update-claude-md.sh"
    else
        echo -e "${RED}❌ Error: update-claude-md.sh script not found${NC}"
        echo "You can manually add the agent section from:"
        echo "  $SCRIPT_DIR/docs/CLAUDE_MD_AGENT_SECTION.md"
    fi
else
    echo "Skipped CLAUDE.md update"
    echo -e "${BLUE}Tip: You can run this later with:${NC}"
    echo "  bash $SCRIPT_DIR/scripts/update-claude-md.sh"
fi

# Step 10: Environment Configuration
echo ""
echo -e "${YELLOW}Step 10: Environment Configuration (Optional)${NC}"
echo "Configure execution mode and memory settings?"
echo ""
echo "Options:"
echo "  1) Sequential mode (default) - 100% stable, slower"
echo "  2) Safe Parallel mode - 95% stable, 30% faster"
echo "  3) Skip environment setup"
echo ""
read -p "Select (1-3): " env_choice

if [ "$env_choice" = "2" ]; then
    ENV_CONTENT="# Claude Code Safe Parallel Configuration
SAFE_PARALLEL=true
CONCURRENCY_LIMIT=2
MEMORY_THRESHOLD=4096

# Memory Management
CLAUDE_MEMORY_LIMIT_MB=6144

# Node.js Options (add to shell profile separately)
# export NODE_OPTIONS=\"--expose-gc --max-old-space-size=8192\"
"

    echo ""
    echo "Where would you like to save this configuration?"
    echo "  1) .env file in this project (recommended)"
    echo "  2) Shell profile (~/.zshrc or ~/.bashrc)"
    echo "  3) Both"
    read -p "Select (1-3): " save_choice

    case $save_choice in
        1|3)
            # Create .env file
            echo "$ENV_CONTENT" > .env
            echo -e "${GREEN}✓ Created .env file with safe parallel configuration${NC}"

            # Add .env to .gitignore
            if [ -f ".gitignore" ]; then
                if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
                    echo ".env" >> .gitignore
                    echo -e "${GREEN}✓ Added .env to .gitignore${NC}"
                fi
            fi
            ;;
    esac

    if [ "$save_choice" = "2" ] || [ "$save_choice" = "3" ]; then
        # Detect shell
        SHELL_PROFILE=""
        if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
            SHELL_PROFILE="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
            SHELL_PROFILE="$HOME/.bashrc"
        else
            # Fallback: check which files exist
            if [ -f "$HOME/.zshrc" ]; then
                SHELL_PROFILE="$HOME/.zshrc"
            elif [ -f "$HOME/.bashrc" ]; then
                SHELL_PROFILE="$HOME/.bashrc"
            fi
        fi

        if [ -n "$SHELL_PROFILE" ]; then
            echo ""
            echo "Adding to $SHELL_PROFILE..."

            SHELL_EXPORTS="
# Claude Code Safe Parallel Configuration (added by claude-config-template setup)
export SAFE_PARALLEL=true
export CONCURRENCY_LIMIT=2
export MEMORY_THRESHOLD=4096
export CLAUDE_MEMORY_LIMIT_MB=6144
export NODE_OPTIONS=\"--expose-gc --max-old-space-size=8192\"
"
            # Check if already added
            if ! grep -q "Claude Code Safe Parallel Configuration" "$SHELL_PROFILE" 2>/dev/null; then
                echo "$SHELL_EXPORTS" >> "$SHELL_PROFILE"
                echo -e "${GREEN}✓ Added configuration to $SHELL_PROFILE${NC}"
                echo -e "${YELLOW}⚠  Run 'source $SHELL_PROFILE' or restart terminal to apply${NC}"
            else
                echo -e "${BLUE}ℹ  Configuration already exists in $SHELL_PROFILE${NC}"
            fi
        else
            echo -e "${YELLOW}⚠  Could not detect shell profile${NC}"
            echo "Add these exports manually to your shell profile:"
            echo "$SHELL_EXPORTS"
        fi
    fi

elif [ "$env_choice" = "1" ]; then
    echo -e "${BLUE}ℹ  Using sequential mode (default)${NC}"
    echo "This is the safest option. No configuration needed."
    echo ""
    echo "To enable safe parallel later:"
    echo "  1) Add to .env: SAFE_PARALLEL=true"
    echo "  2) Or export: export SAFE_PARALLEL=true"
else
    echo "Skipped environment setup"
fi

# Step 11: Fast CLI Tools Installation (Optional)
echo ""
echo -e "${YELLOW}Step 11: Fast CLI Tools Installation (Optional)${NC}"
echo "Install superfast CLI tools for better performance?"
echo ""
echo "These tools significantly speed up code search and navigation:"
echo "  • ripgrep (rg)  - 10x faster than grep"
echo "  • fd            - 10x faster than find"
echo "  • fzf           - Interactive fuzzy finder"
echo "  • ag            - The Silver Searcher (alternative to grep)"
echo "  • pt            - Platinum Searcher (alternative to grep)"
echo "  • zoxide (z)    - Smart directory jumping"
echo ""
echo "Options:"
echo "  1) Install all recommended tools (recommended)"
echo "  2) Use default tools (grep, find)"
echo "  3) Skip (I'll install manually later)"
echo ""
read -p "Select (1-3): " fast_tools_choice

install_fast_tools() {
    local tools=("ripgrep" "fd" "fzf" "the_silver_searcher" "pt" "zoxide")
    local tool_names=("rg" "fd" "fzf" "ag" "pt" "z")

    echo ""
    echo "Detecting package manager..."

    # Detect OS and package manager
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo -e "${GREEN}✓ Homebrew detected${NC}"
            echo ""
            echo "Installing fast CLI tools..."

            for i in "${!tools[@]}"; do
                local tool="${tools[$i]}"
                local cmd="${tool_names[$i]}"

                if command -v "$cmd" &> /dev/null; then
                    echo -e "${BLUE}ℹ  $tool already installed${NC}"
                else
                    echo "Installing $tool..."
                    brew install "$tool" &> /dev/null &
                    local pid=$!
                    spinner $pid "Installing $tool..."
                    wait $pid

                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✓ $tool installed${NC}"
                    else
                        echo -e "${RED}✗ Failed to install $tool${NC}"
                    fi
                fi
            done
        else
            echo -e "${YELLOW}⚠  Homebrew not found. Please install Homebrew first:${NC}"
            echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            echo ""
            echo "Or install tools manually:"
            echo "  brew install ripgrep fd fzf the_silver_searcher pt zoxide"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            echo -e "${GREEN}✓ apt-get detected${NC}"
            echo ""
            echo "Installing fast CLI tools..."
            echo -e "${YELLOW}Note: This requires sudo privileges${NC}"

            # Map Homebrew names to apt package names
            local apt_tools=("ripgrep" "fd-find" "fzf" "silversearcher-ag")

            for tool in "${apt_tools[@]}"; do
                if dpkg -l | grep -q "^ii  $tool"; then
                    echo -e "${BLUE}ℹ  $tool already installed${NC}"
                else
                    echo "Installing $tool..."
                    sudo apt-get install -y "$tool" &> /dev/null

                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✓ $tool installed${NC}"
                    else
                        echo -e "${RED}✗ Failed to install $tool${NC}"
                    fi
                fi
            done

            # pt and zoxide need different installation on Linux
            echo -e "${YELLOW}Note: pt and zoxide may need manual installation on Linux${NC}"
        else
            echo -e "${YELLOW}⚠  apt-get not found. Manual installation required.${NC}"
            echo ""
            echo "Install tools manually based on your distro:"
            echo "  • Debian/Ubuntu: sudo apt-get install ripgrep fd-find fzf silversearcher-ag"
            echo "  • Fedora: sudo dnf install ripgrep fd-find fzf the_silver_searcher"
            echo "  • Arch: sudo pacman -S ripgrep fd fzf the_silver_searcher"
        fi
    else
        echo -e "${YELLOW}⚠  Unsupported OS. Please install tools manually.${NC}"
    fi
}

verify_fast_tools() {
    echo ""
    echo "Verifying installed tools..."
    local tools=("rg" "fd" "fzf" "ag" "pt" "z")
    local installed_count=0

    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            echo -e "${GREEN}✓ $tool is available${NC}"
            installed_count=$((installed_count + 1))
        else
            echo -e "${YELLOW}✗ $tool not found${NC}"
        fi
    done

    echo ""
    if [ $installed_count -eq ${#tools[@]} ]; then
        echo -e "${GREEN}✅ All fast tools installed successfully!${NC}"
    elif [ $installed_count -gt 0 ]; then
        echo -e "${BLUE}ℹ  $installed_count/${#tools[@]} tools installed${NC}"
    else
        echo -e "${YELLOW}⚠  No fast tools installed${NC}"
    fi
}

case $fast_tools_choice in
    1)
        install_fast_tools
        verify_fast_tools

        echo ""
        echo -e "${GREEN}Fast tools installed!${NC}"
        echo ""
        echo "Claude Code will now prefer these tools:"
        echo "  • Use 'rg' instead of 'grep'"
        echo "  • Use 'fd' instead of 'find'"
        echo "  • Use 'fzf' for interactive filtering"
        echo "  • Use 'z' for smart directory navigation"
        ;;
    2)
        echo -e "${BLUE}ℹ  Using default tools (grep, find)${NC}"
        echo "You can install fast tools later with:"
        echo "  brew install ripgrep fd fzf the_silver_searcher pt zoxide  # macOS"
        echo "  sudo apt-get install ripgrep fd-find fzf silversearcher-ag  # Linux"
        ;;
    3)
        echo "Skipped fast tools installation"
        echo -e "${BLUE}Tip: Install later for better performance:${NC}"
        echo "  macOS: brew install ripgrep fd fzf the_silver_searcher pt zoxide"
        echo "  Linux: sudo apt-get install ripgrep fd-find fzf silversearcher-ag"
        ;;
esac

# Step 12: Final instructions
echo ""
printf "["
printf "%50s" | tr ' ' '█'
printf "] 100%% Setup complete!\n"
echo ""
echo -e "${GREEN}=================================="
echo "✅ Setup Complete!"
echo "==================================${NC}"
echo ""
echo "Your .claude configuration is ready to use."
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review .claude/settings.local.json for permissions"
echo "2. Customize .claude/agents/delegation-map.json for your project"
echo "3. Try a command: /generate-api or /create-component"
echo "4. Hooks will automatically run on Edit/Write/Commit"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  - Fast tools: .claude/docs/FAST_TOOLS_GUIDE.md"
echo "  - Agent reference: .claude/docs/AGENT_REFERENCE.md"
echo "  - Agent system: .claude/docs/MCP_DELEGATION_GUIDE.md"
echo "  - Agent configs: .claude/agents/configs/README.md"
echo "  - Hooks: .claude/hooks/README.md"
echo "  - Commands: .claude/commands/*.md"
echo ""
echo -e "${YELLOW}Global Config:${NC}"
echo "  - CLAUDE.md: ~/.claude/CLAUDE.md (global instructions)"
echo "  - Shared agents: ~/.claude/agents/shared/ (if enabled)"
echo ""
echo -e "${GREEN}Happy coding with Claude! 🚀${NC}"
