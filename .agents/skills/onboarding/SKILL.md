---
name: onboarding
description: Guided first-run Dex setup for Codex CLI using the onboarding MCP, including validation, dependency checks, and finalization
---

# Dex Onboarding

Use this skill when the repo has not been fully set up yet, or when the user explicitly asks to onboard Dex in Codex.

## Trigger

Run this skill when either is true:

- `04-Projects/` does not exist
- `System/.onboarding-complete` is missing
- the user asks to set up Dex, rerun onboarding, or configure their role

If onboarding is already complete, tell the user and offer `$getting-started` instead.

## Workflow

### 1. Start or resume the session

Call `start_onboarding_session()`.

If a session already exists:

- summarize completed steps
- continue from the next incomplete step unless the user explicitly wants to restart

### 2. Collect and validate each step with the MCP

Drive the conversation naturally. Do not use legacy client-specific prompt tooling.

Required steps:

1. Name
2. Role
3. Company and company size
4. Email domain
5. Strategic pillars
6. Communication preferences and Obsidian mode

For each step:

- ask the user only for the current step
- call `validate_and_save_step(step_number=..., step_data=...)`
- if validation fails, explain the specific field problem and retry that step

### 3. Treat email domain as mandatory

Step 4 is critical because Dex uses `email_domain` to classify internal vs external people.

- do not skip it
- do not finalize without it
- examples should be domain-only values like `acme.com`, not full email addresses

### 4. Check readiness before writing files

Before finalization:

- call `get_onboarding_status()`
- confirm all required steps are complete
- call `verify_dependencies()`
- if required Python dependencies are missing, tell the user exactly what to run and whether you can continue safely

### 5. Preview when the user wants a dry run

If the user asks what onboarding will change, call:

- `finalize_onboarding(dry_run=true)`

Summarize the folders, files, and config updates it would create.

### 6. Finalize

When the user is ready, call:

- `finalize_onboarding()`

After success:

- summarize the created folders and files
- point the user to `System/user-profile.yaml`, `System/pillars.yaml`, and `.mcp.json`
- offer `$getting-started` as the next step

## Guardrails

- Do not write onboarding data into `AGENTS.md`.
- Do not send the user into retired pre-Codex onboarding flows.
- Prefer the MCP's validation and file creation over manual editing.
- If a dry run or finalization reports errors, surface them directly instead of guessing.
