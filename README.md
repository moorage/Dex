# Dex by Dave

Dex is a Codex-first personal operating system for strategic work management, meeting intelligence, relationship context, task follow-through, and role-aware planning.

The active surfaces in this repo are:

- `AGENTS.md` for project instructions
- `.codex/` for Codex runtime config and hooks
- `.agents/skills/` for repo skills
- `.mcp.json.example` plus generated `.mcp.json` for Dex MCP servers

## Quickstart

### 1. Install prerequisites

- `git`
- `node` 18+
- `python` 3.11+
- `codex`

Install Codex CLI with one of:

```bash
npm install -g @openai/codex
```

```bash
brew install codex
```

### 2. Clone and install Dex

```bash
git clone https://github.com/davekilleen/dex.git
cd dex
./install.sh
```

`install.sh` does four things:

- installs JavaScript dependencies
- creates `.venv/` and installs Dex MCP Python requirements
- renders a local `.mcp.json`
- generates `core/paths.json` for shared path consumers

### 3. Start Codex in the repo

```bash
codex
```

Then tell Codex:

```text
Use $onboarding to set up Dex for this workspace.
```

When onboarding finishes, continue with:

```text
Use $getting-started to walk me through Dex.
```

## Core Workflows

- `$onboarding` sets up the vault structure, profile, pillars, and local MCP config.
- `$getting-started` gives the first-run tour after onboarding.
- `$process-meetings` processes synced Granola notes and updates people, companies, and tasks.
- `$industry-truths` captures durable assumptions that should shape planning and execution.

You can also ask Codex for Dex workflows in plain language. The skills above are the main repo-local entry points.

## MCP Runtime

Dex ships with project-scoped Codex MCP server definitions in `.codex/config.toml`.

The checked-in MCP template is:

- `.mcp.json.example`

The generated local runtime file is:

- `.mcp.json`

Core Dex MCP servers are launched through `core/scripts/run-dex-mcp.cjs`, which resolves the repo root and the correct Python runtime automatically.

## Important Files

- `System/user-profile.yaml`: mutable user identity and communication settings
- `System/pillars.yaml`: strategic pillars
- `System/.onboarding-complete`: onboarding completion marker
- `03-Tasks/Tasks.md`: central task list
- `05-Areas/People/`: relationship memory
- `05-Areas/Companies/`: company context
- `00-Inbox/Meetings/`: meeting capture and synced notes

## Optional Integrations

Dex includes setup helpers for repo-local MCP integrations such as Google, Slack, and Notion.

These integrations now write to Dex's local `.mcp.json`, not a host-specific desktop config.

## Distribution

Codex plugin packaging now lives in:

- `.codex-plugin/plugin.json`

That plugin bundle is intentionally skills-only.

For the full Dex runtime, including hooks, onboarding automation, and MCP servers, clone the repo and run `./install.sh`.

## Contributing

See `CONTRIBUTING.md`.

If you want Codex to help with a contribution, ask directly in this repo, for example:

```text
Review my changes and help me prepare a clean pull request.
```
