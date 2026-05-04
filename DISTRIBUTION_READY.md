# Dex Distribution Status

Dex is now packaged as a Codex-first repository.

## Active distribution surfaces

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/hooks.json`
- `.agents/skills/`
- `.mcp.json.example`
- `.codex-plugin/plugin.json`
- `install.sh`

## Local generated artifacts

- `.mcp.json`
- `.venv/`
- `core/paths.json`

These should not be committed.

## What changed for Codex distribution

- project instructions moved to `AGENTS.md`
- Codex hooks live under `.codex/`
- repo-local skills live under `.agents/skills/`
- the installer now renders root `.mcp.json` from `.mcp.json.example`
- integration setup writes to Dex's local MCP config instead of a host-specific desktop config
- `.codex-plugin/` now provides an optional skills-only plugin bundle; repo-local hooks and MCP stay in the cloned Dex workspace

## Validation checklist

Run:

```bash
./scripts/verify-distribution.sh
```

Then verify:

- `README.md` describes Codex first
- `.mcp.json` is not tracked
- `.mcp.json.example` is tracked
- `AGENTS.md` exists
- `.codex-plugin/plugin.json` exists
- `.agents/skills/onboarding/SKILL.md` exists

## Legacy surfaces

The retired pre-Codex trees were deleted after the Codex-native runtime, hooks, skills, and plugin packaging surfaces were validated.
