#!/bin/bash
set -euo pipefail

INPUT="$(cat)"

extract_json_field() {
  local python_expr="$1"
  python3 -c "import json, sys
try:
    data = json.loads(sys.stdin.read())
    ${python_expr}
except Exception:
    print('')" <<<"$INPUT" 2>/dev/null
}

TOOL_NAME="$(extract_json_field "print(data.get('tool_name', ''))")"
COMMAND="$(extract_json_field "print(data.get('tool_input', {}).get('command', ''))")"

if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

block() {
  printf '%s\n' "$1" >&2
  exit 2
}

if echo "$COMMAND" | grep -qE '\bclaude\b\s+mcp\s+add\b'; then
  block "Blocked: legacy 'claude mcp add' command. Dex on Codex manages MCP configuration through .codex/config.toml and the repo-local .mcp.json flow instead."
fi

if echo "$COMMAND" | grep -qE '\bcodex\b.*\bmcp\b.*\b(add|remove|delete|enable|disable|set|edit|write|login)\b'; then
  block "Blocked: direct MCP CLI mutation. Update the repository MCP configuration files intentionally instead of using ad hoc CLI mutation."
fi

BLOCKED_SCRAPERS="firecrawl_scrape firecrawl_search firecrawl_crawl firecrawl_map firecrawl_extract firecrawl_batch_scrape firecrawl_deep_research webfetch rag-web-browser rag_web_browser"
for scraper in $BLOCKED_SCRAPERS; do
  if echo "$COMMAND" | grep -qi "$scraper"; then
    block "Blocked: use Scrapling as the default scraper instead of $scraper."
  fi
done

if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?(-[a-zA-Z]*r[a-zA-Z]*\s+)?(\/|~\/?\s|"\$HOME"|\/Users)'; then
  block "Blocked: recursive delete targeting root, home, or /Users."
fi

if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/'; then
  block "Blocked: rm -rf /"
fi

if echo "$COMMAND" | grep -qiE '(diskutil\s+eraseDisk|mkfs\s|dd\s+if=)'; then
  block "Blocked: disk wipe/format command."
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  block "Blocked: force push to main/master."
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\s+(main|master).*--force'; then
  block "Blocked: force push to main/master."
fi

if echo "$COMMAND" | grep -qiE '(DROP\s+TABLE|DROP\s+DATABASE)'; then
  block "Blocked: SQL DROP command."
fi

exit 0
