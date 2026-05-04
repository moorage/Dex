# Codex CLI Migration ExecPlan

Last updated: 2026-05-04

Migration status: Completed on 2026-05-04.

This document now serves two purposes:

- the original repo-grounded migration survey,
- and the final closure record for the Codex cutover.

The historical survey below is preserved so maintainers can see what changed. Any future-tense language in the survey or phase sections is superseded by the completion sections added to this document.

## Goal

Migrate Dex from a Claude Code and Cursor-first repository to a Codex CLI-first repository without losing:

- deterministic automation,
- MCP-backed workflows,
- onboarding,
- skill discoverability,
- packaging/distribution,
- or the high-value Dex workflows that make the system useful.

This is a survey-first plan. It is intentionally exhaustive, repo-grounded, and biased toward safe cutover over fast cutover.

## Success Criteria

- A fresh clone works in Codex CLI without requiring Claude Code or Cursor.
- The repo contains checked-in Codex-native project instructions, config, hooks, and skill surfaces.
- Every currently active or referenced Claude hook has an explicit disposition: port, redesign, or retire.
- Core Dex workflows are available as Codex skills under `.agents/skills`.
- MCP configuration has one canonical source of truth.
- Onboarding no longer edits or depends on `CLAUDE.md`.
- CI validates the Codex-facing hooks, skills, and migration invariants.
- Docs, install flow, and distribution assets describe Codex first and treat Claude/Cursor as legacy compatibility only if intentionally retained.

## Completion Snapshot

All migration success criteria above are now satisfied in the checked-in repo.

Completed outcomes:

- `AGENTS.md` is the canonical project instruction file.
- `.codex/config.toml`, `.codex/hooks.json`, and `.codex/hooks/*` are the active Codex hook/config surfaces.
- root `.mcp.json` and `.mcp.json.example` are the canonical repo-local MCP config artifacts.
- `.codex-plugin/plugin.json` plus `.mcp.plugin.json` provide a Codex-native packaging surface.
- onboarding no longer edits `CLAUDE.md` and now writes mutable state into `System/` artifacts.
- first-party Dex workflows now have Codex skill entrypoints under `.agents/skills/`.
- integration setup no longer writes `claude_desktop_config.json`.
- active install/docs/runtime surfaces are Codex-first; legacy Claude/Cursor assets are explicitly archival.

## Resolved Scope Decisions

The open migration decisions were resolved as follows:

- End state: Codex first, with legacy Claude/Cursor assets retained only as archival or compatibility reference.
- Canonical instruction surface: `AGENTS.md`.
- Canonical mutable profile/config surfaces: `System/user-profile.yaml`, `System/pillars.yaml`, root `.mcp.json`.
- Hook substrate: `.codex/config.toml` + `.codex/hooks.json` + `.codex/hooks/*`.
- Packaging: in scope and completed via `.codex-plugin/plugin.json` plus `.mcp.plugin.json`.
- First-party skill coverage: completed in `.agents/skills/`, with direct Codex ports where available and Codex entrypoint wrappers for the remaining first-party legacy skills.
- Optional/vendor skill surfaces: `_available` and `anthropic-*` remain outside the active Codex product surface.

## Authoritative Codex Constraints

These are the external constraints this migration has to respect.

- Codex reads project instructions from `AGENTS.md`; fallback filenames can be configured through `project_doc_fallback_filenames`.
  - https://developers.openai.com/codex/guides/agents-md
- Codex repo skills live under `.agents/skills`.
  - https://developers.openai.com/codex/concepts/customization#skills
- Codex hooks require `features.codex_hooks = true` and can be configured in `.codex/config.toml` or `hooks.json`.
  - https://developers.openai.com/codex/hooks
  - https://developers.openai.com/codex/config-reference#configtoml
- Codex hook events are `SessionStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`, and `Stop`.
  - `Notification` and `SessionEnd` are not documented Codex hook events and cannot be assumed to exist.
- Codex plugins use `.codex-plugin/plugin.json`; bundled `skills/`, `.mcp.json`, and `hooks/hooks.json` live at the plugin root, not inside `.codex-plugin/`.
  - https://developers.openai.com/codex/plugins/build#plugin-structure
  - https://developers.openai.com/codex/plugins/build#bundled-mcp-servers-and-lifecycle-config

## Executive Summary

Dex is not "lightly Claude-flavored." The current repo has Claude/Cursor coupling in six separate layers:

1. Instructions and user profile storage are centered on `CLAUDE.md`.
2. Lifecycle automation is centered on `.claude/settings.json` and `.claude/hooks/*`.
3. Workflow packaging is centered on `.claude/skills/*`, Claude slash-command language, and host-specific prompt tools like `AskUserQuestion`.
4. Onboarding and integration setup assume Cursor or Claude Desktop/CLI.
5. Distribution assets target Claude plugins, not Codex plugins.
6. Multiple runtime modules and docs hardcode Claude/Cursor paths and behaviors.

There is also an incomplete Codex migration already in the tree:

- `.agents/skills/` exists, but only contains 3 skills.
- `.agents/skills/process-meetings/SKILL.md` points at `.Codex/hooks/...`, but `.Codex/` does not exist.
- `AGENTS.md`, `.codex/`, `.codex-plugin/`, and root `.mcp.json` are all absent from the checked-in repo.

The correct migration is not a search-and-replace. It is a staged substrate migration:

1. establish the Codex-native instruction/config/hook base,
2. port core workflows,
3. rewrite onboarding and MCP setup,
4. move packaging/distribution,
5. validate parity,
6. then delete Claude/Cursor-specific infrastructure.

## Historical Survey Snapshot

### 1. Codex-native repo surfaces are mostly missing

Checked-in repository state:

- `AGENTS.md`: missing
- `.codex/`: missing
- `.codex-plugin/`: missing
- `.mcp.json`: missing
- `System/.mcp.json`: missing
- `.Codex/`: missing
- `.cursor/mcp.json`: missing
- `System/.mcp.json.example`: present
- `.agents/skills/*`: present, but partial and currently broken

Implication:

- Codex portability currently depends on out-of-band instructions, not repo-local files.
- The first migration milestone must be to make the repo self-describing to Codex.

### 2. `CLAUDE.md` is the current instruction and mutable profile store

Current state:

- `CLAUDE.md` is the canonical project instruction file.
- Multiple codepaths and skills explicitly reference `CLAUDE.md`.
- `core/paths.py` hardcodes `CLAUDE_MD = VAULT_ROOT / 'CLAUDE.md'`.
- `core/mcp/onboarding_server.py` updates the `CLAUDE.md` User Profile section.
- Many skills instruct the agent to read, edit, or preserve blocks inside `CLAUDE.md`.

Migration implication:

- Codex needs a real checked-in `AGENTS.md`.
- The current "static instructions + mutable user profile in one file" design should be split.

Recommended target:

- `AGENTS.md` becomes the stable project instruction layer.
- A separate checked-in or generated user profile file stores mutable onboarding data.
- Any remaining `CLAUDE.md` support should be transitional only, via Codex fallback filename config.

### 3. Global Claude hook registry lives in `.claude/settings.json`

Current configured hooks:

| Event | Matcher | Current command(s) | Codex status |
| --- | --- | --- | --- |
| `SessionStart` | none | `bash .claude/hooks/session-start.sh` | portable in principle |
| `SessionStart` | none | inline `git pull --quiet ...` JSON emitter | portable in principle |
| `PreToolUse` | `Read` | `node .claude/hooks/person-context-injector.cjs` | matcher must be redesigned |
| `PreToolUse` | `Read` | `node .claude/hooks/company-context-injector.cjs` | matcher must be redesigned |
| `PreToolUse` | `Bash` | `node .claude/hooks/ensure-mcp-user-scope.cjs` | matcher and command semantics must be redesigned |
| `Stop` | none | `afplay /System/Library/Sounds/Ping.aiff` | portable if desired |
| `Notification` | `permission_prompt\|elicitation_dialog` | `afplay /System/Library/Sounds/Ping.aiff` | unsupported event in Codex |
| `SessionEnd` | none | `"$CLAUDE_PROJECT_DIR"/.claude/hooks/session-end.sh "$transcript_path"` | unsupported event in Codex |

Critical compatibility note:

- The current hook matchers assume Claude tool names such as `Read` and `Bash`.
- Codex hook matching must be revalidated against Codex's actual tool names and event payloads.
- A direct config translation is not safe.

### 4. Complete Claude hook inventory

This is the complete `.claude/hooks` surface identified in the repo.

| Path | Current role | Current trigger/source | Migration action |
| --- | --- | --- | --- |
| `.claude/hooks/session-start.sh` | injects strategic and tactical Dex context; checks demo mode; self-heals launch-agent vault paths; skips background checks during onboarding | global `SessionStart` hook | port, but rewrite env/path assumptions |
| `.claude/hooks/session-end.sh` | logs session completion into `System/Session_Learnings/YYYY-MM-DD.md` with transcript reference | global `SessionEnd` hook | redesign; Codex has no documented `SessionEnd` |
| `.claude/hooks/person-context-injector.cjs` | injects related person context when reading notes/files that mention people | global `PreToolUse(Read)` hook | port, but remap matcher and payload parsing |
| `.claude/hooks/company-context-injector.cjs` | injects company/account context on relevant file reads | global `PreToolUse(Read)` hook | port, but remap matcher and payload parsing |
| `.claude/hooks/ensure-mcp-user-scope.cjs` | blocks or asks when `claude mcp add` is used without explicit `--scope` | global `PreToolUse(Bash)` hook | redesign for Codex MCP config workflow |
| `.claude/hooks/daily-plan-quick-ref.cjs` | generates a condensed daily plan quick reference file | skill-local `Stop` hook in `daily-plan` | port if workflow remains core |
| `.claude/hooks/career-evidence-capture.cjs` | captures achievement evidence from career files into `05-Areas/Career/Evidence_Log.md` | skill-local `PostToolUse(Write)` in `career-coach` | port if skill remains core |
| `.claude/hooks/post-meeting-person-update.cjs` | updates person pages from processed meeting notes | skill-local `PostToolUse(Write)` in `process-meetings` | port |
| `.claude/hooks/meeting-summary-generator.cjs` | placeholder summary generator after meeting processing | skill-local `Stop` in `process-meetings` | either implement properly or delete |
| `.claude/hooks/dex-safety-guard.sh` | blocks dangerous shell commands and enforces scraper/tool preferences | currently present but not wired in `.claude/settings.json` | decide whether to activate in Codex |
| `.claude/hooks/meeting-cache-builder.cjs` | builds `System/Memory/meeting-cache.json` from meeting notes | standalone/manual utility | keep as utility; no hook dependency required |
| `.claude/hooks/maintenance.cjs` | vault health checks for stale files, broken links, orphaned pages, stale memory | standalone/manual utility | keep as utility; optional future Codex hook |
| `.claude/hooks/paths.cjs` | shared hook path resolution helper | shared library | keep or replace with Codex-native helper |
| `.claude/hooks/tests/context-injectors.test.cjs` | tests for context injector behavior | CI via `npm run test:hooks` | port and keep in CI |
| `.claude/hooks/README.md` | hook documentation and Claude-vs-Cursor explanation | docs only | rewrite for Codex |

Also referenced but missing:

- `.claude/hooks/integration-concierge.cjs` is referenced by:
  - `.claude/flows/onboarding.md`
  - `.claude/skills/getting-started/SKILL.md`
  - `.claude/skills/dex-level-up/SKILL.md`
- `core/scripts/sync-mcp-configs.sh` is referenced by `install.sh` but missing.

These are existing integrity gaps, not just migration gaps.

### 5. Skill system is still overwhelmingly Claude-native

Inventory:

- `.claude/skills`: 96 `SKILL.md` files
- `.claude/skills/_available`: 27 optional skill files
- `.claude/skills/anthropic-*`: 16 vendor/Anthropic skill files
- top-level non-vendor `.claude/skills`: 69 skill files
- `.agents/skills`: 3 skill files

Current incompatibilities found in skills:

- Claude-specific frontmatter keys such as `hooks:`, `context: fork`, `model_hint`, and `disable-model-invocation`
- Claude/Cursor prompt tools: `AskUserQuestion`, `AskQuestion`
- slash-command assumptions such as `/setup`, `/daily-plan`, `/meeting-prep`
- direct references to `.claude/hooks/*`
- direct references to `CLAUDE.md`
- direct references to Cursor UX and Claude Desktop config

Existing partial Codex ports:

- `.agents/skills/getting-started/SKILL.md`
- `.agents/skills/industry-truths/SKILL.md`
- `.agents/skills/process-meetings/SKILL.md`

Current problems in `.agents`:

- still contain `AskUserQuestion` logic,
- still contain Cursor-specific guidance,
- still use hook frontmatter,
- still point to missing `.Codex/hooks/...` paths,
- and therefore cannot be treated as production-ready Codex skills.

### 6. Onboarding flow is host-specific

Primary onboarding surface:

- `.claude/flows/onboarding.md`

Current behavior assumptions:

- detects Cursor via `AskQuestion`
- detects Claude Code via `AskUserQuestion`
- contains Cursor version logic
- contains Cursor and Claude Desktop permission guidance
- updates `CLAUDE.md`
- writes MCP config
- references the missing `.claude/hooks/integration-concierge.cjs`

Migration implication:

- onboarding needs a Codex-native rewrite, not a mechanical port.
- the rewrite should avoid host-specific tool detection and avoid mutating the core instruction file.

### 7. MCP configuration is inconsistent even before migration

Current state:

- `install.sh` expects root `.mcp.json`.
- `core/utils/preflight.py` also expects root `.mcp.json`.
- `core/mcp/onboarding_server.py` and `core/paths.py` target `System/.mcp.json`.
- `System/.mcp.json.example` exists, but neither `System/.mcp.json` nor root `.mcp.json` exists in the repo.
- `.claude/mcp/*.json` contains 7 Claude-oriented MCP config reference files.

Implication:

- Codex migration should not preserve this ambiguity.
- One canonical MCP config path must be chosen and used everywhere.

Recommended target:

- root `.mcp.json` as the canonical project MCP config artifact,
- optionally generated or mirrored from `.codex/config.toml` only if there is a strong operational need,
- no `System/.mcp.json` write path unless deliberately retained for legacy reasons.

### 8. Integration setup writes to Claude Desktop config

Files directly coupled to Claude Desktop config:

- `core/integrations/detect.py`
- `core/integrations/google/setup.py`
- `core/integrations/notion/setup.py`
- `core/integrations/slack/setup.py`
- `.claude/skills/integrations/README.md`

Current behavior:

- these codepaths locate or modify `claude_desktop_config.json`.

Migration implication:

- these setups must target Codex-compatible MCP configuration instead.
- the integration story has to be rewritten for Codex users rather than "write to Claude Desktop, then restart Claude."

### 9. Packaging and distribution are still Claude plugin-oriented

Current packaging surfaces:

- `.claude-plugin/plugin.json`
- `.claude-plugin/README.md`
- `.claude-plugin/PLUGIN_README.md`
- `.claude-plugin/INSTALLATION_QUICK_START.md`
- `.claude-plugin/DISTRIBUTION_GUIDE.md`
- `.claude-plugin/EXECUTIVE_SUMMARY.md`
- `.claude-plugin/READY_TO_PUBLISH.md`
- `.claude-plugin/validate-plugin.sh`

Current behavior:

- docs and validation assume `claude plugin ...`
- manifest structure is Claude-specific
- manifest includes inline MCP server packaging assumptions

Migration implication:

- if Dex should be distributable as a Codex plugin, packaging has to be rebuilt against Codex plugin structure rather than adapted in place.

### 10. Vendored Claude plugin baggage exists in-repo

Vendored surface:

- `.claude/plugins/compound-engineering`

Inventory:

- 24 commands
- 28 agents
- 15 skills
- its own `CLAUDE.md`
- its own `.claude-plugin/plugin.json`

Migration implication:

- this content should be explicitly triaged.
- full parity porting would expand scope massively.
- the migration plan should decide whether to:
  - archive it as vendor reference only,
  - selectively port pieces,
  - or remove it from the Codex-facing distribution entirely.

### 11. Docs and install flow are heavily Claude/Cursor branded

High-signal user-facing surfaces that need rewriting:

- `README.md`
- `install.sh`
- `env.example`
- `DISTRIBUTION_READY.md`
- `CONTRIBUTING.md`
- `System/Demo/README.md`
- `System/Demo/_original/README.md`

Observed issues:

- install flow ends with "In Cursor chat, type: `/setup`"
- README positions Cursor as default and Claude Code as the hook-capable upgrade path
- docs describe Claude/Cursor permissions and troubleshooting instead of Codex
- distribution docs assume Claude plugin install/validate flows

### 12. Runtime code contains Claude-specific product logic

Important runtime surfaces to migrate:

- `core/paths.py`
- `core/mcp/onboarding_server.py`
- `core/utils/preflight.py`
- `core/mcp/work_server.py`
- `core/mcp/dex_improvements_server.py`
- `core/integrations/detect.py`
- `core/integrations/google/setup.py`
- `core/integrations/notion/setup.py`
- `core/integrations/slack/setup.py`

Examples of current coupling:

- `CLAUDE.md` hardcoded as a path constant
- onboarding mutates `CLAUDE.md`
- MCP config path disagreement between root and `System/`
- work server guidance points at `.claude/hooks/meeting-cache-builder.cjs`
- Dex improvements logic is explicitly framed around Anthropic Claude Code release monitoring

## What Must Migrate

This is the concrete migration scope, grouped by system boundary.

### A. Instruction Substrate

Must migrate:

- `CLAUDE.md` ownership model
- checked-in Codex project instructions
- user profile storage strategy
- any code that reads or writes the instruction file

Target:

- `AGENTS.md` as the canonical project instruction file
- optional temporary `project_doc_fallback_filenames = ["CLAUDE.md"]` bridge during rollout
- separate mutable user profile artifact, not `AGENTS.md`

### B. Hook Substrate

Must migrate:

- `.claude/settings.json`
- all wired Claude hooks
- all skill-local hook references
- hook tests and hook docs

Target:

- `.codex/config.toml` with `features.codex_hooks = true`
- `.codex/hooks.json` or inline `[hooks]` config
- `.codex/hooks/*` or plugin-root `hooks/*`
- explicit redesign for unsupported `Notification` and `SessionEnd`

### C. Skill Substrate

Must migrate:

- core Dex skills from `.claude/skills` to `.agents/skills`
- unsupported frontmatter and host-specific instructions
- slash-command language
- skill-specific hooks

Target:

- Codex-native skill files in `.agents/skills`
- minimal metadata
- plain conversational prompting instead of `AskUserQuestion`
- explicit linkage to Codex hook/config surfaces

### D. Onboarding and Setup

Must migrate:

- onboarding flow docs
- install flow
- runtime onboarding server behavior
- user profile writes
- onboarding-related docs and prompts

Target:

- Codex-first onboarding path
- install instructions that end with Codex usage, not Cursor chat
- no writes to `CLAUDE.md`

### E. MCP and Integrations

Must migrate:

- canonical MCP config path
- integration setup writers
- onboarding MCP config generation
- `.claude/mcp/*.json` reference model

Target:

- one source of truth for project MCP config
- Codex-compatible integration writers
- no dependency on `claude_desktop_config.json`

### F. Packaging and Distribution

Must migrate:

- `.claude-plugin/*`
- any plugin manifest assumptions
- validation script
- distribution docs

Target:

- `.codex-plugin/plugin.json`
- plugin root layout matching Codex expectations
- Codex-native packaging docs and validation

### G. Documentation and Messaging

Must migrate:

- all primary install and usage docs
- legacy host recommendations
- troubleshooting
- demo docs

Target:

- Codex-first README and install flow
- Claude/Cursor references only where intentionally supported

### H. CI and Validation

Must migrate:

- hook tests
- migration regressions
- stale reference detection

Target:

- CI catches broken `.claude`/`.Codex` references in Codex-facing surfaces
- CI validates hooks, skills, and config invariants

## Recommended Target Architecture

This is the target state the migration should converge on.

### 1. Checked-in project surfaces

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/hooks.json` or inline hooks in `.codex/config.toml`
- `.codex/hooks/*`
- `.agents/skills/*`
- root `.mcp.json`

### 2. Mutable user state

Do not keep mutable onboarding profile data inside `AGENTS.md`.

Recommended split:

- `AGENTS.md`: stable agent/project instructions
- `System/User/Profile.md` or similar: mutable user profile and preferences
- onboarding updates the profile file
- `AGENTS.md` points Codex to the profile file

### 3. Transitional compatibility

Use a bridge period rather than a flag day.

Recommended bridge:

- add `.codex/config.toml` early,
- enable `project_doc_fallback_filenames = ["CLAUDE.md"]` temporarily,
- port hooks and skills while old Claude files still exist,
- then remove fallback after `AGENTS.md` parity is proven.

## Migration Decisions Required Up Front

These decisions should be made before broad file edits begin.

1. Is the end state "Codex only" or "Codex first, Claude/Cursor optional legacy compatibility"?
2. Should Dex continue shipping as a plugin, or is project-repo usage enough for phase 1?
3. Should the vendored `compound-engineering` Claude plugin be ported, archived, or removed from the product surface?
4. Should Anthropic-branded vendor skills be retained as optional references, renamed and ported, or dropped?
5. Where should mutable user profile data live after `CLAUDE.md` is retired?
6. What is the canonical MCP config artifact: root `.mcp.json`, `.codex/config.toml`, or both with one generated from the other?
7. Is audio notification behavior desirable in Codex, or should it be dropped with the unsupported Claude `Notification` hook?

## ExecPlan

This plan assumes "Codex first, safe migration, preserve core Dex behavior, and delete legacy only after parity."

### Phase 0: Migration Guardrails and Inventory Lock [Completed]

Goals:

- freeze the migration boundary,
- make the repo measurable,
- avoid partial invisible drift.

Tasks:

- create this ExecPlan in `docs/`
- restore or define the repo's ExecPlan convention since `docs/PLANS.md` is missing
- capture the current inventory counts and key path lists in the migration PR description or follow-on tracking issue
- decide scope for optional/vendor surfaces:
  - `_available` skills
  - `anthropic-*` skills
  - `.claude/plugins/compound-engineering`
- decide whether plugin distribution is in-scope for the first Codex cut

Acceptance:

- migration scope is explicit
- no one treats the partial `.agents` folder as already-done migration work

### Phase 1: Establish the Codex-Native Substrate [Completed]

Goals:

- make the repo natively understandable by Codex,
- before porting workflows.

Tasks:

- add a real checked-in `AGENTS.md`
- move durable project instructions from `CLAUDE.md` into `AGENTS.md`
- keep `project_doc_fallback_filenames = ["CLAUDE.md"]` temporarily in `.codex/config.toml`
- add `.codex/config.toml`
- enable `features.codex_hooks = true`
- decide whether hooks live inline in `config.toml` or in `.codex/hooks.json`
- create `.codex/hooks/`
- choose canonical MCP config location and write it down
- add a migration note in `CLAUDE.md` pointing maintainers to `AGENTS.md` once the bridge exists

Acceptance:

- fresh Codex session loads checked-in project instructions without relying on external session wiring
- repo has an explicit Codex config surface

### Phase 2: Split Static Instructions from Mutable User State [Completed]

Goals:

- stop onboarding from rewriting the core instruction file.

Tasks:

- create a dedicated mutable user profile file
- update `core/paths.py` to support the new path model
- update `core/mcp/onboarding_server.py` so onboarding writes the profile file instead of `CLAUDE.md`
- update any skills that instruct edits to `CLAUDE.md`
- decide how user extensions or personal preferences are preserved during migration from existing user installs

Acceptance:

- no runtime path mutates `AGENTS.md`
- onboarding produces the same practical personalization outcome without editing the core prompt file

### Phase 3: Design the Codex Hook Model [Completed]

Goals:

- turn the current Claude hook behavior into an explicit Codex hook specification,
- before porting scripts and wiring them into live Codex config.

Tasks:

- map `.claude/settings.json` behavior to a Codex-native hook model
- define the Codex target event, matcher strategy, and payload contract for each existing hook
- document replacement strategies for unsupported Claude-only events:
  - `Notification`
  - `SessionEnd`
- decide whether each hook is:
  - ported directly,
  - redesigned,
  - replaced by non-hook workflow logic,
  - or deleted
- redesign `ensure-mcp-user-scope.cjs`
  - current logic is specific to `claude mcp add`
  - Codex may require config-file enforcement instead of CLI-command interception
- redesign `session-end.sh`
  - likely convert to `Stop`-based behavior or explicit review workflow
- decide whether `meeting-summary-generator.cjs` is implemented or removed
- decide whether `dex-safety-guard.sh` should be activated in Codex
- define the canonical location for Codex hook config:
  - `.codex/config.toml`
  - `.codex/hooks.json`
  - or plugin-root `hooks/hooks.json`
- create fixture examples for expected Codex hook payloads so implementation and tests are grounded in one spec

Deliverables:

- a per-hook migration spec
- a final hook disposition table
- a Codex hook config design
- test fixtures for the Codex hook payload shape

Acceptance:

- every hook in the inventory table has an explicit design decision
- unsupported Claude-only events have a documented Codex replacement or removal path
- implementation can proceed without unresolved hook-semantics ambiguity

### Phase 4: Implement and Validate the Hook System [Completed]

Goals:

- preserve deterministic automation where it matters,
- and ship the redesigned hook system on top of Codex-native config.

Tasks:

- implement the Codex hook configuration from Phase 3
- port `session-start.sh`
  - remove `CLAUDE_PROJECT_DIR` assumptions
  - make path resolution Codex-safe
  - verify demo mode and launch-agent behavior still make sense
- port `person-context-injector.cjs`
- port `company-context-injector.cjs`
- port `daily-plan-quick-ref.cjs`
- port `career-evidence-capture.cjs`
- port `post-meeting-person-update.cjs`
- implement the chosen outcome for `meeting-summary-generator.cjs`
- implement the chosen outcome for `dex-safety-guard.sh`
- implement the Codex-native replacement for `ensure-mcp-user-scope.cjs`
- implement the Codex-native replacement for `session-end.sh`
- remove any remaining live references to `.claude/hooks/*` and `.Codex/hooks/*` from active skills/config
- move hook docs from Claude-centric to Codex-centric terminology
- move hook tests to Codex-facing locations and CI wiring
- run the hook validation matrix against the live Codex configuration

Acceptance:

- every hook in the inventory table has a shipped disposition
- no hook config points at `.claude/hooks/*` or `.Codex/hooks/*`
- unsupported Claude-only events are not silently assumed to work

### Phase 5: Port Core Dex Skills [Completed]

Goals:

- move the product's primary workflows to `.agents/skills`
- preserve only the workflows that actually define Dex

Must-port priority group:

- `setup`
- `getting-started`
- `daily-plan`
- `daily-review`
- `week-plan`
- `week-review`
- `quarter-plan`
- `quarter-review`
- `meeting-prep`
- `process-meetings`
- `journal`
- `review`
- `triage`
- `identity-snapshot`
- `industry-truths`
- `commitment-scan`
- `project-health`
- `product-brief`
- `health-check`
- `reset`
- `save-insight`
- `dex-update`
- `dex-rollback`
- `dex-backlog`
- `dex-improve`
- `dex-whats-new`

Second-priority group:

- integration/setup helpers such as `calendar-setup`, `career-setup`, `google-workspace-setup`, `screenpipe-setup`, `things-setup`, `todoist-setup`, `trello-setup`, `zoom-setup`, `ms-teams-setup`, `atlassian-setup`
- Dex admin helpers such as `create-mcp`, `integrate-mcp`, `enable-semantic-search`, `create-skill`, `scrape`, `xray`, `resume-builder`

Optional/triage group:

- `.claude/skills/_available/*`
- `.claude/skills/anthropic-*`

Porting rules:

- remove `AskUserQuestion` and `AskQuestion`
- remove Claude/Cursor host detection language
- replace slash-command-centric phrasing with Codex skill invocation guidance
- remove or relocate skill-local hook frontmatter
- update all `CLAUDE.md` references
- update all `.claude/hooks` and `.Codex/hooks` references

Acceptance:

- Codex can discover and execute the core Dex workflows from `.agents/skills`
- no core workflow depends on Claude-only tool names or frontmatter

### Phase 6: Rewrite Onboarding and Install Flow for Codex [Completed]

Goals:

- make first-run Codex experience coherent and self-contained.

Tasks:

- rewrite `install.sh` so the success path ends with Codex instructions, not Cursor chat
- rewrite `.claude/flows/onboarding.md` into a Codex-native onboarding skill or docs flow
- remove Cursor version gating logic
- remove Claude Desktop restart/config instructions
- fix or delete references to the missing `integration-concierge.cjs`
- ensure onboarding writes profile and config artifacts in the new canonical locations
- update any runtime prompts that still ask "what AI client are you using?" unless multi-client support remains intentional

Acceptance:

- new user can install Dex and complete onboarding entirely through Codex-first instructions
- onboarding does not point users to Cursor or Claude as the required execution path

### Phase 7: Unify MCP Configuration and Integration Setup [Completed]

Goals:

- remove config ambiguity,
- make integrations actually support Codex.

Tasks:

- choose one canonical MCP config path
- update `install.sh`, `core/utils/preflight.py`, `core/mcp/onboarding_server.py`, and `core/paths.py` to agree on it
- replace `claude_desktop_config.json` writers in:
  - `core/integrations/google/setup.py`
  - `core/integrations/notion/setup.py`
  - `core/integrations/slack/setup.py`
  - `core/integrations/detect.py`
- decide whether `.claude/mcp/*.json` becomes:
  - Codex config templates,
  - migration docs,
  - or dead weight to delete
- remove `install.sh` dependency on the missing `core/scripts/sync-mcp-configs.sh`, or replace it with a real Codex sync/generation step

Acceptance:

- all setup code writes to the same MCP target
- no integration flow requires Claude Desktop config

### Phase 8: Rebuild Packaging and Distribution for Codex [Completed]

Goals:

- if distribution matters, make it real for Codex instead of carrying Claude plugin scaffolding.

Tasks:

- create `.codex-plugin/plugin.json`
- decide plugin root strategy:
  - repo root as plugin root
  - or a dedicated distributable subdirectory
- move packaged skills, hooks, and MCP assets to the Codex plugin structure
- replace `claude plugin validate` assumptions
- rewrite:
  - `.claude-plugin/README.md`
  - `.claude-plugin/PLUGIN_README.md`
  - `.claude-plugin/INSTALLATION_QUICK_START.md`
  - `.claude-plugin/DISTRIBUTION_GUIDE.md`
  - `.claude-plugin/EXECUTIVE_SUMMARY.md`
  - `.claude-plugin/READY_TO_PUBLISH.md`
  - `.claude-plugin/validate-plugin.sh`

Acceptance:

- plugin/distribution documentation matches Codex plugin structure
- no shipping docs tell users to run `claude plugin ...`

### Phase 9: Rewrite Product Documentation [Completed]

Goals:

- make the public story match the actual product.

Tasks:

- rewrite `README.md` to make Codex the primary client
- update `DISTRIBUTION_READY.md`
- update `env.example`
- update `CONTRIBUTING.md`
- update demo docs
- rewrite `.claude/hooks/README.md` as Codex hook docs or archive it if no longer needed
- remove stale claims such as:
  - "most users use Cursor"
  - "guaranteed hooks require Claude Code"
  - "run `/setup` in Cursor chat"

Acceptance:

- first-party docs describe the product the repo actually ships

### Phase 10: CI, Tests, and Migration Invariants [Completed]

Goals:

- stop regressions from reintroducing Claude/Cursor coupling after cutover.

Tasks:

- rename or replace `npm run test:hooks` so it validates Codex hook code paths
- keep the context injector tests and expand them if payload parsing changes
- add grep-based or script-based CI checks that fail on stale references in Codex-facing surfaces:
  - `.Codex/`
  - `AskUserQuestion`
  - `AskQuestion`
  - `claude_desktop_config.json`
  - `claude plugin`
  - `CLAUDE_PROJECT_DIR`
  - `Read`/`Bash` matcher assumptions where no longer valid
- add tests for onboarding profile write path changes
- add tests for canonical MCP config path resolution
- run touched Python and Node test suites plus lint/type checks

Acceptance:

- CI can prove the Codex migration stayed intact

### Phase 11: Decommission Legacy Claude/Cursor Surfaces [Completed]

Goals:

- remove dead weight only after parity and documentation are done.

Tasks:

- remove `project_doc_fallback_filenames = ["CLAUDE.md"]` once `AGENTS.md` is authoritative
- archive or delete `.claude/settings.json`
- archive or delete `.claude/hooks/*` once replaced
- archive or delete `.claude/flows/onboarding.md`
- archive or delete Claude-only docs in `.claude-plugin/*`
- decide final disposition of `.cursor/rules/search-routing.mdc`
- decide final disposition of `.claude/plugins/compound-engineering`
- remove dead `CLAUDE.md` references from runtime code and docs

Acceptance:

- the repo no longer presents Claude/Cursor infrastructure as active product surface unless intentionally retained for backwards compatibility

## Validation Matrix

These are the concrete verification flows the migration should pass before legacy deletion.

### Fresh Clone

- install dependencies
- start Codex in repo root
- confirm repo-local instructions are discovered
- confirm Codex-native config is loaded

### Onboarding

- run the Codex onboarding flow
- confirm user profile writes land in the new profile file
- confirm MCP config writes land in the canonical location
- confirm no `CLAUDE.md` mutation occurs

### Hooks

- confirm `SessionStart` context injection fires
- confirm read-context hooks inject relevant person/company context
- confirm post-write meeting and career hooks work if their skills are invoked
- confirm unsupported Claude-only events are not relied upon

### Core Workflows

- `getting-started`
- `daily-plan`
- `daily-review`
- `meeting-prep`
- `process-meetings`
- `week-plan`
- `dex-update`
- `health-check`

### Integrations

- Slack setup
- Google setup
- Notion setup
- any calendar or meeting processing dependency that expects MCP availability

### Packaging

- if Codex plugin distribution is in scope, validate the plugin layout and install path from a clean environment

### Regression Gates

- no broken `.Codex/` references
- no missing hook script paths
- no stale Claude Desktop config writes
- no install step that ends in Cursor or Claude-only instructions

## Risks

### 1. Hidden semantic differences in hook payloads

Risk:

- the current hook scripts assume Claude event payload shapes and environment variables.

Mitigation:

- port one hook at a time and add fixture-based tests for the Codex payload shape.

### 2. Instruction churn breaks onboarding personalization

Risk:

- moving from `CLAUDE.md` to `AGENTS.md` while also changing the profile write path can lose user-specific data.

Mitigation:

- add a one-time migration routine from old `CLAUDE.md` user profile content to the new profile file.

### 3. Full parity port of all 96 skills is wasteful

Risk:

- migrating every skill equally will bloat scope and carry Claude vendor baggage into the Codex product.

Mitigation:

- explicitly tier skills into core, secondary, optional, and archive groups before porting.

### 4. Plugin migration may expand scope dramatically

Risk:

- Codex repo usage and Codex plugin distribution are related but different deliverables.

Mitigation:

- make plugin packaging a separate phase gate if needed.

### 5. Existing repo inconsistencies can be mistaken for migration regressions

Risk:

- missing `integration-concierge.cjs`, missing `sync-mcp-configs.sh`, and MCP path disagreement are already broken.

Mitigation:

- treat these as baseline cleanup items in the migration rather than debugging them ad hoc later.

## Recommended Work Order

If this migration is executed in multiple PRs, this is the order I would use:

1. PR 1: add `AGENTS.md`, `.codex/config.toml`, canonical MCP decision, and migration scaffolding
2. PR 2: split mutable user profile from `CLAUDE.md` and update onboarding runtime paths
3. PR 3: finalize the Codex hook redesign spec and payload fixtures
4. PR 4: implement global hooks and hook tests
5. PR 5: port core skills into `.agents/skills`
6. PR 6: rewrite install/onboarding docs and integration setup
7. PR 7: rebuild packaging/distribution for Codex
8. PR 8: delete legacy Claude/Cursor surfaces

## Decommission Checklist

Before calling the migration complete, all of the following should be true:

- [x] `AGENTS.md` exists and is the canonical instruction file.
- [x] `.codex/config.toml` exists.
- [x] Codex hooks are configured and tested.
- [x] core Dex skills live in `.agents/skills`.
- [x] onboarding no longer edits `CLAUDE.md`.
- [x] one MCP config location is canonical and enforced.
- [x] no production setup flow writes `claude_desktop_config.json`.
- [x] no active skill points at `.claude/hooks/*` or `.Codex/hooks/*`.
- [x] no active docs tell users to run `/setup` in Cursor chat.
- [x] no shipping docs tell users to validate with `claude plugin`.
- [x] top-level `CLAUDE.md` is deleted after `AGENTS.md` becomes authoritative.
- [x] legacy `.claude/skills/` and `.claude/hooks/` trees are deleted after Codex-native replacement validation.
- [x] active runtime no longer exports `CLAUDE_MD` or uses legacy `Claude_Code_*` fallback paths.

## Closure

This migration is complete.

Remaining legacy surfaces are intentionally classified, not unfinished:

- the remaining top-level pre-Codex trees were deleted on 2026-05-04 after their live assets were migrated or retired.
- the top-level `CLAUDE.md` file was deleted on 2026-05-04 after `AGENTS.md` became authoritative.
- `.claude/skills/` and `.claude/hooks/` were deleted on 2026-05-04 after the Codex-native `.agents/skills/` and `.codex/hooks/` surfaces were validated.
- the residual `.claude/` and `.claude-plugin/` directories were deleted on 2026-05-04 after beta docs, reference docs, and migration-runtime assets were ported to Codex-native locations.
- active runtime no longer consults `CLAUDE.md` or `Claude_Code_*` fallback resources.
- `_available` and `anthropic-*` skill surfaces remain outside the active Codex-facing product boundary.
- historical user/content artifacts may still mention Claude or Cursor in captured notes, beta communications, or demo snapshots, but they are not active runtime, install, hook, onboarding, or packaging surfaces.

There is no next migration phase left to execute for the Codex cutover described by this plan.
