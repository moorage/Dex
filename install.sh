#!/bin/bash

set -e

echo "Dex Codex setup"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! xcode-select -p >/dev/null 2>&1; then
        echo "Command Line Developer Tools are required on macOS."
        echo "macOS will prompt you to install them now."
        echo ""
        echo "Press Enter to continue..."
        read -r
        xcode-select --install 2>/dev/null || true
        until xcode-select -p >/dev/null 2>&1; do
            sleep 5
        done
        echo "Command Line Developer Tools installed."
        echo ""
    fi
fi

if ! command -v git >/dev/null 2>&1; then
    echo "Git is required. Install it from https://git-scm.com and rerun ./install.sh."
    exit 1
fi
echo "Git: $(git --version | cut -d' ' -f3)"

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js 18+ is required. Install it from https://nodejs.org/ and rerun ./install.sh."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js 18+ is required. Found $(node -v)."
    exit 1
fi
echo "Node.js: $(node -v)"

PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    if python --version 2>&1 | grep -q "Python 3"; then
        PYTHON_CMD="python"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "Python 3.11+ is required. Install it from https://www.python.org/downloads/ and rerun ./install.sh."
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f2)
if [ "$PYTHON_MAJOR" -ne 3 ] || [ "$PYTHON_MINOR" -lt 11 ]; then
    echo "Python 3.11+ is required. Found $PYTHON_VERSION."
    exit 1
fi
echo "Python: $PYTHON_VERSION"

if command -v codex >/dev/null 2>&1; then
    echo "Codex: $(codex --version 2>/dev/null || echo "installed")"
else
    echo "Codex CLI not found."
    echo "Install it with 'npm install -g @openai/codex' or 'brew install codex'."
    echo "You can continue setup now and install Codex before first use."
fi

echo ""
echo "Installing JavaScript dependencies..."
if [ -f "package-lock.json" ]; then
    if ! command -v npm >/dev/null 2>&1; then
        echo "npm is required for this repo because package-lock.json is checked in."
        exit 1
    fi
    npm install
elif [ -f "pnpm-lock.yaml" ]; then
    if ! command -v pnpm >/dev/null 2>&1; then
        echo "pnpm is required for this repo because pnpm-lock.yaml is checked in."
        exit 1
    fi
    pnpm install
elif command -v npm >/dev/null 2>&1; then
    npm install
elif command -v pnpm >/dev/null 2>&1; then
    pnpm install
else
    echo "npm or pnpm is required."
    exit 1
fi

echo ""
echo "Creating Python virtual environment..."
if [ ! -d ".venv" ]; then
    "$PYTHON_CMD" -m venv .venv
fi

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    VENV_PYTHON=".venv/Scripts/python.exe"
    VENV_PIP=".venv/Scripts/pip.exe"
else
    VENV_PYTHON=".venv/bin/python"
    VENV_PIP=".venv/bin/pip"
fi

echo "Installing Dex MCP requirements..."
"$VENV_PIP" install -r core/mcp/requirements.txt --quiet

if [ ! -f ".mcp.json" ]; then
    echo ""
    echo "Rendering local .mcp.json..."
    CURRENT_PATH="$(pwd)"
    sed "s|{{VAULT_PATH}}|$CURRENT_PATH|g" .mcp.json.example > .mcp.json
fi

echo ""
echo "Generating shared path constants..."
VAULT_PATH="$(pwd)" "$VENV_PYTHON" core/paths.py >/dev/null

echo ""
echo "Verifying core Dex MCP imports..."
if "$VENV_PYTHON" -c "import mcp, yaml" >/dev/null 2>&1; then
    echo "Dex MCP runtime: ready"
else
    echo "Dex MCP runtime could not be verified. Check .venv and core/mcp/requirements.txt."
    exit 1
fi

echo ""
if [[ "$OSTYPE" == "darwin"* ]] && ls "$HOME/Library/Application Support/Granola/cache-v"*.json >/dev/null 2>&1; then
    echo "Granola detected: meeting intelligence can use synced Granola notes."
else
    echo "Granola not detected: meeting intelligence remains optional."
fi

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Start Codex in this repo: codex"
echo "  2. Ask Codex: Use \$onboarding to set up Dex for this workspace."
echo "  3. After onboarding: Use \$getting-started to walk me through Dex."
