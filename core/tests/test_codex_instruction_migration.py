from pathlib import Path

from core import paths


def test_agents_md_exists_at_vault_root():
    assert paths.AGENTS_MD.parent == paths.VAULT_ROOT
    assert paths.AGENTS_MD.name == "AGENTS.md"


def test_agents_md_points_to_mutable_profile_files():
    repo_agents_md = Path(__file__).resolve().parents[2] / "AGENTS.md"
    assert repo_agents_md.is_file()
    content = repo_agents_md.read_text(encoding="utf-8")
    assert "System/user-profile.yaml" in content
    assert "System/pillars.yaml" in content
    assert "Do not write onboarding data into `AGENTS.md`." in content


def test_onboarding_server_no_longer_mutates_claude_md():
    onboarding_source = (Path(__file__).resolve().parent.parent / "mcp" / "onboarding_server.py").read_text(
        encoding="utf-8"
    )
    assert "update_claude_md" not in onboarding_source
    assert "Updating CLAUDE.md" not in onboarding_source
    assert "CLAUDE.md (User Profile section)" not in onboarding_source
