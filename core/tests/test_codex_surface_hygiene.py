from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
CODEX_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
EXPECTED_FIRST_PARTY_CODEX_SKILLS = (
    "ai-setup",
    "ai-status",
    "atlassian-setup",
    "beta-activate",
    "beta-status",
    "calendar-setup",
    "career-coach",
    "career-setup",
    "commitment-scan",
    "create-mcp",
    "create-skill",
    "daily-plan",
    "daily-review",
    "dex-add-mcp",
    "dex-backlog",
    "dex-demo",
    "dex-improve",
    "dex-level-up",
    "dex-obsidian-setup",
    "dex-rollback",
    "dex-update",
    "dex-whats-new",
    "enable-semantic-search",
    "getting-started",
    "google-workspace-setup",
    "health-check",
    "identity-snapshot",
    "industry-truths",
    "integrate-mcp",
    "journal",
    "meeting-prep",
    "ms-teams-setup",
    "onboarding",
    "process-meetings",
    "product-brief",
    "project-health",
    "prompt-improver",
    "quarter-plan",
    "quarter-review",
    "reset",
    "resume-builder",
    "review",
    "save-insight",
    "scrape",
    "screenpipe-setup",
    "setup",
    "things-setup",
    "todoist-setup",
    "trello-setup",
    "triage",
    "week-plan",
    "week-review",
    "xray",
    "zoom-setup",
)


def _iter_first_party_codex_skill_names() -> list[str]:
    return sorted(
        skill_dir.name
        for skill_dir in CODEX_SKILLS_DIR.iterdir()
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").is_file()
    )


def _active_surface_paths() -> list[Path]:
    paths = [
        REPO_ROOT / "AGENTS.md",
        REPO_ROOT / "README.md",
        REPO_ROOT / "install.sh",
        REPO_ROOT / ".codex" / "config.toml",
        REPO_ROOT / ".codex" / "hooks.json",
        REPO_ROOT / ".codex-plugin" / "plugin.json",
        REPO_ROOT / ".mcp.plugin.json",
        REPO_ROOT / "System" / "Dex_Backlog.md",
        REPO_ROOT / "System" / "pillars.yaml",
        REPO_ROOT / "System" / "pillars.example.yaml",
        REPO_ROOT / "System" / "scripts" / "test-ai-connections.sh",
        REPO_ROOT / "core" / "mcp" / "CAREER_MCP_README.md",
    ]
    paths.extend((REPO_ROOT / ".agents" / "skills").rglob("SKILL.md"))
    paths.extend((REPO_ROOT / ".codex" / "hooks").glob("*"))
    paths.extend((REPO_ROOT / "core" / "integrations").rglob("*.py"))
    paths.extend((REPO_ROOT / "core" / "mcp").glob("*.py"))
    paths.extend((REPO_ROOT / "core" / "scripts").rglob("*.cjs"))
    paths.extend((REPO_ROOT / "core" / "utils").glob("preflight.py"))
    return [path for path in paths if path.is_file()]


def test_first_party_codex_skill_inventory_matches_expected():
    assert _iter_first_party_codex_skill_names() == list(EXPECTED_FIRST_PARTY_CODEX_SKILLS)


def test_legacy_claude_skill_and_hook_trees_are_deleted():
    assert not (REPO_ROOT / "CLAUDE.md").exists()
    assert not (REPO_ROOT / ".claude").exists()
    assert not (REPO_ROOT / ".claude-plugin").exists()


def test_active_codex_surfaces_do_not_point_at_removed_legacy_runtime_features():
    disallowed = (
        ".Codex/",
        "CLAUDE.md",
        ".claude/",
        ".claude-plugin/",
        "AskUserQuestion",
        "AskQuestion",
        "claude_desktop_config.json",
        "CLAUDE_PROJECT_DIR",
        "System/.mcp.json",
        "claude plugin ",
        "claude-code-state.json",
    )

    offenders: list[str] = []
    for path in _active_surface_paths():
        text = path.read_text(encoding="utf-8")
        for token in disallowed:
            if token in text:
                offenders.append(f"{path.relative_to(REPO_ROOT)} -> {token}")

    assert not offenders, "Found disallowed legacy runtime references:\n" + "\n".join(offenders)


def test_codex_plugin_manifest_bundles_mcp_servers():
    manifest_path = REPO_ROOT / ".codex-plugin" / "plugin.json"
    plugin_mcp_path = REPO_ROOT / ".mcp.plugin.json"

    manifest_text = manifest_path.read_text(encoding="utf-8")
    plugin_mcp_text = plugin_mcp_path.read_text(encoding="utf-8")

    assert '"mcpServers": "./.mcp.plugin.json"' in manifest_text
    for server_name in (
        "work-mcp",
        "calendar-mcp",
        "granola-mcp",
        "career-mcp",
        "dex-improvements-mcp",
        "resume-mcp",
        "update-checker",
        "onboarding-mcp",
        "dex-analytics",
        "session-memory",
        "beta-mcp",
        "commitment-mcp",
        "demo-mode-mcp",
    ):
        assert f'"{server_name}"' in plugin_mcp_text


def test_execplan_convention_doc_exists():
    assert (REPO_ROOT / "docs" / "PLANS.md").is_file()


def test_wrapper_migration_is_complete():
    wrapper_marker = "This is the authoritative Codex entrypoint for the legacy Dex workflow documented in `.claude/skills/"

    offenders = [
        path.relative_to(REPO_ROOT)
        for path in CODEX_SKILLS_DIR.glob("*/SKILL.md")
        if wrapper_marker in path.read_text(encoding="utf-8")
    ]

    assert not offenders, f"Wrapper-based skill migrations still remain: {offenders}"
