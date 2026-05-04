from pathlib import Path

from core import paths


def test_root_mcp_paths_are_authoritative():
    assert paths.MCP_CONFIG_TARGET.parent == paths.VAULT_ROOT
    assert paths.MCP_CONFIG_TARGET.name == ".mcp.json"
    assert paths.MCP_CONFIG_EXAMPLE.parent == paths.VAULT_ROOT
    assert paths.MCP_CONFIG_EXAMPLE.name == ".mcp.json.example"


def test_codex_config_declares_core_mcp_servers():
    config_text = (Path(__file__).resolve().parents[2] / ".codex" / "config.toml").read_text(encoding="utf-8")
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
        assert f"[mcp_servers.{server_name}]" in config_text


def test_onboarding_server_no_longer_mentions_system_mcp_json():
    onboarding_source = (Path(__file__).resolve().parents[1] / "mcp" / "onboarding_server.py").read_text(encoding="utf-8")
    assert "System/.mcp.json" not in onboarding_source


def test_paths_module_no_longer_exports_claude_md():
    assert not hasattr(paths, "CLAUDE_MD")
    paths_json = (Path(__file__).resolve().parents[2] / "core" / "paths.json").read_text(encoding="utf-8")
    assert '"CLAUDE_MD"' not in paths_json


def test_root_discovery_no_longer_uses_claude_md_marker():
    dex_paths_source = (Path(__file__).resolve().parents[2] / ".codex" / "hooks" / "lib" / "dex-paths.cjs").read_text(
        encoding="utf-8"
    )
    assert "CLAUDE.md" not in dex_paths_source


def test_dex_improvements_server_no_longer_uses_legacy_agent_tooling_fallbacks():
    dex_improvements_source = (Path(__file__).resolve().parents[1] / "mcp" / "dex_improvements_server.py").read_text(
        encoding="utf-8"
    )
    assert "Claude_Code_Docs" not in dex_improvements_source
    assert "Claude_Code_Intel" not in dex_improvements_source
    assert "LEGACY_CHANGELOG_FILE" not in dex_improvements_source
    assert "LEGACY_CAPABILITIES_REPORTS_DIR" not in dex_improvements_source
