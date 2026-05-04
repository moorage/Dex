#!/usr/bin/env python3
"""Helpers for reading and writing Dex's repo-local MCP configuration."""

from __future__ import annotations

import json
import os
from pathlib import Path


def get_vault_root() -> Path:
    raw = os.environ.get("DEX_VAULT") or os.environ.get("VAULT_PATH")
    return Path(raw).expanduser().resolve() if raw else Path.cwd().resolve()


def get_mcp_config_path() -> Path:
    return get_vault_root() / ".mcp.json"


def load_mcp_config() -> dict:
    config_path = get_mcp_config_path()
    if config_path.exists():
        with open(config_path, encoding="utf-8") as handle:
            return json.load(handle)
    return {"mcpServers": {}}


def save_mcp_config(config: dict) -> None:
    config_path = get_mcp_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)
        handle.write("\n")
