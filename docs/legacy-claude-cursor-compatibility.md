# Legacy (Formerly Claude / Formerly Cursor) Surfaces

Dex now runs as a Codex-first repository.

## Inventory Snapshot

- The retired `.claude/skills/` tree contained `53` first-party skills; all now have corresponding Codex entrypoints under `.agents/skills/`.
- `.agents/skills/` currently has `54` first-party entrypoints because `onboarding` is a Codex-native skill with no legacy `.claude/skills/` source.
- The retired `.claude/hooks/` tree has been replaced by `.codex/hooks/`.
- The top-level `CLAUDE.md` file has been deleted.
- Active runtime code no longer exports `CLAUDE_MD` or falls back to `Claude_Code_*` agent-tooling paths.

## Category Analysis

### 1. Must Keep Because Active Codex Skills Still Depend On Them

None.

The wrapper-based `.agents/skills/* -> .claude/skills/*` dependency has been removed. First-party Codex skill files are now self-contained.

### 2. Keep Temporarily For Narrow Compatibility Fallbacks

None.

The last narrow runtime compatibility bridges were removed when:

- `core/paths.py` stopped exporting `CLAUDE_MD`
- `.codex/hooks/lib/dex-paths.cjs` stopped treating `CLAUDE.md` as a root marker
- `core/mcp/dex_improvements_server.py` stopped reading legacy `Claude_Code_*` fallback paths

### 3. Archive-Only Surfaces

The retired pre-Codex runtime directories have been deleted from the repo. The remaining archive-only surface is:

- `System/Demo/_original/`

They are not the active implementation for:

- instructions
- hooks
- install flow
- skill discovery
- plugin packaging
- MCP setup
- runtime root discovery
- agent-tooling changelog/report fallbacks

### 4. Maintenance And Historical References Only

These references still mention (Formerly Claude) or (Formerly Cursor) surfaces, but they do not represent active runtime dependencies:

- migration and archival docs such as `docs/codex-cli-migration-execplan.md`, `CHANGELOG.md`, and older `06-Resources/Dex_System/*` guides
- verification and hygiene scripts/tests that explicitly know legacy paths still exist while the repo transitions or preserves archive material
- explanatory copy in historical migration docs that documents the legacy-to-Codex boundary

Use these Codex-native surfaces instead:

- `AGENTS.md`
- `.codex/`
- `.agents/skills/`
- `.agents/skills/_available/`
- `.agents/skills/integrations/`
- `.mcp.json.example`
- `.codex-plugin/`

## Practical Deletion Read

From an active Codex-runtime perspective:

- the top-level `CLAUDE.md` file has been deleted from the repo.
- `.claude/skills/` has been deleted from the repo.
- `.claude/hooks/` has been deleted from the repo.
- the retired pre-Codex plugin bundle is no longer required by the active plugin packaging flow.

Those runtime surfaces are gone and are no longer active dependencies of the Codex-facing repo surface.
