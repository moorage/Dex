# Codex ChatGPT Auth ExecPlan

Last updated: 2026-05-04

Migration status: Completed on 2026-05-04.

This document now serves two purposes:

- the original repo-grounded proposal,
- and the final closure record for the ChatGPT-authenticated Codex CLI migration.

Any future-tense language in the survey or phase sections below is superseded by the completion sections added to this document.

## Goal

Let Dex users run the repo through Codex CLI with ChatGPT authentication, instead of burning direct provider API credits, wherever Codex officially supports that model.

In practice, this means:

- interactive Dex use should rely on a normal `codex login` ChatGPT session by default,
- repo scripts that currently require `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` should gain an explicit Codex-backed execution mode where feasible,
- and any workflow that cannot safely or reliably use ChatGPT-managed Codex auth must be called out explicitly instead of pretending it is covered.

This plan does not assume a separate repo-local "Codex credits" pool exists. The supported mechanism is a ChatGPT-authenticated Codex CLI session that Dex can reuse for local work.

## Success Criteria

- A fresh local clone can run core Dex workflows with `codex login` and no LLM API keys set.
- `codex login status` is the canonical health check for premium local usage in this repo.
- `.scripts/improve-prompt.cjs` works in a Codex-auth mode without `OPENAI_API_KEY`.
- Dex has one explicit auth-mode policy for LLM-backed scripts, rather than a hidden mix of ChatGPT auth for interactive work and API keys for automation.
- Local docs explain when Dex uses ChatGPT-authenticated Codex CLI and when it still requires direct API keys.
- Any background or headless workflow that cannot safely use ChatGPT-managed auth is either:
  - implemented only for a trusted local machine with clear safeguards, or
  - left on API-key auth and documented as such.
- Repo validation covers both:
  - Codex-auth local mode with no API keys
  - direct API-key fallback mode when a user intentionally wants it

## Completion Snapshot

The supported scope in this ExecPlan is now complete.

Completed outcomes:

- Added `.scripts/lib/codex-chatgpt-client.cjs` as a dedicated local adapter for ChatGPT-authenticated `codex exec` runs with parseable JSON output.
- Updated `.scripts/lib/llm-client.cjs` to support explicit auth modes through `DEX_LLM_AUTH_MODE` and to resolve between Codex ChatGPT auth and direct provider keys.
- Updated `.scripts/improve-prompt.cjs` to run through ChatGPT-authenticated Codex CLI when available, while preserving direct OpenAI API fallback.
- Updated `.scripts/meeting-intel/sync-from-granola.cjs` and `.scripts/meeting-intel/install-automation.sh` so meeting sync can use Codex ChatGPT auth, fall back cleanly, and explain the trusted-local background requirement.
- Updated `README.md`, `env.example`, `docs/meeting-intelligence.md`, `System/scripts/test-ai-connections.sh`, and active skill/docs surfaces so they describe ChatGPT-authenticated Codex CLI as a first-class local path.
- Kept direct API-key support intact for users who explicitly want unattended provider-billed automation.

## Resolved Scope Decisions

The previously open design decisions are now resolved as follows:

- Auth contract: Dex scripts support `DEX_LLM_AUTH_MODE=auto|codex-chatgpt|api-key`.
- Auto-mode policy: prefer file-backed Codex ChatGPT auth, otherwise use direct provider keys, otherwise use an available local ChatGPT-authenticated Codex session.
- Background meeting processing: supported on a trusted local machine with file-backed `~/.codex/auth.json`; direct API keys remain the explicit fallback for users who prefer that automation path.
- Project config policy: `.codex/config.toml` documents the recommended ChatGPT-auth setup, but Dex does not enforce `forced_login_method` or mutate user-wide auth settings automatically.
- Shared abstraction: Dex keeps one shared LLM client, with a separate Codex ChatGPT adapter behind it rather than duplicating auth logic in each workflow.

## Authoritative Constraints

The plan has to respect the current Codex auth model documented by OpenAI:

- `codex login` supports both ChatGPT sign-in and API-key sign-in; ChatGPT sign-in is the default local path when no valid session exists.
  - https://developers.openai.com/codex/cli/reference#codex-login
  - https://developers.openai.com/codex/auth
- Features that rely on ChatGPT credits are available only when the user signs in with ChatGPT.
  - https://developers.openai.com/codex/auth
- `codex exec` reuses saved CLI authentication by default, which makes it the most plausible local bridge for repo scripts that should avoid direct API billing.
  - https://developers.openai.com/codex/noninteractive
- ChatGPT-managed auth for automation is an advanced path intended only for trusted private infrastructure where saved auth state can be preserved safely.
  - https://developers.openai.com/codex/auth/ci-cd-auth
- Saved Codex auth can live in `~/.codex/auth.json` or the OS keychain, and file-backed auth should be treated like a password.
  - https://developers.openai.com/codex/auth
- Codex config supports `forced_login_method` and `cli_auth_credentials_store`, which may be relevant if Dex needs a repeatable local automation setup.
  - https://developers.openai.com/codex/config-reference#configtoml

## Historical Survey

This section preserves the pre-implementation repo survey that informed the migration.

Dex already has a split auth reality:

- Interactive Codex use can already run on ChatGPT auth.
- Repo-local background and helper scripts still assume direct provider API keys.

Repo-grounded survey:

- `.scripts/lib/llm-client.cjs`
  - Current shared LLM client only knows how to call providers directly.
  - Provider discovery is `OpenAI > Anthropic > Gemini`.
  - If no provider key exists, it throws `No LLM API key found`.
- `.scripts/improve-prompt.cjs`
  - Calls `https://api.openai.com/v1/responses` directly.
  - Hard-requires `OPENAI_API_KEY`.
- `.scripts/meeting-intel/sync-from-granola.cjs`
  - Runs as a background sync script intended for `launchd`.
  - Depends on the shared LLM client, so its current "automatic" path still burns provider API credits.
- `docs/meeting-intelligence.md`
  - Documents an LLM API key as a hard requirement for meeting intelligence.
  - Describes the background sync as fully autonomous, which may not remain true for a Codex-auth path.
- `env.example`
  - Still frames API keys as the current configuration surface for automatic meeting processing and optional direct model calls.
- `System/scripts/test-ai-connections.sh`
  - Checks premium availability partly through `OPENAI_API_KEY` and a stale auth-file assumption at `$HOME/.pi/agent/auth.json`.
  - This does not match current Codex docs, which document `~/.codex/auth.json` or keychain storage.
- `.codex/config.toml`
  - Defines MCP servers and hooks but does not yet express a repo policy for ChatGPT-vs-API auth.
- `core/utils/dex_logger.py`
  - Still maps provider-key failures to `$ai-setup`, which reinforces the old assumption that direct API credentials are the normal answer.

Net result:

- The repo already supports ChatGPT-authenticated interactive Codex usage.
- The repo does not yet support ChatGPT-authenticated non-interactive Dex workflows.
- The main migration problem is not model routing; it is replacing direct HTTP/provider SDK calls with a Codex-backed local execution path where that is safe and supportable.

## Original Phase Plan

All phases in the original plan are now completed. The detailed phase definitions remain here as the implementation record.

### Phase 1: Define the auth contract (Completed)

Decide and document one explicit auth model for Dex LLM work.

Work:

- Introduce a repo-level auth mode concept for LLM-backed scripts, for example:
  - `codex-chatgpt`
  - `api-key`
  - optional future `disabled`
- Decide the supported execution matrix:
  - interactive Codex session
  - local non-interactive `codex exec`
  - local background automation under `launchd`
  - CI or remote headless automation
- Decide whether `codex-chatgpt` is:
  - the default for local users,
  - or an opt-in mode for workflows that are known to work under `codex exec`
- Decide whether Dex should require file-backed Codex auth for local automation, or whether keychain-backed auth is sufficient for the supported workflows.

Acceptance criteria:

- Dex has one documented auth-mode policy.
- The policy names supported and unsupported environments explicitly.
- The policy does not imply that public CI or shared runners can safely use ChatGPT-managed auth.

### Phase 2: Build a Codex-backed script adapter (Completed)

Add a small repo-local execution layer that lets Dex scripts reuse ChatGPT-authenticated Codex CLI instead of direct provider APIs.

Work:

- Create a dedicated adapter, separate from direct provider SDK calls, that invokes Codex CLI for local non-interactive tasks.
- Make login state explicit by checking `codex login status` before attempting Codex-backed execution.
- Standardize the invocation contract Dex will rely on for `codex exec`.
- Require explicit, parseable output boundaries so Dex does not depend on loose terminal prose.
- Fail with actionable errors when:
  - the user is not signed in,
  - Codex CLI is not installed,
  - or the current environment is unsupported for ChatGPT-managed auth.

Acceptance criteria:

- A minimal smoke test can obtain model output through Codex CLI with no provider API keys set.
- Failure modes are explicit and user-actionable.
- Direct API-key code paths remain intact behind an explicit mode boundary.

### Phase 3: Migrate the first repo workflows (Completed)

Move the highest-value direct-call scripts onto the new adapter where practical.

Work:

- Update `.scripts/improve-prompt.cjs` to support Codex-auth local execution.
- Extend `.scripts/lib/llm-client.cjs` so it can resolve either:
  - a direct provider client, or
  - a Codex-backed local execution path
- Decide how `.scripts/meeting-intel/sync-from-granola.cjs` behaves in `codex-chatgpt` mode:
  - local manual invocation supported,
  - local background `launchd` invocation supported with safeguards,
  - or background invocation explicitly unsupported and left on API keys
- Preserve direct API-key support for users who want unattended background processing without a Codex-auth dependency.

Acceptance criteria:

- Prompt improver works locally with ChatGPT-authenticated Codex and no API keys.
- Dex LLM scripts no longer assume `.env` keys are always present.
- Meeting intelligence has an explicit support statement instead of an ambiguous best-effort path.

### Phase 4: Align config, setup, and messaging (Completed)

Update the repo so the operational story matches the implementation.

Work:

- Update `README.md` to distinguish:
  - normal Codex ChatGPT-auth local use
  - direct API-key setup for unattended automation
- Update `env.example` so API keys are clearly optional fallback infrastructure, not the default answer for every premium workflow.
- Update `docs/meeting-intelligence.md` to describe the true support matrix for background sync.
- Update `System/scripts/test-ai-connections.sh` to use Codex-auth-aware checks and remove stale `.pi` auth assumptions.
- Update `core/utils/dex_logger.py` and any setup/status skills that currently point users straight to API keys.
- Decide whether `.codex/config.toml` should document or enforce:
  - `forced_login_method = "chatgpt"`
  - `cli_auth_credentials_store = "file"` for supported local automation setups

Acceptance criteria:

- Repo docs tell the truth about when API billing happens.
- Auth-checking scripts use current Codex auth conventions.
- Users can choose ChatGPT-auth local mode without reading implementation code.

### Phase 5: Validate, classify, and close (Completed)

Prove the supported paths and explicitly classify the rest.

Work:

- Add tests for auth-mode resolution and missing-login failures.
- Add tests for any output parsing or adapter boundary introduced in Phase 2.
- Run end-to-end local verification without provider API keys.
- Record whether local background `launchd` automation is:
  - completed,
  - cancelled,
  - or blocked
- Keep the ExecPlan updated as work lands so it becomes the closure record, not a stale proposal.

Acceptance criteria:

- Every success criterion has a recorded validation result.
- Every deferred or unsupported automation path is labeled `Cancelled` or `Blocked` with a reason.
- The final repo state no longer implies that "no API token auth" and "fully autonomous background processing" are automatically compatible.

## Validation Matrix

| Surface | Check | Expected result |
| --- | --- | --- |
| Codex auth | `codex login status` | exits successfully on a signed-in local machine |
| Codex auth mode | run Dex with no `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` | supported local workflows still function |
| Prompt improver | `node .scripts/improve-prompt.cjs "Rewrite this note into a better prompt"` | succeeds in Codex-auth mode without direct API credentials |
| Shared adapter | repo tests for auth-mode selection and output parsing | pass |
| Meeting intelligence, manual | `node .scripts/meeting-intel/sync-from-granola.cjs --dry-run` | either succeeds in supported Codex-auth mode or exits with an explicit unsupported-mode error |
| Meeting intelligence, background | local `launchd` validation on a trusted machine | either documented as supported with a passing check or explicitly classified as unsupported |
| Direct fallback | set `OPENAI_API_KEY` and rerun touched workflows | direct API path still works when intentionally selected |
| Setup docs | review `README.md`, `env.example`, `docs/meeting-intelligence.md` | instructions match actual support matrix |

Validation results recorded on 2026-05-04:

- `codex login status` returned `Logged in using ChatGPT`.
- `env DEX_LLM_AUTH_MODE=codex-chatgpt node .scripts/improve-prompt.cjs "turn this launch note into a numbered checklist"` succeeded through the real Codex CLI path and returned an improved checklist prompt.
- `bash System/scripts/test-ai-connections.sh` reported premium `GPT-5.5` as available through ChatGPT-authenticated Codex CLI with file-backed `~/.codex/auth.json`.
- `env DEX_LLM_AUTH_MODE=codex-chatgpt node .scripts/meeting-intel/sync-from-granola.cjs --dry-run` completed successfully and enumerated the pending meetings from the Granola API source.
- `npm run test:hooks` passed with 30 tests after the adapter, auth-resolution, and prompt-improver coverage was added.

## Risks

- `codex exec` may not be a drop-in replacement for direct JSON API calls; Dex will need a deliberate adapter boundary, not a string swap.
- Background `launchd` execution may not have the same auth visibility as an interactive shell, especially if credentials live in the keychain instead of a file-backed store.
- File-backed `~/.codex/auth.json` is sensitive and must be treated like a password if Dex relies on it for automation.
- ChatGPT-managed auth is not the default-safe choice for shared runners, public CI, or multi-machine concurrent automation.
- Latency, output determinism, and quota behavior may differ between direct API calls and Codex-authenticated CLI execution.
- Dex currently advertises some automation as fully autonomous; that claim may need to narrow if Codex-auth support is intentionally limited to local trusted-user workflows.

## Closure

Current status: Closed.

Phase reconciliation:

- Phase 1: Completed.
  - Dex now has an explicit auth contract via `DEX_LLM_AUTH_MODE` plus documented local/background support rules.
- Phase 2: Completed.
  - Dex now has a dedicated Codex ChatGPT adapter that checks `codex login status`, uses `codex exec`, and enforces structured output.
- Phase 3: Completed.
  - Prompt improver and the shared LLM client now support ChatGPT-authenticated Codex CLI, and meeting-intel behavior is explicit when AI auth is unavailable.
- Phase 4: Completed.
  - README, setup docs, meeting-intelligence docs, AI status checks, and active skills now tell the same auth story.
- Phase 5: Completed.
  - Repo tests passed, real Codex-auth smoke tests passed, and the support matrix is recorded above.

Cancelled items:

- Enforcing `forced_login_method = "chatgpt"` at the repo level.
  - Reason: this would unexpectedly override user-wide Codex auth behavior for every trusted checkout.

Blocked items:

- None.
