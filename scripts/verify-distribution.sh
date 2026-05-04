#!/bin/bash
# Distribution Safety Check
# Run this before pushing Dex to GitHub to verify no credentials or personal data

set -e

echo "🔍 Dex Distribution Safety Check"
echo "================================="
echo ""

ERRORS=0
WARNINGS=0

resolve_python_cmd() {
    local candidate
    for candidate in python3 python; do
        if ! command -v "$candidate" >/dev/null 2>&1; then
            continue
        fi

        if "$candidate" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 11) else 1)
PY
        then
            echo "$candidate"
            return 0
        fi
    done

    return 1
}

PYTHON_CMD=""

# Check 1: Verify .mcp.json is not tracked
echo "✓ Checking .mcp.json is gitignored..."
if git ls-files --error-unmatch .mcp.json 2>/dev/null; then
    echo "  ❌ ERROR: .mcp.json is tracked by git!"
    echo "     Run: git rm --cached .mcp.json"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ .mcp.json not tracked"
fi

# Check 2: Verify .env is not tracked
echo ""
echo "✓ Checking .env is gitignored..."
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo "  ❌ ERROR: .env is tracked by git!"
    echo "     Run: git rm --cached .env"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ .env not tracked"
fi

# Check 3: Check for API keys in tracked files
echo ""
echo "✓ Scanning for API keys..."
KEY_MATCHES=$(git ls-files | xargs grep -E '(sk-ant-api|sk-ant-[a-zA-Z0-9]{90,}|sk-proj-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9-_]{35})' 2>/dev/null | grep -v 'env.example\|Distribution_Checklist' || true)
if [ -n "$KEY_MATCHES" ]; then
    echo "  ❌ ERROR: Potential API keys found:"
    echo "$KEY_MATCHES" | sed 's/^/     /'
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No API keys found"
fi

# Check 4: Check for user data folders
echo ""
echo "✓ Checking user data is gitignored..."
USER_FOLDERS=("00-Inbox" "01-Quarter_Goals" "02-Week_Priorities" "03-Tasks" "04-Projects" "05-Areas" "07-Archives")
for folder in "${USER_FOLDERS[@]}"; do
    if git ls-files --error-unmatch "$folder" 2>/dev/null | head -1 >/dev/null; then
        NON_MARKDOWN=$(git ls-files "$folder" | grep -vE '\.md$' || true)
        if [ -n "$NON_MARKDOWN" ]; then
            echo "  ⚠️  WARNING: $folder has tracked non-markdown files"
            echo "     Review whether they belong in demo mode only: System/Demo/$folder"
            WARNINGS=$((WARNINGS + 1))
        else
            echo "  ℹ️  INFO: $folder contains tracked scaffold markdown files"
        fi
    fi
done
if [ $WARNINGS -eq 0 ]; then
    echo "  ✅ No user data folders tracked (or only System/Demo)"
fi

# Check 5: Check for personal identifiable information
echo ""
echo "✓ Scanning for personal email addresses..."
EMAIL_MATCHES=$(git ls-files | xargs grep -E '[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|net|org|io|ai)' 2>/dev/null | \
    grep -vE '^System/Demo/|^core/tests/' | \
    grep -v 'README\|example\|template\|CHANGELOG\|Distribution_Checklist\|\.md:.*https://\|\.md:.*example@' | \
    grep -v 'user@example.com\|name@company.com\|you@domain.com\|company.com\|COMMERCIAL_LICENSE\|hey@heydex.ai' || true)
if [ -n "$EMAIL_MATCHES" ]; then
    echo "  ⚠️  WARNING: Email addresses found (verify these are examples):"
    echo "$EMAIL_MATCHES" | head -5 | sed 's/^/     /'
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ No personal emails found (or all are examples)"
fi

# Check 6: Verify critical files exist
echo ""
echo "✓ Checking critical distribution files..."
REQUIRED_FILES=("README.md" ".gitignore" "install.sh" ".mcp.json.example" "env.example" "AGENTS.md" ".codex/config.toml" ".codex/hooks.json" ".codex-plugin/plugin.json")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "  ❌ ERROR: Missing required file: $file"
        ERRORS=$((ERRORS + 1))
    fi
done
if [ $ERRORS -eq 0 ]; then
    echo "  ✅ All critical files present"
fi

# Check 7: Verify install.sh is executable
echo ""
echo "✓ Checking install.sh permissions..."
if [ ! -x "install.sh" ]; then
    echo "  ⚠️  WARNING: install.sh is not executable"
    echo "     Run: chmod +x install.sh"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ install.sh is executable"
fi

# Check 8: Verify .mcp.json.example uses template placeholders
echo ""
echo "✓ Checking .mcp.json.example uses placeholders..."
if ! grep -q '{{VAULT_PATH}}' .mcp.json.example; then
    echo "  ❌ ERROR: .mcp.json.example doesn't use {{VAULT_PATH}} placeholder"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Template uses {{VAULT_PATH}} placeholder"
fi

# Check 9: Count MCP servers
echo ""
echo "✓ Verifying MCP server count..."
MCP_COUNT=$(find core/mcp -maxdepth 1 -type f \( -name '*_server.py' -o -name 'update_checker.py' \) | wc -l | tr -d ' ')
TEMPLATE_COUNT=$(grep -c 'run-dex-mcp\.cjs' .mcp.json.example)
if [ "$MCP_COUNT" != "$TEMPLATE_COUNT" ]; then
    echo "  ⚠️  WARNING: MCP mismatch - $MCP_COUNT servers found, $TEMPLATE_COUNT in template"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ All $MCP_COUNT MCP servers in template"
fi

# Check 10: Personal paths in .mcp.json (if exists)
if [ -f ".mcp.json" ]; then
    echo ""
    echo "✓ Checking local .mcp.json doesn't contain personal paths..."
    if grep -q "/Users/dave" .mcp.json; then
        echo "  ℹ️  INFO: Your local .mcp.json has /Users/dave paths (this is fine - file is gitignored)"
    fi
fi

# Check 11: No hardcoded /Users/ paths in tracked code files
echo ""
echo "✓ Checking for hardcoded /Users/ paths in code..."
HARDCODED_PATHS=$(git ls-files -- '*.py' '*.ts' '*.cjs' '*.sh' | \
    xargs grep -n '/Users/' 2>/dev/null | \
    grep -v 'scripts/verify-distribution\.sh' | \
    grep -v 'scripts/check-path-consistency\.sh' | \
    grep -v '#.*/Users/' | \
    grep -v '//.*/Users/' || true)
if [ -n "$HARDCODED_PATHS" ]; then
    echo "  ❌ ERROR: Hardcoded /Users/ paths found in code:"
    echo "$HARDCODED_PATHS" | head -10 | sed 's/^/     /'
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No hardcoded /Users/ paths in code"
fi

# Check 12: package.json version matches CHANGELOG latest
echo ""
echo "✓ Checking package.json version matches CHANGELOG..."
PKG_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
CHANGELOG_VERSION=$(grep -m1 '^\#\# \[' CHANGELOG.md | sed 's/.*\[\([0-9][0-9.]*\)\].*/\1/')
if [ "$PKG_VERSION" != "$CHANGELOG_VERSION" ]; then
    echo "  ⚠️  WARNING: package.json ($PKG_VERSION) != CHANGELOG ($CHANGELOG_VERSION)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ Versions match: $PKG_VERSION"
fi

# Check 13: Resolve a supported Python runtime for validation helpers
echo ""
echo "✓ Resolving Python runtime for validation..."
if PYTHON_CMD=$(resolve_python_cmd); then
    echo "  ✅ Using $PYTHON_CMD"
else
    echo "  ❌ ERROR: Python 3.11+ is required for distribution validation"
    ERRORS=$((ERRORS + 1))
fi

# Check 14: Template and repo-local MCP runtime stay in sync
echo ""
echo "✓ Checking MCP template and repo-local runtime targets..."
if [ -n "$PYTHON_CMD" ] && [ -f ".mcp.json.example" ] && [ -f ".codex/config.toml" ]; then
    if MCP_VALIDATION_OUTPUT=$("$PYTHON_CMD" - <<'PY' 2>&1
import json
from pathlib import Path
import sys
import tomllib

repo_root = Path('.')
template_servers = json.loads((repo_root / '.mcp.json.example').read_text(encoding='utf-8')).get('mcpServers', {})
runtime_servers = tomllib.loads((repo_root / '.codex/config.toml').read_text(encoding='utf-8')).get('mcp_servers', {})
errors = []

def normalize_template_env(env):
    normalized = dict(env)
    if normalized.get('VAULT_PATH') == '{{VAULT_PATH}}':
        normalized['VAULT_PATH'] = '.'
    return normalized

if set(template_servers) != set(runtime_servers):
    errors.append("template and .codex/config.toml server inventories diverged")

launcher_path = repo_root / 'core' / 'scripts' / 'run-dex-mcp.cjs'
if not launcher_path.is_file():
    errors.append("missing launcher core/scripts/run-dex-mcp.cjs")

for server_name, template_config in template_servers.items():
    runtime_config = runtime_servers.get(server_name)
    if runtime_config is None:
        continue

    template_args = template_config.get('args') or []
    runtime_args = runtime_config.get('args') or []

    if len(template_args) != 2:
        errors.append(f"{server_name}: template args must stay launcher + filename only")
        continue
    if len(runtime_args) != 2:
        errors.append(f"{server_name}: runtime args must stay launcher + filename only")
        continue

    if template_config.get('command') != 'node':
        errors.append(f"{server_name}: template command drifted from node")
    if runtime_config.get('command') != 'node':
        errors.append(f"{server_name}: runtime command drifted from node")
    if template_args[0] != '{{VAULT_PATH}}/core/scripts/run-dex-mcp.cjs':
        errors.append(f"{server_name}: template launcher drifted: {template_args[0]}")
    if runtime_args[0] != './core/scripts/run-dex-mcp.cjs':
        errors.append(f"{server_name}: runtime launcher drifted: {runtime_args[0]}")

    template_env = template_config.get('env') or {}
    runtime_env = runtime_config.get('env') or {}
    normalized_template_env = normalize_template_env(template_env)
    if runtime_env != normalized_template_env:
        errors.append(
            f"{server_name}: runtime env drifted from template: {runtime_env} != {normalized_template_env}"
        )
    if runtime_config.get('cwd') != '.':
        errors.append(f"{server_name}: runtime cwd drifted from .")

    server_filename = template_args[1]
    server_path_obj = Path(server_filename)
    if server_path_obj.is_absolute():
        errors.append(f"{server_name}: absolute MCP server paths are not allowed: {server_filename}")
        continue
    if '..' in server_path_obj.parts:
        errors.append(f"{server_name}: parent-directory MCP server paths are not allowed: {server_filename}")
        continue
    if len(server_path_obj.parts) != 1:
        errors.append(f"{server_name}: MCP server must stay a bare filename: {server_filename}")
        continue

    if runtime_args[1] != server_filename:
        errors.append(f"{server_name}: runtime server filename drifted from template: {runtime_args[1]} != {server_filename}")

    server_path = repo_root / 'core' / 'mcp' / server_filename
    if not server_path.is_file():
        errors.append(f"{server_name}: missing MCP server core/mcp/{server_filename}")

if errors:
    print('\n'.join(errors))
    sys.exit(1)
PY
    ); then
        echo "  ✅ MCP template and repo-local runtime stay in sync"
    else
        echo "  ❌ ERROR: MCP template or repo-local runtime drifted:"
        echo "$MCP_VALIDATION_OUTPUT" | sed 's/^/     /'
        ERRORS=$((ERRORS + 1))
    fi
elif [ -z "$PYTHON_CMD" ]; then
    echo "  ℹ️  INFO: Skipping MCP validation because no supported Python runtime was found"
else
    echo "  ❌ ERROR: .mcp.json.example or .codex/config.toml not found"
    ERRORS=$((ERRORS + 1))
fi

# Check 15: Plugin manifest stays inside the supported skills-only boundary
echo ""
echo "✓ Checking plugin manifest support boundary..."
if [ -n "$PYTHON_CMD" ] && [ -f ".codex-plugin/plugin.json" ]; then
    if PLUGIN_VALIDATION_OUTPUT=$("$PYTHON_CMD" - <<'PY' 2>&1
import json
from pathlib import Path
import sys

manifest = json.loads(Path('.codex-plugin/plugin.json').read_text(encoding='utf-8'))
errors = []

if manifest.get('skills') != './.agents/skills/':
    errors.append("plugin manifest must point skills at ./.agents/skills/")
if 'hooks' in manifest:
    errors.append("plugin manifest must not bundle hooks")
if 'mcpServers' in manifest:
    errors.append("plugin manifest must not bundle MCP servers")

if errors:
    print('\n'.join(errors))
    sys.exit(1)
PY
    ); then
        echo "  ✅ Plugin manifest uses the supported skills-only surface"
    else
        echo "  ❌ ERROR: Plugin manifest exceeds the supported skills-only surface:"
        echo "$PLUGIN_VALIDATION_OUTPUT" | sed 's/^/     /'
        ERRORS=$((ERRORS + 1))
    fi
elif [ -z "$PYTHON_CMD" ]; then
    echo "  ℹ️  INFO: Skipping plugin manifest validation because no supported Python runtime was found"
else
    echo "  ⚠️  WARNING: .codex-plugin/plugin.json not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "================================="
echo "📊 Summary"
echo "================================="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Distribution check FAILED - fix errors before pushing to GitHub"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Distribution check passed with warnings - review above"
    exit 0
else
    echo "✅ Distribution check PASSED - safe to push to GitHub!"
    echo ""
    echo "Next steps:"
    echo "  1. Review CHANGELOG.md"
    echo "  2. Update version in package.json if needed"
    echo "  3. Commit and push: git push origin main"
    echo "  4. Create release: git tag -a v1.0.0 -m 'Initial release'"
    exit 0
fi
